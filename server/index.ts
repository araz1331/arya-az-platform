import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { db } from "./db";
import { sql } from "drizzle-orm";
import { WebhookHandlers } from "./webhookHandlers";
import { logRateLimitHit, logHostBlockedRequest } from "./security-alerts";
import { initTelegramBot } from "./telegram-service";

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled promise rejection:", reason);
});

process.on("uncaughtException", (err) => {
  console.error("Uncaught exception:", err);
});

const app = express();
app.set("trust proxy", 1);
const httpServer = createServer(app);

const ALLOWED_HOSTS = ["arya.az", "www.arya.az", "hirearya.com", "www.hirearya.com", "arya-az.replit.app"];

app.use((req, res, next) => {
  if (process.env.NODE_ENV === "production") {
    const host = (req.hostname || req.headers.host || "").split(":")[0].toLowerCase();
    if (!ALLOWED_HOSTS.includes(host)) {
      logHostBlockedRequest({ ip: req.ip, host });
      return res.status(403).json({ error: "Direct access not allowed. Use https://arya.az" });
    }
  }
  next();
});

const ALLOWED_ORIGINS = [
  "https://arya.az",
  "https://www.arya.az",
  "https://hirearya.com",
  "https://www.hirearya.com",
  "https://arya-az.replit.app",
];

app.use((req, res, next) => {
  const origin = req.headers.origin;

  if (req.path === "/api/whatsapp/webhook" || req.path === "/api/stripe/webhook" || req.path.startsWith("/api/telegram/webhook")) {
    return next();
  }

  if (req.path === "/widget.js" || req.path === "/api/widget.js") {
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "GET, OPTIONS");
    return next();
  }

  if (req.path.startsWith("/api/smart-profile/chat") || req.path.startsWith("/api/embed/")) {
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type");
    if (req.method === "OPTIONS") return res.sendStatus(204);
    return next();
  }

  if (origin) {
    const isDev = process.env.NODE_ENV === "development";
    const isAllowed = ALLOWED_ORIGINS.includes(origin) ||
      (isDev && (origin.includes("localhost") || origin.includes("replit")));

    if (isAllowed) {
      res.set("Access-Control-Allow-Origin", origin);
      res.set("Access-Control-Allow-Credentials", "true");
      res.set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
      res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
    }
  }

  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

function getRateLimitKey(req: Request): string {
  return req.ip || "unknown";
}

function rateLimiter(maxRequests: number, windowMs: number) {
  return (req: Request, res: Response, next: NextFunction) => {
    const key = getRateLimitKey(req);
    const now = Date.now();
    const entry = rateLimitStore.get(key);

    if (!entry || now > entry.resetAt) {
      rateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }

    if (entry.count >= maxRequests) {
      logRateLimitHit({ ip: req.ip, path: req.path, limit: maxRequests });
      return res.status(429).json({ error: "Too many requests. Please try again later." });
    }

    entry.count++;
    return next();
  };
}

setInterval(() => {
  const now = Date.now();
  rateLimitStore.forEach((entry, key) => {
    if (now > entry.resetAt) rateLimitStore.delete(key);
  });
}, 60_000);

app.use("/api/smart-profile/chat", rateLimiter(15, 60_000));
app.use("/api/owner-chat", rateLimiter(20, 60_000));
app.use("/api/whatsapp/webhook", rateLimiter(30, 60_000));
app.use("/api/telegram/webhook", rateLimiter(30, 60_000));
app.use("/api/auth/login", rateLimiter(10, 60_000));
app.use("/api/auth/register", rateLimiter(5, 60_000));

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString(), uptime: process.uptime() });
});

import * as pathModule from "path";
app.get("/download-now", (req, res) => {
  res.download(pathModule.resolve("my-code.zip"));
});

app.post(
  '/api/stripe/webhook',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    const signature = req.headers['stripe-signature'];
    if (!signature) {
      return res.status(400).json({ error: 'Missing stripe-signature' });
    }
    try {
      const sig = Array.isArray(signature) ? signature[0] : signature;
      if (!Buffer.isBuffer(req.body)) {
        console.error('STRIPE WEBHOOK ERROR: req.body is not a Buffer');
        return res.status(500).json({ error: 'Webhook processing error' });
      }
      await WebhookHandlers.processWebhook(req.body as Buffer, sig);
      res.status(200).json({ received: true });
    } catch (error: any) {
      console.error('Webhook error:', error.message);
      res.status(400).json({ error: 'Webhook processing error' });
    }
  }
);

app.use(express.json());

app.use(express.urlencoded({ extended: false }));

import * as path from "path";
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      log(logLine);
    }
  });

  next();
});

async function bootstrapViews() {
  try {
    await db.execute(sql`
      CREATE OR REPLACE VIEW master_voice_dataset AS
      SELECT id, audio_url, transcription, 'donation' as source, created_at
      FROM voice_donations
      UNION ALL
      SELECT id, audio_url, content as transcription, 'widget' as source, created_at
      FROM widget_messages
      WHERE role = 'user'
    `);
  } catch (err) {
    console.error("Failed to bootstrap views:", err);
  }
}

async function initStripe() {
  if (!process.env.STRIPE_SECRET_KEY) {
    console.warn('STRIPE_SECRET_KEY not set, skipping Stripe check');
    return;
  }
  console.log('Stripe configured (direct HireArya account)');
}

(async () => {
  try {
    await bootstrapViews().catch(err => {
      console.warn("bootstrapViews failed (non-fatal):", err.message);
    });
    await initStripe();
    initTelegramBot(app);
    await registerRoutes(httpServer, app);
  } catch (err) {
    console.error("Failed to register routes:", err);
    process.exit(1);
  }

  app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    console.error("Internal Server Error:", err);

    if (res.headersSent) {
      return next(err);
    }

    return res.status(status).json({ message });
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true,
    },
    () => {
      log(`serving on port ${port}`);
    },
  );
})().catch((err) => {
  console.error("Unhandled startup error:", err);
  process.exit(1);
});
// FORCE CONNECT NOW
console.log("SERVER RESTARTING NOW...");