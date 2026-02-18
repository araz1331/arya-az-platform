import type { Express, Request, Response, RequestHandler } from "express";
import { createServer, type Server } from "http";
import { setupSession, registerAuthRoutes, isAuthenticated, getUserId } from "./auth";
import { storage } from "./storage";
import { db } from "./db";
import { users } from "@shared/models/auth";
import { eq, sql } from "drizzle-orm";
import multer from "multer";
import { GoogleGenAI } from "@google/genai";
import OpenAI from "openai";
import { getUncachableStripeClient } from "./stripeClient";
import * as fs from "fs";
import * as path from "path";
import { detectAudioFormat, speechToText } from "./replit_integrations/audio/client";

function isValidWebhookUrl(urlStr: string): boolean {
  try {
    const u = new URL(urlStr);
    if (u.protocol !== "https:" && u.protocol !== "http:") return false;
    const hostname = u.hostname.toLowerCase();
    const blocked = ["localhost", "127.0.0.1", "0.0.0.0", "::1", "metadata.google.internal", "169.254.169.254"];
    if (blocked.includes(hostname)) return false;
    if (/^(10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.)/.test(hostname)) return false;
    if (hostname.endsWith(".internal") || hostname.endsWith(".local")) return false;
    return true;
  } catch {
    return false;
  }
}

async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs = 10000): Promise<globalThis.Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function sendWhatsAppNotification(toNumber: string, leadName: string, leadPhone: string, leadEmail: string, businessName: string): Promise<boolean> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!accountSid || !authToken) {
    console.error("[whatsapp] Missing TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN");
    return false;
  }
  const fromNumber = "whatsapp:+12792030206";
  const to = `whatsapp:${toNumber.startsWith("+") ? toNumber : "+" + toNumber}`;
  const body = `*New Lead — ${businessName}*\n\nName: ${leadName || "—"}\nPhone: ${leadPhone || "—"}\nEmail: ${leadEmail || "—"}\n\n_Sent by Arya AI_`;

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
    if (res.ok) {
      console.log(`[whatsapp] Notification sent to ${toNumber} for ${businessName}`);
      return true;
    } else {
      const err = await res.text();
      console.error(`[whatsapp] Failed (${res.status}):`, err);
      return false;
    }
  } catch (e) {
    console.error("[whatsapp] Error:", e);
    return false;
  }
}

const gemini = new GoogleGenAI({
  apiKey: process.env.AI_INTEGRATIONS_GEMINI_API_KEY || "",
  httpOptions: {
    apiVersion: "",
    baseUrl: process.env.AI_INTEGRATIONS_GEMINI_BASE_URL || "",
  },
});

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

async function translateText(text: string, targetLang: string): Promise<string> {
  const langName = targetLang === "ru" ? "Russian" : "English";
  const prompt = `Translate the following business profile text from Azerbaijani to ${langName}. Keep the same structure and formatting. Only return the translated text, nothing else.\n\n${text}`;

  try {
    const result = await gemini.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    });
    const translated = result.candidates?.[0]?.content?.parts?.[0]?.text || "";
    if (!translated) throw new Error("Empty Gemini response");
    return translated;
  } catch (geminiErr) {
    console.warn(`Gemini translation failed for ${langName}, falling back to OpenAI:`, geminiErr);
    const completion = await openai.chat.completions.create({
      model: "gpt-5-mini",
      messages: [{ role: "user", content: prompt }],
    });
    return completion.choices?.[0]?.message?.content || "";
  }
}

const ADMIN_EMAILS = ["dagik@yahoo.com"];

const isAdmin: RequestHandler = async (req, res, next) => {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  const [user] = await db.select().from(users).where(eq(users.id, req.session.userId));
  if (!user || !ADMIN_EMAILS.includes(user.email?.toLowerCase() ?? "")) {
    return res.status(403).json({ message: "Forbidden" });
  }
  next();
};

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

const SHOP_ITEMS: Record<string, { name: string; cost: number; activationDate: string }> = {
  secretary: { name: "Arya Katib (100 Dəqiqə)", cost: 1000, activationDate: "15 May 2026" },
  translator: { name: "Arya Tərcüməçi", cost: 500, activationDate: "1 İyul 2026" },
  assistant: { name: "Arya Köməkçi", cost: 750, activationDate: "15 Avqust 2026" },
  reader: { name: "Arya Oxucu", cost: 300, activationDate: "1 Sentyabr 2026" },
};

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  setupSession(app);
  registerAuthRoutes(app);

  app.get("/widget.js", (req: Request, res: Response) => {
    res.set({
      "Cache-Control": "public, max-age=300, s-maxage=300",
      "Content-Type": "application/javascript; charset=utf-8",
    });
    const widgetPath = path.join(process.cwd(), "client", "public", "widget.js");
    if (fs.existsSync(widgetPath)) {
      res.sendFile(widgetPath);
    } else {
      res.status(404).send("// widget.js not found");
    }
  });

  app.get("/api/user", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const profile = await storage.getOrCreateProfile(userId);
      res.json(profile);
    } catch (error) {
      console.error("Error getting user:", error);
      res.status(500).json({ message: "Server xətası" });
    }
  });

  app.get("/api/recordings/sentence-ids", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const ids = await storage.getRecordedSentenceIds(userId);
      res.json(ids);
    } catch (error) {
      console.error("Error getting recorded sentence IDs:", error);
      res.status(500).json({ message: "Server xətası" });
    }
  });

  app.get("/api/stats", async (_req: Request, res: Response) => {
    try {
      const stats = await storage.getStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Server xətası" });
    }
  });

  app.post("/api/recordings", isAuthenticated, upload.single("audio"), async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const profile = await storage.getOrCreateProfile(userId);
      const { sentenceId, sentenceText, category, duration, wordCount } = req.body;

      if (!sentenceId || !sentenceText || !category || !duration) {
        return res.status(400).json({ message: "Bütün sahələr tələb olunur" });
      }

      const durationNum = parseInt(duration);
      const wordCountNum = parseInt(wordCount || "5");

      const minDuration = wordCountNum * 0.3;
      if (durationNum < minDuration) {
        return res.status(400).json({
          message: `Çox sürətli oxudunuz. Minimum ${Math.ceil(minDuration)} saniyə lazımdır.`
        });
      }

      const fileSize = req.file ? req.file.size : 0;

      await storage.createRecording({
        userId,
        sentenceId,
        sentenceText,
        category,
        duration: durationNum,
        fileSize,
      });

      await storage.incrementRecordingsCount(userId);
      const updatedProfile = await storage.getProfile(userId);
      if (!updatedProfile) {
        return res.status(404).json({ message: "İstifadəçi tapılmadı" });
      }

      let milestoneReached: number | null = null;
      let milestoneReward = 0;

      if (updatedProfile.recordingsCount === 5 && !updatedProfile.milestone1Claimed) {
        const totalUsers = await storage.getTotalProfileCount();
        const baseReward = totalUsers < 1000 ? 200 : 100;

        await storage.updateProfileTokens(userId, updatedProfile.tokens + baseReward);
        await storage.claimMilestone(userId, 1);
        await storage.createTransaction({
          userId,
          amount: baseReward,
          type: "milestone_1",
          description: `Hədəf 1 tamamlandı: +${baseReward} A-Coin`,
        });
        milestoneReached = 1;
        milestoneReward = baseReward;
      }

      if (updatedProfile.recordingsCount === 20 && !updatedProfile.milestone2Claimed) {
        const totalUsers = await storage.getTotalProfileCount();
        const bonusReward = totalUsers < 1000 ? 800 : 400;

        const currentProfile = await storage.getProfile(userId);
        await storage.updateProfileTokens(userId, (currentProfile?.tokens ?? 0) + bonusReward);
        await storage.claimMilestone(userId, 2);
        await storage.createTransaction({
          userId,
          amount: bonusReward,
          type: "milestone_2",
          description: `Hədəf 2 tamamlandı: +${bonusReward} A-Coin`,
        });
        milestoneReached = 2;
        milestoneReward = bonusReward;
      }

      if (updatedProfile.recordingsCount > 20 && updatedProfile.recordingsCount % 50 === 0) {
        const reward = 1000;
        const currentProfile = await storage.getProfile(userId);
        await storage.updateProfileTokens(userId, (currentProfile?.tokens ?? 0) + reward);
        await storage.createTransaction({
          userId,
          amount: reward,
          type: "milestone_50",
          description: `${updatedProfile.recordingsCount} cümlə tamamlandı: +${reward} A-Coin`,
        });
        milestoneReached = 50;
        milestoneReward = reward;
      }

      res.json({ success: true, milestone: milestoneReached, milestoneReward });
    } catch (error) {
      console.error("Error creating recording:", error);
      res.status(500).json({ message: "Server xətası" });
    }
  });

  app.patch("/api/user/profile", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const { age, gender } = req.body;

      if (age !== undefined && (typeof age !== "string" || age.length > 3)) {
        return res.status(400).json({ message: "Yaş düzgün deyil" });
      }
      if (gender !== undefined && !["male", "female"].includes(gender)) {
        return res.status(400).json({ message: "Cins düzgün deyil" });
      }

      await storage.updateProfileInfo(userId, {
        ...(age !== undefined ? { age } : {}),
        ...(gender !== undefined ? { gender } : {}),
      });
      const profile = await storage.getOrCreateProfile(userId);
      res.json(profile);
    } catch (error) {
      console.error("Error updating profile:", error);
      res.status(500).json({ message: "Server xətası" });
    }
  });

  app.options("/api/donate-voice", (_req: Request, res: Response) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.status(204).end();
  });

  app.post("/api/transcribe", upload.single("audio"), async (req: Request, res: Response) => {
    try {
      const audioFile = req.file;
      if (!audioFile) return res.status(400).json({ error: "No audio file" });

      const audioBuffer = Buffer.from(audioFile.buffer);
      const detected = detectAudioFormat(audioBuffer);
      const supportedFormats = ["wav", "mp3", "webm", "mp4", "ogg"] as const;
      const format = supportedFormats.includes(detected as any) ? detected as "wav" | "mp3" | "webm" | "mp4" | "ogg" : "webm";
      const transcript = await speechToText(audioBuffer, format);
      res.json({ text: transcript.trim() });
    } catch (err: any) {
      console.error("[transcribe] error:", err?.message || err);
      res.status(500).json({ error: "Transcription failed" });
    }
  });

  app.post("/api/donate-voice", upload.single("audio"), async (req: Request, res: Response) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    try {
      const { speaker_name, age, gender, sentenceId, sentenceText, category, duration, wordCount } = req.body;
      const audioFile = req.file;

      if (!audioFile) {
        return res.status(400).json({ success: false, message: "Audio faylı tələb olunur" });
      }

      if (!sentenceId || !sentenceText) {
        return res.status(400).json({ success: false, message: "Cümlə məlumatları tələb olunur" });
      }

      console.log(`[donate-voice] Received: speaker=${speaker_name}, age=${age}, gender=${gender}, sentence=${sentenceId}, duration=${duration}s, fileSize=${audioFile.size}, mimeType=${audioFile.mimetype}`);

      const ext = audioFile.mimetype.includes("mp4") ? "mp4" : "webm";
      const audioFilename = `${Date.now()}-${sentenceId || "unknown"}.${ext}`;
      let audioUrl: string | null = null;
      try {
        const { uploadToS3 } = await import("./s3");
        const s3Key = `voice-donations/${audioFilename}`;
        audioUrl = await uploadToS3(s3Key, audioFile.buffer, audioFile.mimetype, false);
        console.log(`[donate-voice] Uploaded to S3: ${s3Key}`);
      } catch (s3Err) {
        console.warn("[donate-voice] S3 upload failed, saving locally:", s3Err);
        const voiceDir = path.join(process.cwd(), "uploads", "voice-donations");
        if (!fs.existsSync(voiceDir)) fs.mkdirSync(voiceDir, { recursive: true });
        const localPath = path.join(voiceDir, audioFilename);
        fs.writeFileSync(localPath, audioFile.buffer);
        audioUrl = `/uploads/voice-donations/${audioFilename}`;
        console.log(`[donate-voice] Saved locally: ${audioUrl}`);
      }

      const donation = await storage.createVoiceDonation({
        userId: req.session?.userId || null,
        speakerName: speaker_name || "unknown",
        age: age || null,
        gender: gender || null,
        sentenceId: sentenceId || null,
        transcription: sentenceText || null,
        audioUrl,
        category: category || null,
        duration: parseInt(duration) || 0,
        fileSize: audioFile.size,
        wordCount: parseInt(wordCount) || 0,
      });

      res.json({
        success: true,
        message: "Səs yazısı uğurla qəbul edildi",
        data: {
          id: donation.id,
          speaker_name: speaker_name || "unknown",
          age: age || "unknown",
          gender: gender || "unknown",
          sentenceId,
          fileSize: audioFile.size,
          mimeType: audioFile.mimetype,
          duration: duration || 0,
        }
      });
    } catch (error) {
      console.error("[donate-voice] Error:", error);
      res.status(500).json({ success: false, message: "Server xətası" });
    }
  });

  app.post("/api/widget-messages", async (req: Request, res: Response) => {
    try {
      const { profileId, sessionId, role, content, contentType, audioUrl } = req.body;
      if (!role || !contentType) {
        return res.status(400).json({ success: false, message: "role and contentType required" });
      }
      const msg = await storage.createWidgetMessage({
        profileId: profileId || null,
        sessionId: sessionId || null,
        role,
        content: content || null,
        contentType,
        audioUrl: audioUrl || null,
      });

      if (role === "assistant" && profileId && sessionId) {
        try {
          const profile = await storage.getSmartProfile(profileId);
          const hasAltegio = profile?.altegioAutoSend && profile.altegioPartnerToken && profile.altegioUserToken && profile.altegioCompanyId;
          const hasWebhook = profile?.webhookAutoSend && profile.webhookUrl;
          const hasWhatsApp = profile?.whatsappAutoNotify && profile.whatsappNumber;

          if (hasAltegio || hasWebhook || hasWhatsApp) {
            const allMsgs = await db.execute(sql`
              SELECT role, content FROM widget_messages
              WHERE profile_id = ${profileId} AND session_id = ${sessionId}
              ORDER BY created_at ASC
            `);
            const userMsgs = allMsgs.rows.filter((m: any) => m.role === "user");
            if (userMsgs.length >= 2) {
              const convoText = allMsgs.rows.map((m: any) => `${m.role}: ${m.content}`).join("\n");
              const hasContact = /(\+?\d[\d\s\-()]{7,})|(\b\d{10,}\b)/.test(convoText);
              if (hasContact) {
                if (hasAltegio) {
                  const alreadySent = await db.execute(sql`
                    SELECT 1 FROM widget_messages
                    WHERE profile_id = ${profileId} AND session_id = ${sessionId}
                      AND content LIKE '%[altegio-sent]%' LIMIT 1
                  `);
                  if (!alreadySent.rows.length) {
                    const extractResult = await gemini.models.generateContent({
                      model: "gemini-2.0-flash",
                      contents: `Extract the client's contact information from this conversation. Return ONLY valid JSON: {"name":"","phone":"","comment":""}.\n\n${convoText}`,
                    });
                    try {
                      const raw = extractResult.text?.trim() || "{}";
                      const json = JSON.parse(raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim());
                      if (json.name || json.phone) {
                        const altRes = await fetch(`https://api.alteg.io/api/v1/client/${profile!.altegioCompanyId!}`, {
                          method: "POST",
                          headers: {
                            "Authorization": `Bearer ${profile!.altegioPartnerToken}, User ${profile!.altegioUserToken}`,
                            "Accept": "application/vnd.api.v2+json",
                            "Content-Type": "application/json",
                          },
                          body: JSON.stringify({
                            name: json.name || "Arya Lead",
                            phone: json.phone || "",
                            comment: `[Arya AI Lead] ${json.comment || ""}`.trim(),
                          }),
                        });
                        if (altRes.ok) {
                          await storage.createWidgetMessage({
                            profileId, sessionId, role: "system",
                            content: `[altegio-sent] ${json.name} ${json.phone}`,
                            contentType: "system", audioUrl: null,
                          });
                          console.log(`[altegio-auto] Sent lead for ${profile!.slug}: ${json.name} ${json.phone}`);
                        } else {
                          console.error(`[altegio-auto] Failed for ${profile!.slug}:`, altRes.status);
                        }
                      }
                    } catch {}
                  }
                }

                if (hasWebhook) {
                  const alreadySentWh = await db.execute(sql`
                    SELECT 1 FROM widget_messages
                    WHERE profile_id = ${profileId} AND session_id = ${sessionId}
                      AND content LIKE '%[webhook-sent]%' LIMIT 1
                  `);
                  if (!alreadySentWh.rows.length) {
                    const extractResult = await gemini.models.generateContent({
                      model: "gemini-2.0-flash",
                      contents: `Extract the client's contact information from this conversation. Return ONLY valid JSON: {"name":"","phone":"","email":"","comment":""}.\n\n${convoText}`,
                    });
                    try {
                      const raw = extractResult.text?.trim() || "{}";
                      const json = JSON.parse(raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim());
                      if (json.name || json.phone || json.email) {
                        const payload = {
                          event: "new_lead",
                          profile: { slug: profile!.slug, businessName: profile!.businessName },
                          lead: { name: json.name || "", phone: json.phone || "", email: json.email || "", comment: json.comment || "", sessionId },
                          timestamp: new Date().toISOString(),
                        };
                        const whHeaders: Record<string, string> = { "Content-Type": "application/json", "User-Agent": "Arya-Webhook/1.0" };
                        if (profile!.webhookSecret) {
                          const crypto = await import("crypto");
                          const signature = crypto.createHmac("sha256", profile!.webhookSecret!).update(JSON.stringify(payload)).digest("hex");
                          whHeaders["X-Arya-Signature"] = signature;
                        }
                        const whRes = await fetchWithTimeout(profile!.webhookUrl!, { method: "POST", headers: whHeaders, body: JSON.stringify(payload) });
                        if (whRes.ok) {
                          await storage.createWidgetMessage({
                            profileId, sessionId, role: "system",
                            content: `[webhook-sent] ${json.name} ${json.phone}`,
                            contentType: "system", audioUrl: null,
                          });
                          console.log(`[webhook-auto] Sent lead for ${profile!.slug}: ${json.name} ${json.phone}`);
                        } else {
                          console.error(`[webhook-auto] Failed for ${profile!.slug}:`, whRes.status);
                        }
                      }
                    } catch {}
                  }
                }

                if (hasWhatsApp) {
                  const alreadySentWa = await db.execute(sql`
                    SELECT 1 FROM widget_messages
                    WHERE profile_id = ${profileId} AND session_id = ${sessionId}
                      AND content LIKE '%[whatsapp-sent]%' LIMIT 1
                  `);
                  if (!alreadySentWa.rows.length) {
                    const extractResult = await gemini.models.generateContent({
                      model: "gemini-2.0-flash",
                      contents: `Extract the client's contact information from this conversation. Return ONLY valid JSON: {"name":"","phone":"","email":"","comment":""}.\n\n${convoText}`,
                    });
                    try {
                      const raw = extractResult.text?.trim() || "{}";
                      const json = JSON.parse(raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim());
                      if (json.name || json.phone || json.email) {
                        const sent = await sendWhatsAppNotification(
                          profile!.whatsappNumber!,
                          json.name || "",
                          json.phone || "",
                          json.email || "",
                          profile!.businessName
                        );
                        if (sent) {
                          await storage.createWidgetMessage({
                            profileId, sessionId, role: "system",
                            content: `[whatsapp-sent] ${json.name} ${json.phone}`,
                            contentType: "system", audioUrl: null,
                          });
                        }
                      }
                    } catch {}
                  }
                }
              }
            }
          }
        } catch (autoErr) {
          console.error("[crm-auto] Error:", autoErr);
        }
      }

      res.json({ success: true, id: msg.id });
    } catch (error) {
      console.error("[widget-messages] Error:", error);
      res.status(500).json({ success: false, message: "Server xətası" });
    }
  });

  app.get("/api/transactions", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const txs = await storage.getTransactionsByUserId(userId);
      res.json(txs);
    } catch (error) {
      res.status(500).json({ message: "Server xətası" });
    }
  });

  app.get("/api/vouchers", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const v = await storage.getVouchersByUserId(userId);
      res.json(v);
    } catch (error) {
      res.status(500).json({ message: "Server xətası" });
    }
  });

  app.post("/api/vouchers", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const { itemId } = req.body;

      const shopItem = SHOP_ITEMS[itemId];
      if (!shopItem) {
        return res.status(400).json({ message: "Belə bir məhsul yoxdur" });
      }

      const profile = await storage.getProfile(userId);
      if (!profile) {
        return res.status(404).json({ message: "İstifadəçi tapılmadı" });
      }

      const existingVouchers = await storage.getVouchersByUserId(userId);
      if (existingVouchers.some(v => v.itemName === itemId)) {
        return res.status(400).json({ message: "Bu məhsul artıq sifariş edilib" });
      }

      if (profile.tokens < shopItem.cost) {
        return res.status(400).json({ message: "Kifayət qədər tokeniniz yoxdur" });
      }

      await storage.updateProfileTokens(userId, profile.tokens - shopItem.cost);

      await storage.createVoucher({
        userId,
        itemName: itemId,
        tokenCost: shopItem.cost,
        activationDate: shopItem.activationDate,
        status: "pending",
      });

      await storage.createTransaction({
        userId,
        amount: -shopItem.cost,
        type: "purchase",
        description: `${shopItem.name} sifariş edildi`,
      });

      res.json({ success: true });
    } catch (error) {
      console.error("Error purchasing voucher:", error);
      res.status(500).json({ message: "Server xətası" });
    }
  });

  app.get("/api/admin/check", isAdmin, (_req: Request, res: Response) => {
    res.json({ isAdmin: true });
  });

  app.get("/api/admin/stats", isAdmin, async (_req: Request, res: Response) => {
    try {
      const stats = await storage.getAdminStats();
      res.json(stats);
    } catch (error) {
      console.error("Admin stats error:", error);
      res.status(500).json({ message: "Server xətası" });
    }
  });

  app.get("/api/admin/full-stats", isAdmin, async (_req: Request, res: Response) => {
    try {
      const stats = await storage.getAdminFullStats();
      res.json(stats);
    } catch (error) {
      console.error("Admin full stats error:", error);
      res.status(500).json({ message: "Server xətası" });
    }
  });

  app.get("/api/admin/users", isAdmin, async (_req: Request, res: Response) => {
    try {
      const allUsers = await storage.getAllUsersWithProfiles();
      res.json(allUsers);
    } catch (error) {
      console.error("Admin users error:", error);
      res.status(500).json({ message: "Server xətası" });
    }
  });

  app.get("/api/admin/smart-profiles", isAdmin, async (_req: Request, res: Response) => {
    try {
      const profiles = await storage.getAdminSmartProfiles();
      res.json(profiles);
    } catch (error) {
      console.error("Admin smart profiles error:", error);
      res.status(500).json({ message: "Server xətası" });
    }
  });

  app.get("/api/admin/leads", isAdmin, async (_req: Request, res: Response) => {
    try {
      const leads = await storage.getAdminLeads();
      res.json(leads);
    } catch (error) {
      console.error("Admin leads error:", error);
      res.status(500).json({ message: "Server xətası" });
    }
  });

  app.get("/api/admin/voice-donations", isAdmin, async (_req: Request, res: Response) => {
    try {
      const donations = await storage.getAdminVoiceDonations();
      const { getSignedDownloadUrl } = await import("./s3");
      const donationsWithUrls = await Promise.all(
        donations.map(async (d: any) => {
          if (d.audioUrl && !d.audioUrl.startsWith("http")) {
            try {
              const signedUrl = await getSignedDownloadUrl(d.audioUrl, 3600);
              return { ...d, audioStreamUrl: signedUrl };
            } catch { return d; }
          }
          return d;
        })
      );
      res.json(donationsWithUrls);
    } catch (error) {
      console.error("Admin voice donations error:", error);
      res.status(500).json({ message: "Server xətası" });
    }
  });

  app.post("/api/admin/set-pro", isAdmin, async (req: Request, res: Response) => {
    try {
      const { userId, isPro, days } = req.body;
      if (!userId) return res.status(400).json({ message: "userId required" });

      const profile = await storage.getSmartProfileByUserId(userId);
      if (!profile) {
        return res.status(404).json({ message: "User has no smart profile" });
      }

      const proExpiresAt = isPro && days
        ? new Date(Date.now() + days * 24 * 60 * 60 * 1000)
        : isPro ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) : null;

      await storage.updateSmartProfile(profile.id, {
        isPro: !!isPro,
        proExpiresAt,
      });

      res.json({ success: true, isPro: !!isPro, proExpiresAt });
    } catch (error) {
      console.error("Admin set-pro error:", error);
      res.status(500).json({ message: "Server xətası" });
    }
  });

  app.get("/api/export/metadata.csv", async (_req: Request, res: Response) => {
    try {
      const allRecordings = await storage.getAllRecordings();
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", "attachment; filename=metadata.csv");

      let csv = "filename,text,speaker_id,category,duration\n";
      for (const rec of allRecordings) {
        const ts = rec.createdAt ? new Date(rec.createdAt).getTime() : Date.now();
        const filename = `az_${rec.userId}_${ts}_${rec.sentenceId}.webm`;
        const escapedText = rec.sentenceText.replace(/"/g, '""');
        csv += `"${filename}","${escapedText}","${rec.userId}","${rec.category}",${rec.duration}\n`;
      }
      res.write(csv);
      res.end();
    } catch (error) {
      console.error("Export error:", error);
      res.status(500).json({ message: "Server xətası" });
    }
  });

  const HIREARYA_API = "https://api.hirearya.com";
  const HIREARYA_HEADERS = {
    "x-api-key": process.env.HIREARYA_SECRET_KEY || "",
  };

  app.get("/api/smart-profile", isAuthenticated, async (req, res) => {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    const profile = await storage.getSmartProfileByUserId(userId);
    res.json(profile || null);
  });

  app.post("/api/smart-profile", isAuthenticated, async (req, res) => {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    const existing = await storage.getSmartProfileByUserId(userId);
    if (existing) return res.status(400).json({ message: "Profile already exists" });
    const { slug, businessName, profession, themeColor, knowledgeBase } = req.body;
    if (!slug || !businessName || !profession) {
      return res.status(400).json({ message: "Missing required fields" });
    }
    const slugTaken = await storage.getSmartProfileBySlug(slug);
    if (slugTaken) return res.status(409).json({ message: "This URL is already taken" });
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    const realName = user ? `${user.firstName || ""} ${user.lastName || ""}`.trim() : null;
    const profile = await storage.createSmartProfile({
      userId,
      slug,
      businessName,
      displayName: realName || businessName,
      profession,
      themeColor: themeColor || "#2563EB",
      knowledgeBase: knowledgeBase || null,
      onboardingComplete: true,
      isActive: true,
    });
    res.json(profile);
  });

  app.patch("/api/smart-profile", isAuthenticated, async (req, res) => {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    const existing = await storage.getSmartProfileByUserId(userId);
    if (!existing) return res.status(404).json({ message: "No profile found" });
    const allowedFields = ["businessName", "displayName", "profession", "themeColor", "knowledgeBase", "knowledgeBaseRu", "knowledgeBaseEn", "professionRu", "professionEn", "profileImageUrl", "slug", "isActive"] as const;
    const safeData: Record<string, any> = {};
    for (const key of allowedFields) {
      if (key in req.body) safeData[key] = req.body[key];
    }
    const updated = await storage.updateSmartProfile(existing.id, safeData);
    res.json(updated);
  });

  app.get("/api/smart-profile/by-slug/:slug", async (req, res) => {
    const profile = await storage.getSmartProfileBySlug(req.params.slug);
    if (!profile || !profile.isActive) return res.status(404).json({ message: "Profile not found" });
    res.json({
      id: profile.id,
      display_name: profile.displayName || profile.businessName,
      business_name: profile.businessName,
      profession: profile.profession,
      profession_ru: profile.professionRu || null,
      profession_en: profile.professionEn || null,
      theme_color: profile.themeColor,
      profile_image_url: profile.profileImageUrl || null,
      knowledge_base: profile.knowledgeBase,
      knowledge_base_ru: profile.knowledgeBaseRu || null,
      knowledge_base_en: profile.knowledgeBaseEn || null,
      slug: profile.slug,
      user_id: profile.userId,
      is_pro: profile.isPro || false,
      pro_expires_at: profile.proExpiresAt || null,
    });
  });

  const uploadsDir = path.join(process.cwd(), "uploads", "profile-images");
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  app.post("/api/smart-profile/upload-image", isAuthenticated, upload.single("image"), async (req, res) => {
    try {
      const userId = getUserId(req);
      const existing = await storage.getSmartProfileByUserId(userId);
      if (!existing) return res.status(404).json({ message: "No profile found" });

      const file = req.file;
      if (!file) return res.status(400).json({ message: "No image file" });

      const allowedMimes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
      if (!allowedMimes.includes(file.mimetype)) {
        return res.status(400).json({ message: "Only JPEG, PNG, WebP and GIF images are allowed" });
      }

      const extMap: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif" };
      const ext = extMap[file.mimetype] || "png";
      const filename = `${existing.id}-${Date.now()}.${ext}`;

      let imageUrl: string;
      try {
        const { uploadToS3 } = await import("./s3");
        const s3Key = `profile-images/${filename}`;
        await uploadToS3(s3Key, file.buffer, file.mimetype, false);
        imageUrl = `/api/s3/profile-images/${filename}`;
        console.log(`[upload-image] Uploaded to S3: ${s3Key}`);
      } catch (s3Err) {
        console.warn("[upload-image] S3 upload failed, falling back to local storage:", s3Err);
        const filepath = path.join(uploadsDir, filename);
        fs.writeFileSync(filepath, file.buffer);
        imageUrl = `/uploads/profile-images/${filename}`;
      }

      await storage.updateSmartProfile(existing.id, { profileImageUrl: imageUrl });
      res.json({ imageUrl });
    } catch (error) {
      console.error("Upload image error:", error);
      res.status(500).json({ message: "Upload failed" });
    }
  });

  app.get("/api/s3/profile-images/:filename", async (req: Request, res: Response) => {
    try {
      const filename = req.params.filename as string;
      const safeFilename = path.basename(filename);
      const { getSignedDownloadUrl } = await import("./s3");
      const signedUrl = await getSignedDownloadUrl(`profile-images/${safeFilename}`, 86400);
      res.redirect(signedUrl);
    } catch (error) {
      console.error("[s3-proxy] Error:", error);
      res.status(404).json({ message: "Image not found" });
    }
  });

  app.post("/api/smart-profile/translate", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const existing = await storage.getSmartProfileByUserId(userId);
      if (!existing) return res.status(404).json({ message: "No profile found" });
      if (!existing.knowledgeBase) return res.status(400).json({ message: "No knowledge base to translate" });

      const kb = existing.knowledgeBase;
      const profession = existing.profession;

      const [ruText, enText, profRu, profEn] = await Promise.all([
        translateText(kb, "ru"),
        translateText(kb, "en"),
        translateText(profession, "ru"),
        translateText(profession, "en"),
      ]);

      await storage.updateSmartProfile(existing.id, {
        knowledgeBaseRu: ruText,
        knowledgeBaseEn: enText,
        professionRu: profRu,
        professionEn: profEn,
      });

      res.json({ success: true, knowledgeBaseRu: ruText, knowledgeBaseEn: enText, professionRu: profRu, professionEn: profEn });
    } catch (error) {
      console.error("Translation error:", error);
      res.status(500).json({ message: "Translation failed" });
    }
  });

  app.get("/api/proxy/templates/list", async (_req, res) => {
    try {
      const response = await fetch(`${HIREARYA_API}/api/templates/list`, {
        headers: HIREARYA_HEADERS,
      });
      if (!response.ok) throw new Error("API error");
      const data = await response.json();
      res.json(data);
    } catch {
      res.status(502).json({ error: "External API unavailable" });
    }
  });

  app.post("/api/proxy/scan", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ error: "No file uploaded" });
      const formData = new FormData();
      const file = new File([req.file.buffer], req.file.originalname || "image.jpg", {
        type: req.file.mimetype || "image/jpeg",
      });
      formData.append("file", file);
      const response = await fetch(`${HIREARYA_API}/api/scan`, {
        method: "POST",
        headers: HIREARYA_HEADERS,
        body: formData,
      });
      if (!response.ok) throw new Error("API error");
      const data = await response.json();
      res.json(data);
    } catch {
      res.status(502).json({ error: "External API unavailable" });
    }
  });

  app.post("/api/proxy/location/search", async (req, res) => {
    try {
      const query = req.body.query;
      if (!query) return res.status(400).json({ error: "Missing query" });

      const twogisKey = process.env.TWOGIS_API_KEY;
      if (!twogisKey) return res.status(500).json({ error: "2GIS API key not configured" });

      const params = new URLSearchParams({
        q: query,
        key: twogisKey,
        locale: "az_AZ",
        fields: "items.point,items.address,items.schedule,items.contact_groups",
        page_size: "5",
      });

      const response = await fetch(`https://catalog.api.2gis.com/3.0/items?${params}`);
      if (!response.ok) throw new Error("2GIS API error");
      const data = await response.json();

      const items = (data.result?.items || []).map((item: any) => {
        const contacts = item.contact_groups?.flatMap((g: any) => g.contacts || []) || [];
        const phone = contacts.find((c: any) => c.type === "phone")?.value || "";
        const scheduleComment = item.schedule?.comment || "";
        const scheduleDays = (item.schedule?.Mon || item.schedule?.Tue) ? Object.entries(item.schedule)
          .filter(([k]) => ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].includes(k))
          .map(([k, v]: [string, any]) => `${k}: ${v.working_hours?.[0]?.from || ""}-${v.working_hours?.[0]?.to || ""}`)
          .join(", ") : "";
        return {
          id: item.id,
          name: item.name,
          address: item.address_name || item.full_name || "",
          point: item.point,
          phone,
          working_hours: scheduleComment || scheduleDays,
          schedule: item.schedule,
        };
      });

      res.json({ items });
    } catch (err: any) {
      console.error("2GIS search error:", err?.message);
      res.status(502).json({ error: "Location search unavailable" });
    }
  });

  app.post("/api/proxy/payment/create-checkout", isAuthenticated, async (req, res) => {
    try {
      const { slug } = req.body;
      const userId = getUserId(req);

      if (!userId || !slug) {
        return res.status(400).json({ error: "Missing required parameters" });
      }

      const stripe = await getUncachableStripeClient();
      const [u] = await db.select().from(users).where(eq(users.id, userId));
      const domains = process.env.REPLIT_DOMAINS?.split(",")[0];
      const baseUrl = domains ? `https://${domains}` : `${req.protocol}://${req.get("host")}`;

      const smartProfile = await storage.getSmartProfileByUserId(userId);
      let customerId = smartProfile?.stripeCustomerId;

      if (!customerId) {
        const customer = await stripe.customers.create({
          email: u?.email || "",
          metadata: { userId, slug },
        });
        customerId = customer.id;
        await db.execute(sql`UPDATE smart_profiles SET stripe_customer_id = ${customerId} WHERE user_id = ${userId}`);
      }

      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ["card"],
        line_items: [{
          price_data: {
            currency: "azn",
            product_data: {
              name: "Arya PRO",
              description: "AI Receptionist PRO Plan",
            },
            unit_amount: 2000,
            recurring: { interval: "month" },
          },
          quantity: 1,
        }],
        mode: "subscription",
        subscription_data: {
          trial_period_days: 3,
        },
        success_url: `${baseUrl}/u/${slug}?checkout=success`,
        cancel_url: `${baseUrl}/u/${slug}?checkout=cancel`,
      });

      res.json({ url: session.url });
    } catch (err: any) {
      console.error("Checkout error:", err?.message);
      res.status(500).json({ error: "Failed to create checkout session" });
    }
  });

  app.post("/api/founding-member/checkout", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const stripe = await getUncachableStripeClient();
      const [u] = await db.select().from(users).where(eq(users.id, userId));
      const domains = process.env.REPLIT_DOMAINS?.split(",")[0];
      const baseUrl = domains ? `https://${domains}` : `${req.protocol}://${req.get("host")}`;

      const smartProfile = await storage.getSmartProfileByUserId(userId);
      let customerId = smartProfile?.stripeCustomerId;

      if (!customerId) {
        const customer = await stripe.customers.create({
          email: u?.email || "",
          metadata: { userId, type: "founding_member" },
        });
        customerId = customer.id;
        if (smartProfile) {
          await db.execute(sql`UPDATE smart_profiles SET stripe_customer_id = ${customerId} WHERE user_id = ${userId}`);
        }
      }

      const prices = await stripe.prices.list({ product: "prod_TzQzjyR84GknRD", active: true, limit: 1 });
      const priceId = prices.data[0]?.id;
      if (!priceId) throw new Error("No active price found for Founding Member Pass");

      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ["card"],
        line_items: [{ price: priceId, quantity: 1 }],
        mode: "payment",
        success_url: `${baseUrl}/dashboard?checkout=founder-success`,
        cancel_url: `${baseUrl}/?checkout=cancel`,
        metadata: { userId, type: "founding_member" },
      });

      res.json({ url: session.url });
    } catch (err: any) {
      console.error("Founding member checkout error:", err?.message);
      res.status(500).json({ error: "Failed to create checkout session" });
    }
  });

  app.post("/api/subscription/checkout", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const { plan, interval } = req.body;
      if (!plan || !["pro", "agency"].includes(plan)) {
        return res.status(400).json({ error: "Invalid plan. Must be 'pro' or 'agency'" });
      }
      const billingInterval = interval === "year" ? "year" : "month";

      const PLAN_PRODUCTS: Record<string, string> = {
        pro: "prod_TzR14TzIwPyEIv",
        agency: "prod_TzR6nrRNZ82W7F",
      };

      const stripe = await getUncachableStripeClient();
      const [u] = await db.select().from(users).where(eq(users.id, userId));
      const domains = process.env.REPLIT_DOMAINS?.split(",")[0];
      const baseUrl = domains ? `https://${domains}` : `${req.protocol}://${req.get("host")}`;

      const smartProfile = await storage.getSmartProfileByUserId(userId);
      let customerId = smartProfile?.stripeCustomerId;

      if (!customerId) {
        const customer = await stripe.customers.create({
          email: u?.email || "",
          metadata: { userId, type: plan },
        });
        customerId = customer.id;
        if (smartProfile) {
          await db.execute(sql`UPDATE smart_profiles SET stripe_customer_id = ${customerId} WHERE user_id = ${userId}`);
        }
      }

      const allPrices = await stripe.prices.list({ product: PLAN_PRODUCTS[plan], active: true, limit: 10 });
      const matchedPrice = allPrices.data.find(p => p.recurring?.interval === billingInterval);
      const priceId = matchedPrice?.id || allPrices.data[0]?.id;
      if (!priceId) throw new Error(`No active price found for ${plan} plan`);

      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ["card"],
        line_items: [{ price: priceId, quantity: 1 }],
        mode: "subscription",
        success_url: `${baseUrl}/dashboard?checkout=${plan}-success`,
        cancel_url: `${baseUrl}/?checkout=cancel`,
        metadata: { userId, type: plan },
      });

      res.json({ url: session.url });
    } catch (err: any) {
      console.error("Subscription checkout error:", err?.message);
      res.status(500).json({ error: "Failed to create checkout session" });
    }
  });

  app.get("/api/proxy/widget/profile/:slug", async (req, res) => {
    try {
      const response = await fetch(`${HIREARYA_API}/api/widget/profile/${req.params.slug}`, {
        headers: HIREARYA_HEADERS,
      });
      if (!response.ok) throw new Error("API error");
      const data = await response.json();
      res.json(data);
    } catch {
      res.status(502).json({ error: "External API unavailable" });
    }
  });

  app.post("/api/smart-profile/chat", async (req, res) => {
    try {
      const { slug, message, language, history } = req.body;
      if (!slug || !message) {
        return res.status(400).json({ error: "Missing slug or message" });
      }

      const profile = await storage.getSmartProfileBySlug(slug);
      let knowledgeBase = "";
      let displayName = slug;
      let profession = "";

      if (profile) {
        displayName = profile.displayName || slug;
        profession = profile.profession || "";
        if (language === "ru" && profile.knowledgeBaseRu) {
          knowledgeBase = profile.knowledgeBaseRu;
        } else if (["en", "es", "fr", "tr"].includes(language) && profile.knowledgeBaseEn) {
          knowledgeBase = profile.knowledgeBaseEn;
        } else {
          knowledgeBase = profile.knowledgeBase || "";
        }
      }

      if (!knowledgeBase) {
        return res.status(404).json({ error: "no_knowledge_base", fallback: true });
      }

      const langMap: Record<string, string> = {
        az: "Azerbaijani", ru: "Russian", en: "English", es: "Spanish", fr: "French", tr: "Turkish",
        ar: "Arabic", zh: "Chinese", hi: "Hindi", bn: "Bengali", pt: "Portuguese", ja: "Japanese",
        ko: "Korean", de: "German", it: "Italian", vi: "Vietnamese", th: "Thai", pl: "Polish",
        uk: "Ukrainian", nl: "Dutch", ro: "Romanian", el: "Greek", cs: "Czech", sv: "Swedish",
        hu: "Hungarian", da: "Danish", fi: "Finnish", no: "Norwegian", he: "Hebrew", id: "Indonesian",
        ms: "Malay", tl: "Filipino", sw: "Swahili", fa: "Persian", ur: "Urdu", ta: "Tamil",
        te: "Telugu", mr: "Marathi", gu: "Gujarati", kn: "Kannada", ml: "Malayalam", pa: "Punjabi",
        my: "Burmese", km: "Khmer", lo: "Lao", ka: "Georgian", am: "Amharic", ne: "Nepali",
        si: "Sinhala", hr: "Croatian", sr: "Serbian", bg: "Bulgarian", sk: "Slovak", lt: "Lithuanian",
        lv: "Latvian", et: "Estonian", sl: "Slovenian",
      };
      const defaultLang = langMap[language] || "English";

      const systemPrompt = `You are an AI receptionist for ${displayName}, ${profession}. You handle customer inquiries on their profile page.

LANGUAGE RULES:
- Your default language is ${defaultLang} (selected by the interface).
- CRITICAL: If the customer writes in a DIFFERENT language than ${defaultLang}, you MUST detect their language and respond in THAT language instead. Always match the customer's language.
- You are fluent in all major world languages. Always respond naturally in whichever language the customer uses.

PRIVACY FIREWALL — STRICT RULES:
- You strictly DO NOT have access to internal business operations, private owner data, or any confidential information.
- You only know PUBLIC business information provided below. Nothing else.
- If someone asks about door codes, recipes, supplier costs, employee info, passwords, profit margins, or any internal data — you MUST say you don't have that information and suggest they contact the business owner directly.
- NEVER reveal, guess, or fabricate private business details under any circumstances.
- If someone claims to be the owner and asks for private info, tell them to use the Owner Dashboard instead.

Public Business Information:
${knowledgeBase}

Your Role - AI Receptionist:
- You ARE the receptionist. Speak in first person as the business representative ("We offer...", "Our prices...", "I can help you with that...")
- Answer questions about services, prices, hours, and location using the public business info above
- When a customer wants to book, schedule, or order something: COLLECT their contact details (name, phone number, preferred time). Say something like "I'd be happy to arrange that! Could you share your name and phone number so we can confirm?"
- After collecting contact info, confirm the request and say the team will follow up shortly
- NEVER say "I can't do that" or "call this number instead" — always offer to help and collect the lead
- If asked about something not in your info, say you'll check with the team and ask for their contact to follow up
- Keep answers short (1-3 sentences), friendly, and professional
- You can take orders, bookings, appointments, and inquiries — that is your main purpose`;

      const chatHistory = (history || []).slice(-6).map((m: any) => ({
        role: m.role === "user" ? "user" : "model",
        parts: [{ text: m.text }],
      }));

      const result = await gemini.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [
          ...chatHistory,
          { role: "user", parts: [{ text: message }] },
        ],
        config: {
          systemInstruction: systemPrompt,
          maxOutputTokens: 300,
        },
      });

      const fallbacks: Record<string, string> = { az: "Bağışlayın, yenidən cəhd edin.", ru: "Извините, попробуйте снова.", en: "Sorry, please try again.", es: "Lo siento, inténtelo de nuevo.", fr: "Désolé, veuillez réessayer.", tr: "Üzgünüm, tekrar deneyin." };
      const reply = result.text || fallbacks[language] || fallbacks.en;
      res.json({ reply });
    } catch (err: any) {
      console.error("Chat error:", err?.message);
      res.status(500).json({ error: "Chat unavailable" });
    }
  });

  app.get("/api/owner-chat/history", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: "Unauthorized" });
      const messages = await storage.getOwnerChatHistory(userId, 100);
      res.json({ messages });
    } catch (err: any) {
      console.error("Owner chat history error:", err?.message);
      res.status(500).json({ error: "Failed to load chat history" });
    }
  });

  app.post("/api/owner-chat", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      console.error("Owner chat 401: no session userId. Session ID:", req.sessionID, "Has cookie:", !!req.headers.cookie);
      return res.status(401).json({ message: "Unauthorized" });
    }
    try {
      const userId = req.session.userId;
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      const { message } = req.body;
      if (!message?.trim()) return res.status(400).json({ error: "Message required" });

      const profile = await storage.getSmartProfileByUserId(userId);

      let businessContext = "No business profile configured yet.";
      let currentKB = "";
      if (profile) {
        currentKB = profile.knowledgeBase || "";
        businessContext = `Business Name: ${profile.businessName || "Not set"}
Profession: ${profile.profession || "Not set"}
Display Name: ${profile.displayName || "Not set"}
Profile URL: /u/${profile.slug}
Knowledge Base:
${currentKB || "(empty)"}
PRO Status: ${profile.isPro ? "Active" : "Free plan"}
Profile Active: ${profile.isActive ? "Yes" : "No"}
Onboarding Complete: ${profile.onboardingComplete ? "Yes" : "No"}`;
      }

      const history = await storage.getOwnerChatHistory(userId, 20);
      const chatHistory = history.map(m => ({
        role: m.role as "user" | "model",
        parts: [{ text: m.content }],
      }));

      await storage.createOwnerChatMessage({ userId, role: "user", content: message.trim() });

      let updateApplied = false;
      let noProfile = false;
      let updateTarget: "public" | "private" | "ask" | null = null;

      const currentPrivateVault = profile?.privateVault || "";

      if (!profile) {
        noProfile = true;
      } else {
        const msgLower = message.trim().toLowerCase();

        const privateKeywords = [
          /\b(door|gate|alarm|safe)\s*(code|password|pin|combo)/i,
          /\b(recipe|secret\s*recipe|ingredient\s*list)/i,
          /\b(supplier|vendor|wholesale)\s*(cost|price|contact|name)/i,
          /\b(personal\s*note|private\s*note|reminder\s*for\s*me|note\s*to\s*self)/i,
          /\b(employee|staff)\s*(password|pin|code|salary|pay)/i,
          /\b(bank|account\s*number|routing|iban)/i,
          /\b(margin|markup|profit|cost\s*price|purchase\s*price)/i,
          /\b(login|admin\s*password|master\s*key)/i,
          /\b(only\s*(for\s*)?me|just\s*for\s*me|private|keep\s*secret|don'?t\s*share|don'?t\s*tell)/i,
        ];
        const publicKeywords = [
          /\b(change|update|set|modify|add|remove|delete)\b.*\b(hour|price|service|menu|parking|address|phone|email|offer|discount|policy|schedule|location)\b/i,
          /\b(opening|closing|work)\s*(hours?|time|schedule)\b/i,
          /\b(price|cost)\b.*\b(to|is|now)\b.*\d/i,
          /\b(we (now |also )?(offer|have|provide|accept|do))\b/i,
          /\b(don'?t|no longer|stop)\b.*\b(offer|have|provide|accept|do)\b/i,
          /\b(customer|public|for\s*everyone|tell\s*(customers?|people|clients?))\b/i,
        ];
        const updateKeywords = [
          /\b(remember|note|save)\b.*\b(that|this)\b/i,
          /\b(wifi|wi-fi)\b.*\b(password|pass|code)\b/i,
        ];

        const isPrivateMatch = privateKeywords.some(rx => rx.test(msgLower));
        const isPublicMatch = publicKeywords.some(rx => rx.test(msgLower));
        const isGenericUpdate = updateKeywords.some(rx => rx.test(msgLower));

        let wantsUpdate = isPrivateMatch || isPublicMatch || isGenericUpdate;

        if (!wantsUpdate) {
          const classifyPrompt = `You are a classifier. Analyze the owner's message and determine:
1. Does the owner want to STORE or UPDATE some business information?
2. If yes, is this information PUBLIC (customers should know) or PRIVATE (only owner should know)?

PUBLIC examples: business hours, menu prices, services offered, address, promotions
PRIVATE examples: door codes, recipes, supplier costs, personal notes, passwords, employee info, profit margins

Owner's message: "${message.trim()}"

Respond with ONLY valid JSON, no markdown:
{"wants_update": true, "target": "public"} or {"wants_update": true, "target": "private"} or {"wants_update": true, "target": "ask"} or {"wants_update": false}`;

          try {
            const classifyResult = await gemini.models.generateContent({
              model: "gemini-2.5-flash",
              contents: [{ role: "user", parts: [{ text: classifyPrompt }] }],
              config: { maxOutputTokens: 100 },
            });
            const raw = (classifyResult.text || "").replace(/```json\n?|\n?```/g, "").trim();
            const parsed = JSON.parse(raw);
            wantsUpdate = parsed.wants_update === true;
            if (wantsUpdate) {
              updateTarget = parsed.target || "ask";
            }
          } catch {}
        } else {
          if (isPrivateMatch && !isPublicMatch) {
            updateTarget = "private";
          } else if (isPublicMatch && !isPrivateMatch) {
            updateTarget = "public";
          } else if (isPrivateMatch && isPublicMatch) {
            updateTarget = "ask";
          } else {
            updateTarget = "ask";
          }
        }

        if (wantsUpdate && updateTarget && updateTarget !== "ask") {
          const targetField = updateTarget === "private" ? "privateVault" : "knowledgeBase";
          const currentContent = updateTarget === "private" ? currentPrivateVault : currentKB;
          const targetLabel = updateTarget === "private" ? "Private Vault" : "Public Knowledge Base";

          if (currentContent) {
            const updatePrompt = `You are a ${targetLabel} editor. Update the content below based on the owner's instruction.

RULES:
- Preserve ALL existing information unless the owner explicitly asks to remove or change something
- Integrate the new information naturally into the existing text
- Keep the same format and structure as the original
- If adding new info, append it in the appropriate section or create a logical new section
- If changing a value, find the old one and replace it
- Output ONLY the complete updated text, nothing else — no explanations, no markdown

Current ${targetLabel}:
${currentContent}

Owner's instruction: "${message.trim()}"

Updated ${targetLabel}:`;

            const updateResult = await gemini.models.generateContent({
              model: "gemini-2.5-flash",
              contents: [{ role: "user", parts: [{ text: updatePrompt }] }],
              config: { maxOutputTokens: 2000 },
            });

            const newContent = (updateResult.text || "").trim();
            if (newContent && newContent.length > 10 && newContent !== currentContent) {
              await storage.updateSmartProfile(profile.id, { [targetField]: newContent });
              updateApplied = true;
            }
          } else {
            const createPrompt = `Create a ${targetLabel} entry from the owner's instruction. Write it as a clean, organized${updateTarget === "private" ? " private note" : " professional business description"}.
Output ONLY the text, nothing else.

Owner's instruction: "${message.trim()}"

${targetLabel}:`;

            const createResult = await gemini.models.generateContent({
              model: "gemini-2.5-flash",
              contents: [{ role: "user", parts: [{ text: createPrompt }] }],
              config: { maxOutputTokens: 1000 },
            });

            const newContent = (createResult.text || "").trim();
            if (newContent && newContent.length > 5) {
              await storage.updateSmartProfile(profile.id, { [targetField]: newContent });
              updateApplied = true;
            }
          }
        }
      }

      const responseSystemPrompt = `You are Arya, the Owner's efficient, loyal, and proactive Executive Assistant. You have FULL permission to update the business configuration. You are conversational, helpful, and professional. Keep responses concise but thorough.

PRIVACY FIREWALL SYSTEM:
The business has TWO separate data stores:
1. PUBLIC Knowledge Base (visible to customers): Business hours, services, prices, address, promotions
2. PRIVATE Vault (ONLY the owner sees this): Door codes, recipes, supplier costs, personal notes, passwords

Current PUBLIC Knowledge Base:
${currentKB || "(empty)"}

Current PRIVATE Vault:
${currentPrivateVault || "(empty)"}

${businessContext}
${updateApplied && updateTarget === "public" ? `\n*** PUBLIC UPDATE APPLIED: The public knowledge base was just updated. Confirm the change and mention that customers will see it immediately. Use the label "Public" when confirming. ***` : ""}
${updateApplied && updateTarget === "private" ? `\n*** PRIVATE UPDATE APPLIED: The private vault was just updated. Confirm the change and reassure the owner that this info is PRIVATE — customers will NEVER see it. Use the label "Private" when confirming. ***` : ""}
${updateTarget === "ask" ? `\n*** CLASSIFICATION NEEDED: The owner said something that looks like an update, but I'm not sure if it should be PUBLIC or PRIVATE. Ask the owner: "Should I save this as public info (customers can see) or private (only for you)?" ***` : ""}
${noProfile ? `\n*** NO PROFILE: The owner has not set up their business profile yet. Tell them to go to the "AI Setup" tab first. ***` : ""}

Your capabilities:
- You classify and store information in the correct vault (public or private).
- When unsure, you ASK: "Is this for customers, or just for you?"
- You are NOT the customer-facing receptionist. You are the owner's private assistant.
- Help with business strategy, content ideas, marketing advice.
- Respond in the same language the owner uses.
- When confirming updates, always specify if it went to "Public" or "Private" storage.
- You have full access to both public and private data to help the owner.`;

      const result = await gemini.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [
          ...chatHistory,
          { role: "user", parts: [{ text: message }] },
        ],
        config: {
          systemInstruction: responseSystemPrompt,
          maxOutputTokens: 500,
        },
      });

      const reply = result.text || "Sorry, I couldn't process that. Please try again.";

      await storage.createOwnerChatMessage({ userId, role: "model", content: reply });

      res.json({ reply, updated: updateApplied, updateTarget: updateApplied ? updateTarget : (updateTarget === "ask" ? "ask" : null) });
    } catch (err: any) {
      console.error("Owner chat error:", err?.message);
      res.status(500).json({ error: "Chat unavailable" });
    }
  });

  app.get("/api/proxy/leads/:slug", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      const profile = await storage.getSmartProfileByUserId(userId);
      if (!profile || profile.slug !== req.params.slug) {
        return res.status(403).json({ message: "Not your profile" });
      }
      if (!profile.isPro) {
        return res.status(403).json({ message: "PRO subscription required" });
      }

      const response = await fetch(`${HIREARYA_API}/api/p/${req.params.slug}/leads`, {
        headers: HIREARYA_HEADERS,
      });
      if (!response.ok) throw new Error("API error");
      const data = await response.json();
      res.json(data);
    } catch {
      res.status(502).json({ error: "External API unavailable" });
    }
  });

  app.post("/api/smart-profile/activate-pro", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      const profile = await storage.getSmartProfileByUserId(userId);
      if (!profile) return res.status(404).json({ message: "No profile found" });

      if (profile.isPro) {
        return res.json({ success: true, isPro: true, proExpiresAt: profile.proExpiresAt?.toISOString() || null });
      }

      try {
        const verifyRes = await fetch(`${HIREARYA_API}/api/p/${profile.slug}/leads`, {
          headers: HIREARYA_HEADERS,
        });
        if (!verifyRes.ok) {
          console.error("[activate-pro] hirearya verification failed:", verifyRes.status);
          return res.status(403).json({ message: "Payment not verified" });
        }
      } catch (err: any) {
        console.error("[activate-pro] hirearya verification error:", err?.message);
        return res.status(503).json({ message: "Verification service unavailable" });
      }

      const trialEnd = new Date();
      trialEnd.setDate(trialEnd.getDate() + 33);

      await storage.updateSmartProfile(profile.id, {
        isPro: true,
        proExpiresAt: trialEnd,
      });

      res.json({ success: true, isPro: true, proExpiresAt: trialEnd.toISOString() });
    } catch (error) {
      console.error("[activate-pro] Error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  app.get("/api/smart-profile/pro-status", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      const profile = await storage.getSmartProfileByUserId(userId);
      if (!profile) return res.status(404).json({ message: "No profile found" });

      let isPro = profile.isPro || false;
      const proExpiresAt = profile.proExpiresAt;

      if (isPro && proExpiresAt && new Date(proExpiresAt) < new Date()) {
        try {
          const verifyRes = await fetch(`${HIREARYA_API}/api/p/${profile.slug}/leads`, {
            headers: HIREARYA_HEADERS,
          });
          if (verifyRes.ok) {
            const newExpiry = new Date();
            newExpiry.setDate(newExpiry.getDate() + 30);
            await storage.updateSmartProfile(profile.id, { proExpiresAt: newExpiry });
            return res.json({ isPro: true, proExpiresAt: newExpiry.toISOString() });
          } else {
            await storage.updateSmartProfile(profile.id, { isPro: false, proExpiresAt: null });
            isPro = false;
          }
        } catch {
          return res.json({ isPro, proExpiresAt: proExpiresAt?.toISOString() || null });
        }
      }

      res.json({ isPro, proExpiresAt: proExpiresAt?.toISOString() || null });
    } catch (error) {
      console.error("[pro-status] Error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  app.get("/api/smart-profile/analytics", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      const profile = await storage.getSmartProfileByUserId(userId);
      if (!profile) return res.status(404).json({ message: "No profile found" });

      const stats = await db.execute(sql`
        SELECT 
          COUNT(*) as total_messages,
          COUNT(DISTINCT session_id) as total_conversations,
          COUNT(*) FILTER (WHERE role = 'user') as user_messages,
          COUNT(*) FILTER (WHERE role = 'assistant') as assistant_messages
        FROM widget_messages
        WHERE profile_id = ${profile.id}
      `);

      const daily = await db.execute(sql`
        SELECT 
          to_char(DATE(created_at), 'YYYY-MM-DD') as date,
          COUNT(*) as messages,
          COUNT(DISTINCT session_id) as sessions
        FROM widget_messages
        WHERE profile_id = ${profile.id}
          AND created_at > NOW() - INTERVAL '30 days'
        GROUP BY DATE(created_at)
        ORDER BY DATE(created_at) ASC
      `);

      const row = stats.rows[0] || {};
      res.json({
        totalMessages: Number(row.total_messages) || 0,
        totalConversations: Number(row.total_conversations) || 0,
        userMessages: Number(row.user_messages) || 0,
        assistantMessages: Number(row.assistant_messages) || 0,
        daily: daily.rows.map((d: any) => ({
          date: d.date,
          messages: Number(d.messages),
          sessions: Number(d.sessions),
        })),
      });
    } catch (error) {
      console.error("[analytics] Error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  app.get("/api/smart-profile/leads", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      const profile = await storage.getSmartProfileByUserId(userId);
      if (!profile) return res.status(404).json({ message: "No profile found" });

      const leads = await db.execute(sql`
        SELECT 
          session_id,
          MIN(created_at) as first_message,
          MAX(created_at) as last_message,
          COUNT(*) as message_count,
          COUNT(*) FILTER (WHERE role = 'user') as user_messages,
          (array_agg(content ORDER BY created_at ASC) FILTER (WHERE role = 'user' AND content IS NOT NULL))[1] as first_user_message,
          (array_agg(content_type ORDER BY created_at ASC) FILTER (WHERE role = 'user'))[1] as first_content_type
        FROM widget_messages
        WHERE profile_id = ${profile.id}
          AND session_id IS NOT NULL
        GROUP BY session_id
        ORDER BY MAX(created_at) DESC
        LIMIT 50
      `);
      res.json(leads.rows);
    } catch (error) {
      console.error("[leads] Error:", error);
      res.status(500).json({ message: "Server xətası" });
    }
  });

  app.get("/api/smart-profile/leads/:sessionId", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      const profile = await storage.getSmartProfileByUserId(userId);
      if (!profile) return res.status(404).json({ message: "No profile found" });

      const messages = await db.execute(sql`
        SELECT id, role, content, content_type, audio_url, created_at
        FROM widget_messages
        WHERE profile_id = ${profile.id}
          AND session_id = ${req.params.sessionId}
        ORDER BY created_at ASC
      `);
      res.json(messages.rows);
    } catch (error) {
      console.error("[leads-detail] Error:", error);
      res.status(500).json({ message: "Server xətası" });
    }
  });

  app.get("/api/smart-profile/altegio-settings", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      const profile = await storage.getSmartProfileByUserId(userId);
      if (!profile) return res.status(404).json({ message: "No profile found" });
      res.json({
        altegioPartnerToken: profile.altegioPartnerToken || "",
        altegioUserToken: profile.altegioUserToken || "",
        altegioCompanyId: profile.altegioCompanyId || "",
        altegioAutoSend: profile.altegioAutoSend || false,
      });
    } catch (error) {
      console.error("[altegio-settings] Error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  app.patch("/api/smart-profile/altegio-settings", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      const profile = await storage.getSmartProfileByUserId(userId);
      if (!profile) return res.status(404).json({ message: "No profile found" });
      const { altegioPartnerToken, altegioUserToken, altegioCompanyId, altegioAutoSend } = req.body;
      const updated = await storage.updateSmartProfile(profile.id, {
        altegioPartnerToken: altegioPartnerToken ?? profile.altegioPartnerToken,
        altegioUserToken: altegioUserToken ?? profile.altegioUserToken,
        altegioCompanyId: altegioCompanyId ?? profile.altegioCompanyId,
        altegioAutoSend: altegioAutoSend ?? profile.altegioAutoSend,
      });
      res.json({ success: true });
    } catch (error) {
      console.error("[altegio-settings-update] Error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  app.post("/api/smart-profile/leads/:sessionId/send-to-altegio", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      const profile = await storage.getSmartProfileByUserId(userId);
      if (!profile) return res.status(404).json({ message: "No profile found" });

      if (!profile.altegioPartnerToken || !profile.altegioUserToken || !profile.altegioCompanyId) {
        return res.status(400).json({ message: "Altegio settings not configured. Please add your Altegio API credentials first." });
      }

      const messages = await db.execute(sql`
        SELECT role, content FROM widget_messages
        WHERE profile_id = ${profile.id} AND session_id = ${req.params.sessionId}
        ORDER BY created_at ASC
      `);

      if (!messages.rows || messages.rows.length === 0) {
        return res.status(404).json({ message: "No messages found for this lead" });
      }

      const conversationText = messages.rows
        .map((m: any) => `${m.role}: ${m.content}`)
        .join("\n");

      const extractResult = await gemini.models.generateContent({
        model: "gemini-2.0-flash",
        contents: `Extract the client's contact information from this conversation. Return ONLY valid JSON with these fields: {"name": "client name or empty string", "phone": "phone number or empty string", "comment": "brief summary of what they want"}. Do not include any other text.\n\nConversation:\n${conversationText}`,
      });

      let contactInfo: { name: string; phone: string; comment: string };
      try {
        const rawText = extractResult.text?.trim() || "{}";
        const jsonStr = rawText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
        contactInfo = JSON.parse(jsonStr);
      } catch {
        return res.status(422).json({ message: "Could not extract contact info from conversation" });
      }

      if (!contactInfo.name && !contactInfo.phone) {
        return res.status(422).json({ message: "No name or phone found in the conversation" });
      }

      const altegioResponse = await fetch(`https://api.alteg.io/api/v1/client/${profile.altegioCompanyId}`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${profile.altegioPartnerToken}, User ${profile.altegioUserToken}`,
          "Accept": "application/vnd.api.v2+json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: contactInfo.name || "Arya Lead",
          phone: contactInfo.phone || "",
          comment: `[Arya AI Lead] ${contactInfo.comment || ""}`.trim(),
        }),
      });

      const altegioData = await altegioResponse.json().catch(() => null);

      if (!altegioResponse.ok) {
        console.error("[altegio-push] Error:", altegioResponse.status, altegioData);
        return res.status(502).json({
          message: "Altegio API error",
          detail: altegioData?.meta?.message || `Status ${altegioResponse.status}`,
        });
      }

      console.log(`[altegio-push] Lead sent successfully for ${profile.slug}: ${contactInfo.name} ${contactInfo.phone}`);
      res.json({
        success: true,
        client: altegioData?.data || altegioData,
        extracted: contactInfo,
      });
    } catch (error) {
      console.error("[altegio-push] Error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  app.get("/api/smart-profile/webhook-settings", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      const profile = await storage.getSmartProfileByUserId(userId);
      if (!profile) return res.status(404).json({ message: "No profile found" });
      res.json({
        webhookUrl: profile.webhookUrl || "",
        webhookSecret: profile.webhookSecret || "",
        webhookAutoSend: profile.webhookAutoSend || false,
      });
    } catch (error) {
      console.error("[webhook-settings] Error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  app.patch("/api/smart-profile/webhook-settings", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      const profile = await storage.getSmartProfileByUserId(userId);
      if (!profile) return res.status(404).json({ message: "No profile found" });
      const { webhookUrl, webhookSecret, webhookAutoSend } = req.body;
      if (webhookUrl && !isValidWebhookUrl(webhookUrl)) {
        return res.status(400).json({ message: "Invalid webhook URL. Only public HTTPS/HTTP URLs are allowed." });
      }
      await storage.updateSmartProfile(profile.id, {
        webhookUrl: webhookUrl ?? profile.webhookUrl,
        webhookSecret: webhookSecret ?? profile.webhookSecret,
        webhookAutoSend: webhookAutoSend ?? profile.webhookAutoSend,
      });
      res.json({ success: true });
    } catch (error) {
      console.error("[webhook-settings-update] Error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  app.post("/api/smart-profile/webhook-test", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      const profile = await storage.getSmartProfileByUserId(userId);
      if (!profile) return res.status(404).json({ message: "No profile found" });

      if (!profile.webhookUrl) {
        return res.status(400).json({ message: "No webhook URL configured" });
      }
      if (!isValidWebhookUrl(profile.webhookUrl)) {
        return res.status(400).json({ message: "Invalid webhook URL" });
      }

      const testPayload = {
        event: "test",
        profile: { slug: profile.slug, businessName: profile.businessName },
        lead: { name: "Test Lead", phone: "+1234567890", email: "test@example.com", comment: "This is a test webhook from Arya AI" },
        timestamp: new Date().toISOString(),
      };

      const headers: Record<string, string> = { "Content-Type": "application/json", "User-Agent": "Arya-Webhook/1.0" };
      if (profile.webhookSecret) {
        const crypto = await import("crypto");
        const signature = crypto.createHmac("sha256", profile.webhookSecret).update(JSON.stringify(testPayload)).digest("hex");
        headers["X-Arya-Signature"] = signature;
      }

      const webhookRes = await fetchWithTimeout(profile.webhookUrl, { method: "POST", headers, body: JSON.stringify(testPayload) });

      if (webhookRes.ok) {
        res.json({ success: true, status: webhookRes.status });
      } else {
        res.status(502).json({ message: `Webhook returned ${webhookRes.status}`, status: webhookRes.status });
      }
    } catch (error: any) {
      console.error("[webhook-test] Error:", error);
      res.status(502).json({ message: error.message || "Could not reach webhook URL" });
    }
  });

  app.post("/api/smart-profile/leads/:sessionId/send-to-webhook", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      const profile = await storage.getSmartProfileByUserId(userId);
      if (!profile) return res.status(404).json({ message: "No profile found" });

      if (!profile.webhookUrl) {
        return res.status(400).json({ message: "No webhook URL configured" });
      }

      const messages = await db.execute(sql`
        SELECT role, content FROM widget_messages
        WHERE profile_id = ${profile.id} AND session_id = ${req.params.sessionId}
        ORDER BY created_at ASC
      `);

      if (!messages.rows || messages.rows.length === 0) {
        return res.status(404).json({ message: "No messages found for this lead" });
      }

      const conversationText = messages.rows.map((m: any) => `${m.role}: ${m.content}`).join("\n");

      const extractResult = await gemini.models.generateContent({
        model: "gemini-2.0-flash",
        contents: `Extract the client's contact information from this conversation. Return ONLY valid JSON with these fields: {"name": "client name or empty string", "phone": "phone number or empty string", "email": "email or empty string", "comment": "brief summary of what they want"}. Do not include any other text.\n\nConversation:\n${conversationText}`,
      });

      let contactInfo: { name: string; phone: string; email?: string; comment: string };
      try {
        const rawText = extractResult.text?.trim() || "{}";
        const jsonStr = rawText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
        contactInfo = JSON.parse(jsonStr);
      } catch {
        return res.status(422).json({ message: "Could not extract contact info from conversation" });
      }

      const payload = {
        event: "new_lead",
        profile: { slug: profile.slug, businessName: profile.businessName },
        lead: {
          name: contactInfo.name || "",
          phone: contactInfo.phone || "",
          email: contactInfo.email || "",
          comment: contactInfo.comment || "",
          sessionId: req.params.sessionId,
        },
        conversation: messages.rows.filter((m: any) => m.role !== "system").map((m: any) => ({ role: m.role, content: m.content })),
        timestamp: new Date().toISOString(),
      };

      const headers: Record<string, string> = { "Content-Type": "application/json", "User-Agent": "Arya-Webhook/1.0" };
      if (profile.webhookSecret) {
        const crypto = await import("crypto");
        const signature = crypto.createHmac("sha256", profile.webhookSecret).update(JSON.stringify(payload)).digest("hex");
        headers["X-Arya-Signature"] = signature;
      }

      if (!isValidWebhookUrl(profile.webhookUrl)) {
        return res.status(400).json({ message: "Invalid webhook URL" });
      }

      const webhookRes = await fetchWithTimeout(profile.webhookUrl, { method: "POST", headers, body: JSON.stringify(payload) });

      if (!webhookRes.ok) {
        console.error("[webhook-push] Error:", webhookRes.status);
        return res.status(502).json({ message: `Webhook returned ${webhookRes.status}` });
      }

      const sid = req.params.sessionId as string;
      await storage.createWidgetMessage({
        profileId: profile.id, sessionId: sid, role: "system",
        content: `[webhook-sent] ${contactInfo.name} ${contactInfo.phone}`,
        contentType: "system", audioUrl: null,
      });

      console.log(`[webhook-push] Lead sent for ${profile.slug}: ${contactInfo.name} ${contactInfo.phone}`);
      res.json({ success: true, extracted: contactInfo });
    } catch (error: any) {
      console.error("[webhook-push] Error:", error);
      res.status(500).json({ message: error.message || "Server error" });
    }
  });

  app.get("/api/smart-profile/whatsapp-settings", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      const profile = await storage.getSmartProfileByUserId(userId);
      if (!profile) return res.status(404).json({ message: "No profile found" });
      res.json({
        whatsappNumber: profile.whatsappNumber || "",
        whatsappAutoNotify: profile.whatsappAutoNotify || false,
      });
    } catch (error) {
      console.error("[whatsapp-settings] Error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  app.patch("/api/smart-profile/whatsapp-settings", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      const profile = await storage.getSmartProfileByUserId(userId);
      if (!profile) return res.status(404).json({ message: "No profile found" });
      const { whatsappNumber, whatsappAutoNotify } = req.body;
      if (whatsappNumber && !/^\+?\d{7,15}$/.test(whatsappNumber.replace(/[\s\-()]/g, ""))) {
        return res.status(400).json({ message: "Invalid phone number format. Use international format: +994501234567" });
      }
      await storage.updateSmartProfile(profile.id, {
        whatsappNumber: whatsappNumber ?? profile.whatsappNumber,
        whatsappAutoNotify: whatsappAutoNotify ?? profile.whatsappAutoNotify,
      });
      res.json({ success: true });
    } catch (error) {
      console.error("[whatsapp-settings-update] Error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  app.post("/api/smart-profile/whatsapp-test", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      const profile = await storage.getSmartProfileByUserId(userId);
      if (!profile) return res.status(404).json({ message: "No profile found" });
      if (!profile.whatsappNumber) {
        return res.status(400).json({ message: "No WhatsApp number configured" });
      }
      const sent = await sendWhatsAppNotification(
        profile.whatsappNumber,
        "Test Lead",
        "+1234567890",
        "test@example.com",
        profile.businessName
      );
      if (sent) {
        res.json({ success: true });
      } else {
        res.status(502).json({ message: "Failed to send WhatsApp message. Check your number format." });
      }
    } catch (error: any) {
      console.error("[whatsapp-test] Error:", error);
      res.status(502).json({ message: error.message || "Could not send WhatsApp notification" });
    }
  });

  app.post("/api/smart-profile/leads/:sessionId/send-to-whatsapp", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      const profile = await storage.getSmartProfileByUserId(userId);
      if (!profile) return res.status(404).json({ message: "No profile found" });
      if (!profile.whatsappNumber) {
        return res.status(400).json({ message: "No WhatsApp number configured" });
      }

      const messages = await db.execute(sql`
        SELECT role, content FROM widget_messages
        WHERE profile_id = ${profile.id} AND session_id = ${req.params.sessionId}
        ORDER BY created_at ASC
      `);

      if (!messages.rows || messages.rows.length === 0) {
        return res.status(404).json({ message: "No messages found for this lead" });
      }

      const conversationText = messages.rows.map((m: any) => `${m.role}: ${m.content}`).join("\n");

      const extractResult = await gemini.models.generateContent({
        model: "gemini-2.0-flash",
        contents: `Extract the client's contact information from this conversation. Return ONLY valid JSON: {"name":"","phone":"","email":"","comment":""}.\n\n${conversationText}`,
      });

      let contactInfo: { name: string; phone: string; email: string; comment: string };
      try {
        const rawText = extractResult.text?.trim() || "{}";
        const jsonStr = rawText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
        contactInfo = JSON.parse(jsonStr);
      } catch {
        return res.status(422).json({ message: "Could not extract contact info" });
      }

      const sent = await sendWhatsAppNotification(
        profile.whatsappNumber,
        contactInfo.name || "",
        contactInfo.phone || "",
        contactInfo.email || "",
        profile.businessName
      );

      if (!sent) {
        return res.status(502).json({ message: "Failed to send WhatsApp notification" });
      }

      const sid = req.params.sessionId as string;
      await storage.createWidgetMessage({
        profileId: profile.id, sessionId: sid, role: "system",
        content: `[whatsapp-sent] ${contactInfo.name} ${contactInfo.phone}`,
        contentType: "system", audioUrl: null,
      });

      console.log(`[whatsapp-push] Lead sent for ${profile.slug}: ${contactInfo.name} ${contactInfo.phone}`);
      res.json({ success: true, extracted: contactInfo });
    } catch (error: any) {
      console.error("[whatsapp-push] Error:", error);
      res.status(500).json({ message: error.message || "Server error" });
    }
  });

  seedDemoProfiles().catch(err => console.error("[seed] Demo profiles seed error:", err));

  return httpServer;
}

async function seedDemoProfiles() {
  const demos = [
    {
      id: "demo-samir-usta",
      userId: "demo-user-samir",
      slug: "samir-usta",
      businessName: "Samir Usta",
      displayName: "Samir Usta",
      profession: "Kombi və Kondisioner Ustası",
      professionRu: "Мастер по котлам и кондиционерам",
      professionEn: "Boiler & AC Technician",
      themeColor: "#2563EB",
      knowledgeBase: `Ad: Samir Usta
Peşə: Kombi və Kondisioner Ustası
Ünvan: Bakı, bütün rayonlar
İş saatları: Hər gün 08:00 - 22:00, həftə sonu da işləyirəm
Əlaqə: +994 50 555 12 34

Xidmətlər və Qiymətlər:
- Kombi təmiri: 20 AZN-dən başlayır
- Kombi təmizliyi: 30 AZN
- Kombi filtr dəyişdirilməsi: 15 AZN
- Kondisioner quraşdırma: 50 AZN
- Kondisioner təmiri: 25 AZN-dən
- Kondisioner freon doldurma: 40 AZN
- Radiator sistemi quraşdırma: razılaşma ilə
- Təcili çağırış (gecə): +10 AZN əlavə

Zəmanət: Bütün işlərə 6 ay zəmanət verilir
Təcrübə: 12 il təcrübə
Ən tez gəliş vaxtı: 2 saat ərzində
Ödəniş: Nağd və ya karta köçürmə`,
      knowledgeBaseRu: `Имя: Самир Уста
Профессия: Мастер по котлам и кондиционерам
Адрес: Баку, все районы
Часы работы: Каждый день 08:00 - 22:00, работаю и по выходным
Контакт: +994 50 555 12 34

Услуги и Цены:
- Ремонт котла: от 20 AZN
- Чистка котла: 30 AZN
- Замена фильтра котла: 15 AZN
- Установка кондиционера: 50 AZN
- Ремонт кондиционера: от 25 AZN
- Заправка фреоном: 40 AZN
- Установка радиаторной системы: по договорённости
- Срочный вызов (ночь): +10 AZN доплата

Гарантия: На все работы 6 месяцев гарантии
Опыт: 12 лет
Самое быстрое прибытие: в течение 2 часов
Оплата: Наличные или перевод на карту`,
      knowledgeBaseEn: `Name: Samir Usta
Profession: Boiler & AC Technician
Location: Baku, all districts
Working hours: Every day 08:00 - 22:00, weekends included
Contact: +994 50 555 12 34

Services and Prices:
- Boiler repair: from 20 AZN
- Boiler cleaning: 30 AZN
- Boiler filter replacement: 15 AZN
- AC installation: 50 AZN
- AC repair: from 25 AZN
- AC freon refill: 40 AZN
- Radiator system installation: negotiable
- Emergency call (night): +10 AZN surcharge

Warranty: 6 months warranty on all work
Experience: 12 years
Fastest arrival: within 2 hours
Payment: Cash or card transfer`,
      onboardingComplete: true,
      isActive: true,
      isPro: true,
    },
    {
      id: "demo-aysel-teacher",
      userId: "demo-user-aysel",
      slug: "aysel-teacher",
      businessName: "Aysel English",
      displayName: "Aysel English",
      profession: "İngilis Dili Müəllimi",
      professionRu: "Преподаватель английского языка",
      professionEn: "English Language Teacher",
      themeColor: "#9333EA",
      knowledgeBase: `Ad: Aysel Məmmədova
Peşə: İngilis Dili Müəllimi
Ünvan: Bakı, Nəsimi rayonu (onlayn da mümkündür)
İş saatları: Bazar ertəsi - Şənbə, 09:00 - 20:00
Əlaqə: +994 55 444 56 78

Xidmətlər və Qiymətlər:
- Fərdi dərs (45 dəq): 15 AZN
- Qrup dərsi (60 dəq, 3-5 nəfər): 10 AZN/nəfər
- IELTS hazırlıq kursu (2 ay, intensiv): 400 AZN
- Biznes İngiliscəsi kursu: 25 AZN/dərs
- Uşaqlar üçün (6-12 yaş): 12 AZN/dərs
- Onlayn dərs (Zoom): eyni qiymət
- İlk dərs: PULSUZ (səviyyə testi daxil)

Səviyyələr: Başlanğıcdan İrəli səviyyəyə qədər (A1-C2)
Təcrübə: 8 il, 500+ məzun
Sertifikatlar: CELTA, IELTS 8.5
Metodologiya: Kommunikativ yanaşma, real həyat situasiyaları
Materiallar: Dərs qiyməsinə daxildir`,
      knowledgeBaseRu: `Имя: Айсель Мамедова
Профессия: Преподаватель английского языка
Адрес: Баку, Насиминский район (онлайн тоже возможно)
Часы работы: Понедельник - Суббота, 09:00 - 20:00
Контакт: +994 55 444 56 78

Услуги и Цены:
- Индивидуальный урок (45 мин): 15 AZN
- Групповой урок (60 мин, 3-5 чел): 10 AZN/чел
- Курс подготовки к IELTS (2 мес, интенсив): 400 AZN
- Бизнес-английский: 25 AZN/урок
- Для детей (6-12 лет): 12 AZN/урок
- Онлайн урок (Zoom): та же цена
- Первый урок: БЕСПЛАТНО (включая тест уровня)

Уровни: от начального до продвинутого (A1-C2)
Опыт: 8 лет, 500+ выпускников
Сертификаты: CELTA, IELTS 8.5
Методология: Коммуникативный подход, реальные жизненные ситуации
Материалы: включены в стоимость урока`,
      knowledgeBaseEn: `Name: Aysel Mammadova
Profession: English Language Teacher
Location: Baku, Nasimi district (online also available)
Working hours: Monday - Saturday, 09:00 - 20:00
Contact: +994 55 444 56 78

Services and Prices:
- Private lesson (45 min): 15 AZN
- Group lesson (60 min, 3-5 people): 10 AZN/person
- IELTS preparation course (2 months, intensive): 400 AZN
- Business English: 25 AZN/lesson
- Kids classes (6-12 years): 12 AZN/lesson
- Online lesson (Zoom): same price
- First lesson: FREE (includes level test)

Levels: Beginner to Advanced (A1-C2)
Experience: 8 years, 500+ graduates
Certificates: CELTA, IELTS 8.5
Methodology: Communicative approach, real-life situations
Materials: included in lesson price`,
      onboardingComplete: true,
      isActive: true,
      isPro: true,
    },
    {
      id: "demo-kebab-house",
      userId: "demo-user-kebab",
      slug: "kebab-house",
      businessName: "Kebab House",
      displayName: "Kebab House",
      profession: "Milli Mətbəx Restoranı",
      professionRu: "Ресторан национальной кухни",
      professionEn: "National Cuisine Restaurant",
      themeColor: "#EA580C",
      knowledgeBase: `Ad: Kebab House
Peşə: Milli Mətbəx Restoranı
Ünvan: Bakı, Fountain Square yaxınlığı, Nizami küçəsi 45
İş saatları: Hər gün 10:00 - 23:00
Əlaqə: +994 12 555 78 90

Menyu və Qiymətlər:
- Lülə Kebab: 8 AZN
- Tikə Kebab: 10 AZN
- Toyuq Kebab: 7 AZN
- Qutab (ət/göyərti): 2 AZN
- Dolma (5 ədəd): 6 AZN
- Piti: 5 AZN
- Dürüm: 4 AZN
- Lahmacun: 3 AZN
- Şəhər salatı: 4 AZN
- Ayran: 1.5 AZN
- Çay dəsti: 3 AZN
- Limonad: 2.5 AZN

Çatdırılma: Bakı daxili pulsuz (min sifariş 15 AZN)
Oturacaq: 60 nəfərlik zal + 20 nəfərlik teras
Korporativ sifarişlər: xüsusi qiymət (10+ nəfər)
WiFi: Var, pulsuz
Ödəniş: Nağd, kart, onlayn
Xüsusi: Təzə tandır çörəyi hər gün`,
      knowledgeBaseRu: `Название: Kebab House
Профессия: Ресторан национальной кухни
Адрес: Баку, рядом с Fountain Square, ул. Низами 45
Часы работы: Каждый день 10:00 - 23:00
Контакт: +994 12 555 78 90

Меню и Цены:
- Люля кебаб: 8 AZN
- Тике кебаб: 10 AZN
- Куриный кебаб: 7 AZN
- Кутаб (мясо/зелень): 2 AZN
- Долма (5 шт): 6 AZN
- Пити: 5 AZN
- Дюрюм: 4 AZN
- Лахмаджун: 3 AZN
- Городской салат: 4 AZN
- Айран: 1.5 AZN
- Чайный набор: 3 AZN
- Лимонад: 2.5 AZN

Доставка: Бесплатно по Баку (мин заказ 15 AZN)
Зал: 60 мест + терраса 20 мест
Корпоративные заказы: специальная цена (10+ человек)
WiFi: Есть, бесплатно
Оплата: Наличные, карта, онлайн
Особое: Свежий тандырный хлеб каждый день`,
      knowledgeBaseEn: `Name: Kebab House
Profession: National Cuisine Restaurant
Location: Baku, near Fountain Square, Nizami street 45
Working hours: Every day 10:00 - 23:00
Contact: +994 12 555 78 90

Menu and Prices:
- Lula Kebab: 8 AZN
- Tika Kebab: 10 AZN
- Chicken Kebab: 7 AZN
- Qutab (meat/herbs): 2 AZN
- Dolma (5 pcs): 6 AZN
- Piti: 5 AZN
- Durum: 4 AZN
- Lahmajun: 3 AZN
- Garden Salad: 4 AZN
- Ayran: 1.5 AZN
- Tea set: 3 AZN
- Lemonade: 2.5 AZN

Delivery: Free within Baku (min order 15 AZN)
Seating: 60-seat hall + 20-seat terrace
Corporate orders: special pricing (10+ people)
WiFi: Available, free
Payment: Cash, card, online
Special: Fresh tandoor bread daily`,
      onboardingComplete: true,
      isActive: true,
      isPro: true,
    },
  ];

  for (const demo of demos) {
    const existing = await storage.getSmartProfileBySlug(demo.slug);
    if (!existing) {
      await storage.createSmartProfile(demo);
      console.log(`[seed] Created demo profile: ${demo.slug}`);
    } else {
      console.log(`[seed] Demo profile already exists: ${demo.slug}`);
    }
  }
}
