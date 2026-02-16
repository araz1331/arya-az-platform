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

      const donation = await storage.createVoiceDonation({
        userId: req.session?.userId || null,
        speakerName: speaker_name || "unknown",
        age: age || null,
        gender: gender || null,
        sentenceId: sentenceId || null,
        transcription: sentenceText || null,
        audioUrl: null,
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
      res.json(donations);
    } catch (error) {
      console.error("Admin voice donations error:", error);
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
      const filepath = path.join(uploadsDir, filename);
      fs.writeFileSync(filepath, file.buffer);

      const imageUrl = `/uploads/profile-images/${filename}`;
      await storage.updateSmartProfile(existing.id, { profileImageUrl: imageUrl });
      res.json({ imageUrl });
    } catch (error) {
      console.error("Upload image error:", error);
      res.status(500).json({ message: "Upload failed" });
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
        az: "Respond in Azerbaijani.",
        ru: "Respond in Russian.",
        en: "Respond in English.",
        es: "Respond in Spanish.",
        fr: "Respond in French.",
        tr: "Respond in Turkish.",
      };
      const langInstruction = langMap[language] || "Respond in English.";

      const systemPrompt = `You are ${displayName}, ${profession}. You are a helpful business assistant chatbot on your profile page. Answer questions based on your business information below. Be friendly, concise and helpful. ${langInstruction}

Business Information:
${knowledgeBase}

Rules:
- Only answer questions related to your business
- If asked about something not in your info, politely say you don't have that information
- Keep answers short (1-3 sentences)
- Be professional and welcoming`;

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

  return httpServer;
}
