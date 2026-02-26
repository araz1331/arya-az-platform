import session from "express-session";
import connectPg from "connect-pg-simple";
import bcrypt from "bcryptjs";
import { createClient } from "@supabase/supabase-js";
import type { Express, RequestHandler, Request, Response } from "express";
import { db } from "./db";
import { users, type User } from "@shared/models/auth";
import { eq } from "drizzle-orm";

declare module "express-session" {
  interface SessionData {
    userId?: string;
    masterVerified?: boolean;
  }
}

const SALT_ROUNDS = 12;

export function setupSession(app: Express) {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000;
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: true,
    ttl: sessionTtl,
    tableName: "sessions",
  });

  app.set("trust proxy", 1);
  app.use(
    session({
      secret: process.env.SESSION_SECRET || (() => { if (process.env.NODE_ENV === "production") throw new Error("SESSION_SECRET must be set in production"); return "dev-only-fallback-secret"; })(),
      store: sessionStore,
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: sessionTtl,
      },
    })
  );
}

export function registerAuthRoutes(app: Express) {
  app.post("/api/auth/register", async (req: Request, res: Response) => {
    try {
      const { email, password, firstName, lastName } = req.body;

      if (!email || !password) {
        return res.status(400).json({ message: "E-poçt və şifrə tələb olunur" });
      }

      if (password.length < 6) {
        return res.status(400).json({ message: "Şifrə minimum 6 simvol olmalıdır" });
      }

      const existing = await db
        .select()
        .from(users)
        .where(eq(users.email, email.toLowerCase().trim()));
      if (existing.length > 0) {
        return res.status(409).json({ message: "Bu e-poçt artıq qeydiyyatdan keçib" });
      }

      const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

      const [user] = await db
        .insert(users)
        .values({
          email: email.toLowerCase().trim(),
          passwordHash,
          firstName: firstName || null,
          lastName: lastName || null,
        })
        .returning();

      req.session.userId = user.id;

      const { passwordHash: _, ...safeUser } = user;
      res.status(201).json(safeUser);
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ message: "Server xətası" });
    }
  });

  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ message: "E-poçt və şifrə tələb olunur" });
      }

      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, email.toLowerCase().trim()));

      if (!user || !user.passwordHash) {
        return res.status(401).json({ message: "E-poçt və ya şifrə yanlışdır" });
      }

      const valid = await bcrypt.compare(password, user.passwordHash);
      if (!valid) {
        return res.status(401).json({ message: "E-poçt və ya şifrə yanlışdır" });
      }

      if (user.deletedAt) {
        return res.status(403).json({ message: "Bu hesab silinib / This account has been deleted" });
      }

      if (user.isSuspended) {
        return res.status(403).json({ message: "Bu hesab dayandırılıb / This account has been suspended" });
      }

      req.session.userId = user.id;

      const { passwordHash: _, ...safeUser } = user;
      res.json(safeUser);
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Server xətası" });
    }
  });

  app.post("/api/auth/logout", (req: Request, res: Response) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Çıxış zamanı xəta baş verdi" });
      }
      res.clearCookie("connect.sid");
      res.json({ success: true });
    });
  });

  app.get("/api/auth/user", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, req.session.userId));

      if (!user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      if (user.deletedAt || user.isSuspended) {
        req.session.destroy(() => {});
        return res.status(403).json({ message: "Account suspended or deleted" });
      }

      const { passwordHash: _, ...safeUser } = user;
      res.json(safeUser);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Server xətası" });
    }
  });

  app.get("/api/auth/supabase-config", (_req: Request, res: Response) => {
    const anonKey = process.env.SUPABASE_ANON_KEY;
    if (!anonKey) {
      return res.status(500).json({ message: "Supabase not configured" });
    }
    const rawUrl = process.env.SUPABASE_URL || "";
    const apiUrl = rawUrl.startsWith("http") && !rawUrl.includes("pooler") && !rawUrl.includes("postgresql")
      ? rawUrl
      : "https://pypvjnzlkmoikfzhuwbm.supabase.co";
    res.json({ url: apiUrl, anonKey });
  });

  app.post("/api/auth/supabase-login", async (req: Request, res: Response) => {
    try {
      const { access_token } = req.body;
      if (!access_token) {
        return res.status(400).json({ message: "Missing access token" });
      }

      const supabaseKey = process.env.SUPABASE_ANON_KEY;
      if (!supabaseKey) {
        return res.status(500).json({ message: "Supabase not configured" });
      }

      const rawUrl = process.env.SUPABASE_URL || "";
      const supabaseUrl = rawUrl.startsWith("http") && !rawUrl.includes("pooler") && !rawUrl.includes("postgresql")
        ? rawUrl
        : "https://pypvjnzlkmoikfzhuwbm.supabase.co";

      const supabase = createClient(supabaseUrl, supabaseKey);
      const { data: { user: sbUser }, error } = await supabase.auth.getUser(access_token);
      if (error || !sbUser) {
        return res.status(401).json({ message: "Invalid Supabase token" });
      }

      const sbEmail = sbUser.email?.toLowerCase().trim();
      if (!sbEmail) {
        return res.status(400).json({ message: "No email in Supabase user" });
      }

      let [localUser] = await db.select().from(users).where(eq(users.email, sbEmail));
      if (!localUser) {
        const meta = sbUser.user_metadata || {};
        [localUser] = await db.insert(users).values({
          email: sbEmail,
          passwordHash: "",
          firstName: meta.first_name || meta.firstName || null,
          lastName: meta.last_name || meta.lastName || null,
        }).returning();
      }

      if (localUser.deletedAt) {
        return res.status(403).json({ message: "Account deleted" });
      }
      if (localUser.isSuspended) {
        return res.status(403).json({ message: "Account suspended" });
      }

      req.session.userId = localUser.id;

      const { passwordHash: _, ...safeUser } = localUser;
      res.json(safeUser);
    } catch (error) {
      console.error("[supabase-login] Error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  app.get("/api/subscription/check", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId!;
      const [user] = await db.select().from(users).where(eq(users.id, userId));
      if (!user) return res.status(401).json({ message: "Unauthorized" });

      const email = user.email;
      const apiKey = process.env.UNIFIED_API_KEY;
      if (!apiKey) {
        return res.json({ has_chat: true });
      }

      try {
        const verifyRes = await fetch(
          `https://sales.hirearya.com/api/subscription/verify?email=${encodeURIComponent(email)}`,
          { headers: { "x-api-key": apiKey }, signal: AbortSignal.timeout(5000) }
        );
        if (verifyRes.ok) {
          const data = await verifyRes.json();
          return res.json({
            has_chat: data.has_chat === true,
            has_voice: data.has_voice === true,
            has_sales: data.has_sales === true,
          });
        }
      } catch (err: any) {
        console.error("[subscription-check] Cross-service API error:", err?.message);
      }

      return res.json({ has_chat: true });
    } catch (error) {
      console.error("[subscription-check] Error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
}

export const isAuthenticated: RequestHandler = (req, res, next) => {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
};

export function getUserId(req: Request): string {
  return req.session.userId!;
}
