import session from "express-session";
import connectPg from "connect-pg-simple";
import bcrypt from "bcryptjs";
import type { Express, RequestHandler, Request, Response } from "express";
import { db } from "./db";
import { users, type User } from "@shared/models/auth";
import { eq } from "drizzle-orm";

declare module "express-session" {
  interface SessionData {
    userId?: string;
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
      secret: process.env.SESSION_SECRET || "arya-az-fallback-secret",
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

      const { passwordHash: _, ...safeUser } = user;
      res.json(safeUser);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Server xətası" });
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
