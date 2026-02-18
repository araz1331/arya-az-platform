import { db } from "./db";
import { sql } from "drizzle-orm";
import { GoogleGenAI } from "@google/genai";
import { storage } from "./storage";

const gemini = new GoogleGenAI({
  apiKey: process.env.AI_INTEGRATIONS_GEMINI_API_KEY || "",
  httpOptions: {
    apiVersion: "",
    baseUrl: process.env.AI_INTEGRATIONS_GEMINI_BASE_URL || "",
  },
});

async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs = 10000): Promise<globalThis.Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export async function sendWhatsAppMessage(toNumber: string, body: string): Promise<boolean> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!accountSid || !authToken) {
    console.error("[whatsapp] Missing TWILIO credentials");
    return false;
  }
  const fromNumber = "whatsapp:+12792030206";
  const to = `whatsapp:${toNumber.startsWith("+") ? toNumber : "+" + toNumber}`;

  try {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    const params = new URLSearchParams({ To: to, From: fromNumber, Body: body });
    const res = await fetchWithTimeout(url, {
      method: "POST",
      headers: {
        "Authorization": "Basic " + Buffer.from(`${accountSid}:${authToken}`).toString("base64"),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    }, 15000);
    const responseBody = await res.text();
    if (res.ok) {
      try {
        const parsed = JSON.parse(responseBody);
        console.log(`[whatsapp] Message sent to ${toNumber} | SID: ${parsed.sid} | Status: ${parsed.status}`);
      } catch {
        console.log(`[whatsapp] Message sent to ${toNumber}`);
      }
      return true;
    } else {
      console.error(`[whatsapp] Failed (${res.status}):`, responseBody);
      return false;
    }
  } catch (e) {
    console.error("[whatsapp] Error:", e);
    return false;
  }
}

export async function runDailySummaries() {
  try {
    const profiles = await db.execute(sql`
      SELECT id, business_name, whatsapp_number, whatsapp_summary_frequency, whatsapp_summary_last_sent
      FROM smart_profiles
      WHERE whatsapp_summary_enabled = true
        AND whatsapp_number IS NOT NULL
        AND whatsapp_number != ''
    `);

    const now = new Date();
    for (const p of profiles.rows as any[]) {
      const lastSent = p.whatsapp_summary_last_sent ? new Date(p.whatsapp_summary_last_sent) : null;
      const freq = p.whatsapp_summary_frequency || "daily";
      const hoursNeeded = freq === "weekly" ? 168 : 24;

      if (lastSent) {
        const hoursSince = (now.getTime() - lastSent.getTime()) / (1000 * 60 * 60);
        if (hoursSince < hoursNeeded) continue;
      }

      const sinceDate = lastSent || new Date(now.getTime() - hoursNeeded * 60 * 60 * 1000);

      const stats = await db.execute(sql`
        SELECT
          COUNT(DISTINCT session_id) as total_sessions,
          COUNT(CASE WHEN role = 'user' THEN 1 END) as user_messages,
          COUNT(CASE WHEN role = 'assistant' THEN 1 END) as ai_messages
        FROM widget_messages
        WHERE profile_id = ${p.id}
          AND created_at >= ${sinceDate}
          AND role IN ('user', 'assistant')
      `);

      const leadsDetected = await db.execute(sql`
        SELECT COUNT(DISTINCT session_id) as cnt
        FROM widget_messages
        WHERE profile_id = ${p.id}
          AND created_at >= ${sinceDate}
          AND (content LIKE '%[altegio-sent]%' OR content LIKE '%[webhook-sent]%' OR content LIKE '%[whatsapp-sent]%')
      `);

      const s = stats.rows[0] as any;
      const leadCount = (leadsDetected.rows[0] as any)?.cnt || 0;
      const period = freq === "weekly" ? "Weekly" : "Daily";

      const body = `*${period} Summary — ${p.business_name}*\n\nConversations: ${s.total_sessions || 0}\nCustomer messages: ${s.user_messages || 0}\nAI responses: ${s.ai_messages || 0}\nLeads detected: ${leadCount}\n\n_Arya AI Report_`;

      const sent = await sendWhatsAppMessage(p.whatsapp_number, body);
      if (sent) {
        await db.execute(sql`
          UPDATE smart_profiles SET whatsapp_summary_last_sent = NOW()
          WHERE id = ${p.id}
        `);
        console.log(`[whatsapp-summary] Sent ${freq} summary for ${p.business_name}`);
      }
    }
  } catch (err) {
    console.error("[whatsapp-summary] Error:", err);
  }
}

export async function runFollowUps() {
  try {
    const profiles = await db.execute(sql`
      SELECT id, business_name, whatsapp_number, whatsapp_followup_hours
      FROM smart_profiles
      WHERE whatsapp_followup_enabled = true
        AND whatsapp_number IS NOT NULL
        AND whatsapp_number != ''
    `);

    for (const p of profiles.rows as any[]) {
      const hoursAgo = p.whatsapp_followup_hours || 24;
      const cutoff = new Date(Date.now() - hoursAgo * 60 * 60 * 1000);

      const staleLeads = await db.execute(sql`
        SELECT DISTINCT wm.session_id
        FROM widget_messages wm
        WHERE wm.profile_id = ${p.id}
          AND wm.role = 'user'
          AND wm.created_at < ${cutoff}
          AND wm.session_id NOT IN (
            SELECT session_id FROM widget_messages
            WHERE profile_id = ${p.id}
              AND content LIKE '%[followup-sent]%'
          )
          AND wm.session_id NOT IN (
            SELECT session_id FROM widget_messages
            WHERE profile_id = ${p.id}
              AND (content LIKE '%[altegio-sent]%' OR content LIKE '%[webhook-sent]%' OR content LIKE '%[whatsapp-sent]%')
          )
        LIMIT 10
      `);

      for (const lead of staleLeads.rows as any[]) {
        const msgs = await db.execute(sql`
          SELECT role, content FROM widget_messages
          WHERE profile_id = ${p.id} AND session_id = ${lead.session_id}
          ORDER BY created_at ASC LIMIT 20
        `);

        const convoText = (msgs.rows as any[]).map((m: any) => `${m.role}: ${m.content}`).join("\n");
        const hasPhone = /(\+?\d[\d\s\-()]{7,})/.test(convoText);
        if (!hasPhone) continue;

        try {
          const extractResult = await gemini.models.generateContent({
            model: "gemini-2.0-flash",
            contents: `Extract the client's contact information from this conversation. Return ONLY valid JSON: {"name":"","phone":"","email":""}.\n\n${convoText}`,
          });
          const raw = extractResult.text?.trim() || "{}";
          const json = JSON.parse(raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim());

          if (json.phone) {
            const body = `*Follow-up Reminder — ${p.business_name}*\n\nA customer (${json.name || "Unknown"}) chatted ${hoursAgo}h ago but didn't convert.\nPhone: ${json.phone}\nEmail: ${json.email || "—"}\n\nConsider reaching out to them.\n\n_Arya AI Reminder_`;

            const sent = await sendWhatsAppMessage(p.whatsapp_number, body);
            if (sent) {
              await db.execute(sql`
                INSERT INTO widget_messages (id, profile_id, session_id, role, content, content_type)
                VALUES (gen_random_uuid(), ${p.id}, ${lead.session_id}, 'system', ${`[followup-sent] ${json.name || ""} ${json.phone}`}, 'system')
              `);
              console.log(`[whatsapp-followup] Sent for ${p.business_name}: ${json.phone}`);
            }
          }
        } catch {}
      }
    }
  } catch (err) {
    console.error("[whatsapp-followup] Error:", err);
  }
}

export async function runRecordingReminders() {
  try {
    const users = await db.execute(sql`
      SELECT id, display_name, whatsapp_number, whatsapp_reminder_last_sent, recordings_count
      FROM profiles
      WHERE whatsapp_reminder_enabled = true
        AND whatsapp_number IS NOT NULL
        AND whatsapp_number != ''
    `);

    const now = new Date();
    for (const u of users.rows as any[]) {
      const lastSent = u.whatsapp_reminder_last_sent ? new Date(u.whatsapp_reminder_last_sent) : null;
      if (lastSent) {
        const hoursSince = (now.getTime() - lastSent.getTime()) / (1000 * 60 * 60);
        if (hoursSince < 72) continue;
      }

      const body = `*Salam, ${u.display_name || "dostum"}!*\n\nSizin ${u.recordings_count || 0} ses yazisiniz var. Gelin Azerbaycan AI-ni birlikde quraq — daha cox cumle oxuyun ve A-Coin qazanin!\n\narya.az/az\n\n_Arya — Milli Ses AI_`;

      const sent = await sendWhatsAppMessage(u.whatsapp_number, body);
      if (sent) {
        await db.execute(sql`
          UPDATE profiles SET whatsapp_reminder_last_sent = NOW()
          WHERE id = ${u.id}
        `);
        console.log(`[whatsapp-reminder] Sent to ${u.display_name}`);
      }
    }
  } catch (err) {
    console.error("[whatsapp-reminder] Error:", err);
  }
}

export async function sendMissedLeadAlert(profileId: string, sessionId: string, question: string) {
  try {
    const profileResult = await db.execute(sql`
      SELECT business_name, whatsapp_number, whatsapp_missed_alerts_enabled
      FROM smart_profiles WHERE id = ${profileId}
    `);
    const profile = profileResult.rows[0] as any;
    if (!profile?.whatsapp_missed_alerts_enabled || !profile.whatsapp_number) return;

    const alreadySent = await db.execute(sql`
      SELECT 1 FROM widget_messages
      WHERE profile_id = ${profileId} AND session_id = ${sessionId}
        AND content LIKE '%[missed-alert]%' LIMIT 1
    `);
    if (alreadySent.rows.length) return;

    const truncQ = question.length > 200 ? question.substring(0, 200) + "..." : question;
    const body = `*Attention Required — ${profile.business_name}*\n\nA customer asked a question the AI couldn't fully answer:\n\n"${truncQ}"\n\nPlease review this conversation in your dashboard.\n\n_Arya AI Alert_`;

    const sent = await sendWhatsAppMessage(profile.whatsapp_number, body);
    if (sent) {
      await db.execute(sql`
        INSERT INTO widget_messages (id, profile_id, session_id, role, content, content_type)
        VALUES (gen_random_uuid(), ${profileId}, ${sessionId}, 'system', '[missed-alert] ${question.substring(0, 50)}', 'system')
      `);
    }
  } catch (err) {
    console.error("[whatsapp-missed-alert] Error:", err);
  }
}

export async function sendAppointmentConfirmation(profileId: string, sessionId: string, customerPhone: string, customerName: string, appointmentDetails: string) {
  try {
    const profileResult = await db.execute(sql`
      SELECT business_name, whatsapp_appointment_confirm
      FROM smart_profiles WHERE id = ${profileId}
    `);
    const profile = profileResult.rows[0] as any;
    if (!profile?.whatsapp_appointment_confirm) return;

    const alreadySent = await db.execute(sql`
      SELECT 1 FROM widget_messages
      WHERE profile_id = ${profileId} AND session_id = ${sessionId}
        AND content LIKE '%[appointment-confirmed]%' LIMIT 1
    `);
    if (alreadySent.rows.length) return;

    const body = `*Appointment Confirmation — ${profile.business_name}*\n\nHello ${customerName},\n\nYour appointment request has been received:\n${appointmentDetails}\n\nThe team will confirm your booking shortly.\n\n_Sent by Arya AI_`;

    const sent = await sendWhatsAppMessage(customerPhone, body);
    if (sent) {
      await db.execute(sql`
        INSERT INTO widget_messages (id, profile_id, session_id, role, content, content_type)
        VALUES (gen_random_uuid(), ${profileId}, ${sessionId}, 'system', ${`[appointment-confirmed] ${customerName} ${customerPhone}`}, 'system')
      `);
      console.log(`[whatsapp-appointment] Confirmation sent to ${customerPhone}`);
    }
  } catch (err) {
    console.error("[whatsapp-appointment] Error:", err);
  }
}

export async function handleInboundWhatsApp(from: string, body: string, profileId?: string) {
  const waNumber = from.replace("whatsapp:", "").replace("+", "");

  const ownerProfile = await db.execute(sql`
    SELECT id, slug, business_name, whatsapp_number
    FROM smart_profiles
    WHERE REPLACE(REPLACE(whatsapp_number, '+', ''), ' ', '') = ${waNumber}
    LIMIT 1
  `);

  if (ownerProfile.rows.length) {
    return handleOwnerReply(ownerProfile.rows[0] as any, body);
  }

  return handleCustomerMessage(waNumber, body, profileId);
}

async function handleOwnerReply(profile: any, body: string) {
  const recentLead = await db.execute(sql`
    SELECT DISTINCT session_id FROM widget_messages
    WHERE profile_id = ${profile.id}
      AND content LIKE '%[whatsapp-sent]%'
    ORDER BY created_at DESC LIMIT 1
  `);

  if (!recentLead.rows.length) {
    await sendWhatsAppMessage(profile.whatsapp_number, `No recent lead found to reply to. Use your Arya dashboard to manage conversations.`);
    return { handled: true, type: "owner-reply-no-lead" };
  }

  const sessionId = (recentLead.rows[0] as any).session_id;

  await db.execute(sql`
    INSERT INTO widget_messages (id, profile_id, session_id, role, content, content_type)
    VALUES (gen_random_uuid(), ${profile.id}, ${sessionId}, 'owner', ${`[owner-reply] ${body}`}, 'text')
  `);

  console.log(`[whatsapp-owner-reply] ${profile.business_name} replied to lead session ${sessionId}`);
  return { handled: true, type: "owner-reply", sessionId };
}

async function handleCustomerMessage(waNumber: string, body: string, profileId?: string) {
  let targetProfileId = profileId;

  if (!targetProfileId) {
    const slugMatch = body.trim().match(/^(?:Hi|Hello|Hey|Salam)\s+(\S+)/i);
    if (slugMatch) {
      const slug = slugMatch[1].toLowerCase();
      const slugProfile = await db.execute(sql`
        SELECT id FROM smart_profiles WHERE LOWER(slug) = ${slug} AND whatsapp_chat_enabled = true AND is_active = true LIMIT 1
      `);
      if (slugProfile.rows.length) {
        targetProfileId = (slugProfile.rows[0] as any).id;
        console.log(`[whatsapp] Matched slug "${slug}" from message body`);
      }
    }
  }

  if (!targetProfileId) {
    const existingConv = await db.execute(sql`
      SELECT profile_id FROM whatsapp_conversations
      WHERE wa_number = ${waNumber}
      ORDER BY last_inbound_at DESC NULLS LAST
      LIMIT 1
    `);
    if (existingConv.rows.length) {
      targetProfileId = (existingConv.rows[0] as any).profile_id;
      console.log(`[whatsapp] Resuming existing conversation for ${waNumber}`);
    }
  }

  if (!targetProfileId) {
    const masterProfile = await db.execute(sql`
      SELECT id FROM smart_profiles
      WHERE is_master = true AND whatsapp_chat_enabled = true AND is_active = true
      LIMIT 1
    `);
    if (masterProfile.rows.length) {
      targetProfileId = (masterProfile.rows[0] as any).id;
      console.log(`[whatsapp] Routed to master profile as fallback`);
    }
  }

  if (!targetProfileId) {
    return { handled: false, reason: "no-profile-found" };
  }

  const profile = await db.execute(sql`
    SELECT id, slug, business_name, display_name, profession,
           knowledge_base, knowledge_base_ru, knowledge_base_en, whatsapp_chat_enabled
    FROM smart_profiles WHERE id = ${targetProfileId}
  `);

  if (!profile.rows.length || !(profile.rows[0] as any).whatsapp_chat_enabled) {
    return { handled: false, reason: "chat-not-enabled" };
  }

  const p = profile.rows[0] as any;
  let sessionId: string;

  const existingSession = await db.execute(sql`
    SELECT id, session_id FROM whatsapp_conversations
    WHERE wa_number = ${waNumber} AND profile_id = ${targetProfileId}
    ORDER BY last_inbound_at DESC NULLS LAST
    LIMIT 1
  `);

  if (existingSession.rows.length) {
    const conv = existingSession.rows[0] as any;
    sessionId = conv.session_id;
    await db.execute(sql`
      UPDATE whatsapp_conversations SET last_inbound_at = NOW()
      WHERE id = ${conv.id}
    `);
  } else {
    sessionId = `wa-${waNumber}-${Date.now()}`;
    await db.execute(sql`
      INSERT INTO whatsapp_conversations (id, profile_id, wa_number, session_id, last_inbound_at)
      VALUES (gen_random_uuid(), ${targetProfileId}, ${waNumber}, ${sessionId}, NOW())
    `);
  }

  await db.execute(sql`
    INSERT INTO widget_messages (id, profile_id, session_id, role, content, content_type)
    VALUES (gen_random_uuid(), ${targetProfileId}, ${sessionId}, 'user', ${body}, 'text')
  `);

  const history = await db.execute(sql`
    SELECT role, content FROM widget_messages
    WHERE profile_id = ${targetProfileId} AND session_id = ${sessionId}
      AND role IN ('user', 'assistant')
    ORDER BY created_at ASC
    LIMIT 10
  `);

  const chatHistory = (history.rows as any[]).slice(0, -1).map((m: any) => ({
    role: m.role === "user" ? "user" : "model",
    parts: [{ text: m.content }],
  }));

  const knowledgeBase = p.knowledge_base || "";
  if (!knowledgeBase) {
    return { handled: true, type: "no-kb" };
  }

  const globalKB = await storage.getGlobalKnowledgeBase();

  const systemPrompt = `You are an AI receptionist for ${p.display_name || p.slug}, ${p.profession || ""}.
You are chatting with a customer via WhatsApp.

PRIVACY FIREWALL:
- You only know PUBLIC business information provided below.
- NEVER reveal internal/private business data.
- If asked for private info, suggest contacting the business directly.

Public Business Information:
${knowledgeBase}
${globalKB ? `\nGlobal Platform Knowledge (About Arya AI):\n${globalKB}\n` : ""}
Your Role:
- Answer questions about services, prices, hours, location
- When customer wants to book/order, collect their name and preferred time
- Keep answers short (1-3 sentences), friendly, professional
- Match the customer's language
- You can take orders, bookings, appointments, and inquiries`;

  try {
    const result = await gemini.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        ...chatHistory,
        { role: "user", parts: [{ text: body }] },
      ],
      config: {
        systemInstruction: systemPrompt,
        maxOutputTokens: 500,
      },
    });

    const reply = result.text || "Sorry, please try again.";

    await db.execute(sql`
      INSERT INTO widget_messages (id, profile_id, session_id, role, content, content_type)
      VALUES (gen_random_uuid(), ${targetProfileId}, ${sessionId}, 'assistant', ${reply}, 'text')
    `);

    await sendWhatsAppMessage(waNumber, reply);

    await db.execute(sql`
      UPDATE whatsapp_conversations SET last_outbound_at = NOW()
      WHERE profile_id = ${targetProfileId} AND wa_number = ${waNumber}
    `);

    const userMsgCount = (history.rows as any[]).filter((m: any) => m.role === "user").length;
    if (userMsgCount >= 2) {
      const convoText = (history.rows as any[]).map((m: any) => `${m.role}: ${m.content}`).join("\n") + `\nuser: ${body}\nassistant: ${reply}`;
      const hasContact = /(\+?\d[\d\s\-()]{7,})|(\b\d{10,}\b)/.test(convoText) || /[\w.-]+@[\w.-]+\.\w+/.test(convoText);

      if (hasContact) {
        const profileFull = await db.execute(sql`
          SELECT whatsapp_number, whatsapp_auto_notify FROM smart_profiles WHERE id = ${targetProfileId}
        `);
        const pf = profileFull.rows[0] as any;
        if (pf?.whatsapp_auto_notify && pf.whatsapp_number) {
          const alreadyNotified = await db.execute(sql`
            SELECT 1 FROM widget_messages
            WHERE profile_id = ${targetProfileId} AND session_id = ${sessionId}
              AND content LIKE '%[whatsapp-sent]%' LIMIT 1
          `);
          if (!alreadyNotified.rows.length) {
            try {
              const extractResult = await gemini.models.generateContent({
                model: "gemini-2.0-flash",
                contents: `Extract the client's contact information from this conversation. Return ONLY valid JSON: {"name":"","phone":"","email":""}.\n\n${convoText}`,
              });
              const raw = extractResult.text?.trim() || "{}";
              const json = JSON.parse(raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim());
              if (json.name || json.phone || json.email) {
                const notifBody = `*New Lead — ${p.business_name}*\n\nName: ${json.name || "—"}\nPhone: ${json.phone || "—"}\nEmail: ${json.email || "—"}\nSource: WhatsApp\n\n_Sent by Arya AI_`;
                const sent = await sendWhatsAppMessage(pf.whatsapp_number, notifBody);
                if (sent) {
                  await db.execute(sql`
                    INSERT INTO widget_messages (id, profile_id, session_id, role, content, content_type)
                    VALUES (gen_random_uuid(), ${targetProfileId}, ${sessionId}, 'system', ${`[whatsapp-sent] ${json.name || ""} ${json.phone || ""}`}, 'system')
                  `);
                }
              }
            } catch {}
          }
        }
      }
    }

    return { handled: true, type: "customer-chat", reply, sessionId };
  } catch (err) {
    console.error("[whatsapp-chat] AI error:", err);
    await sendWhatsAppMessage(waNumber, "Sorry, I'm having trouble right now. Please try again in a moment.");
    return { handled: true, type: "error" };
  }
}

export async function detectAndSendAppointmentConfirmation(profileId: string, sessionId: string, aiReply: string, convoText: string) {
  try {
    const profile = await db.execute(sql`
      SELECT whatsapp_appointment_confirm FROM smart_profiles WHERE id = ${profileId}
    `);
    if (!(profile.rows[0] as any)?.whatsapp_appointment_confirm) return;

    const bookingKeywords = /\b(book|appointment|schedule|reserve|reservation|randevu|qeydiyyat|zapis|запис|бронь|kayit)\b/i;
    if (!bookingKeywords.test(convoText)) return;

    const hasContact = /(\+?\d[\d\s\-()]{7,})/.test(convoText);
    if (!hasContact) return;

    const alreadySent = await db.execute(sql`
      SELECT 1 FROM widget_messages
      WHERE profile_id = ${profileId} AND session_id = ${sessionId}
        AND content LIKE '%[appointment-confirmed]%' LIMIT 1
    `);
    if (alreadySent.rows.length) return;

    const extractResult = await gemini.models.generateContent({
      model: "gemini-2.0-flash",
      contents: `This is a conversation between a customer and an AI receptionist. Does the conversation contain a booking/appointment request WITH the customer's phone number? If yes, extract: {"hasBooking":true,"name":"","phone":"","details":"brief description of what they want to book"}. If no booking, return {"hasBooking":false}. Return ONLY valid JSON.\n\n${convoText}`,
    });

    const raw = extractResult.text?.trim() || "{}";
    const json = JSON.parse(raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim());

    if (json.hasBooking && json.phone) {
      await sendAppointmentConfirmation(profileId, sessionId, json.phone, json.name || "Customer", json.details || "Appointment request received");
    }
  } catch (err) {
    console.error("[whatsapp-appointment-detect] Error:", err);
  }
}

let schedulerInterval: ReturnType<typeof setInterval> | null = null;

export function startWhatsAppScheduler() {
  if (schedulerInterval) return;
  console.log("[whatsapp-scheduler] Started (runs every 30 minutes)");

  schedulerInterval = setInterval(async () => {
    console.log("[whatsapp-scheduler] Running scheduled tasks...");
    await runDailySummaries();
    await runFollowUps();
    await runRecordingReminders();
  }, 30 * 60 * 1000);

  setTimeout(async () => {
    console.log("[whatsapp-scheduler] Initial run...");
    await runDailySummaries();
    await runFollowUps();
    await runRecordingReminders();
  }, 60 * 1000);
}

export function stopWhatsAppScheduler() {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
    console.log("[whatsapp-scheduler] Stopped");
  }
}
