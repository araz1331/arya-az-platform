import { sendWhatsAppMessage } from "./whatsapp-service";
import { db } from "./db";
import { sql } from "drizzle-orm";
import * as fs from "fs";
import * as path from "path";

const ADMIN_WHATSAPP = process.env.ADMIN_WHATSAPP_NUMBER || "";
const LOG_DIR = path.join(process.cwd(), "logs");
const SECURITY_LOG_FILE = path.join(LOG_DIR, "security.log");

const alertCooldown = new Map<string, number>();
const COOLDOWN_MS = 5 * 60_000;

function ensureLogDir() {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
}

function writeSecurityLog(entry: Record<string, any>) {
  ensureLogDir();
  const line = JSON.stringify({ ...entry, timestamp: new Date().toISOString() }) + "\n";
  fs.appendFileSync(SECURITY_LOG_FILE, line, "utf-8");
}

function shouldAlert(key: string): boolean {
  const now = Date.now();
  const last = alertCooldown.get(key);
  if (last && now - last < COOLDOWN_MS) return false;
  alertCooldown.set(key, now);
  return true;
}

export async function logPromptInjection(context: {
  channel: "widget" | "owner" | "whatsapp";
  slug?: string;
  ip?: string;
  from?: string;
  message: string;
}) {
  const truncatedMsg = context.message.substring(0, 200);
  const logEntry = {
    event: "PROMPT_INJECTION_BLOCKED",
    channel: context.channel,
    slug: context.slug || "unknown",
    ip: context.ip || "unknown",
    from: context.from || "unknown",
    messagePreview: truncatedMsg,
  };

  writeSecurityLog(logEntry);
  console.warn(`[SECURITY] Prompt injection blocked | channel=${context.channel} | slug=${context.slug} | ip=${context.ip}`);

  if (ADMIN_WHATSAPP && shouldAlert(`injection-${context.channel}-${context.ip || context.from}`)) {
    const alert = `🚨 SECURITY ALERT\n\nBlocked prompt injection attempt\n📍 Channel: ${context.channel}\n🏪 Profile: ${context.slug || "N/A"}\n🌐 IP: ${context.ip || "N/A"}\n📱 From: ${context.from || "N/A"}\n💬 Message: "${truncatedMsg}..."`;
    await sendWhatsAppMessage(ADMIN_WHATSAPP, alert).catch(err => {
      console.error("[security-alert] Failed to send WhatsApp alert:", err);
    });
  }
}

export async function logTwilioSignatureFailure(context: {
  ip?: string;
  path: string;
  from?: string;
}) {
  const logEntry = {
    event: "TWILIO_SIGNATURE_INVALID",
    ip: context.ip || "unknown",
    path: context.path,
    from: context.from || "unknown",
  };

  writeSecurityLog(logEntry);
  console.warn(`[SECURITY] Invalid Twilio signature | ip=${context.ip} | path=${context.path}`);

  if (ADMIN_WHATSAPP && shouldAlert(`twilio-sig-${context.ip}`)) {
    const alert = `🚨 SECURITY ALERT\n\nInvalid Twilio signature detected\n🌐 IP: ${context.ip || "unknown"}\n📍 Path: ${context.path}\n📱 From: ${context.from || "N/A"}\n\nPossible webhook spoofing attempt.`;
    await sendWhatsAppMessage(ADMIN_WHATSAPP, alert).catch(err => {
      console.error("[security-alert] Failed to send WhatsApp alert:", err);
    });
  }
}

export async function logRateLimitHit(context: {
  ip?: string;
  path: string;
  limit: number;
}) {
  const logEntry = {
    event: "RATE_LIMIT_EXCEEDED",
    ip: context.ip || "unknown",
    path: context.path,
    limit: context.limit,
  };

  writeSecurityLog(logEntry);

  if (ADMIN_WHATSAPP && shouldAlert(`ratelimit-${context.ip}-${context.path}`)) {
    const alert = `⚠️ RATE LIMIT\n\nExcessive requests detected\n🌐 IP: ${context.ip || "unknown"}\n📍 Path: ${context.path}\n🔒 Limit: ${context.limit} req/min`;
    await sendWhatsAppMessage(ADMIN_WHATSAPP, alert).catch(err => {
      console.error("[security-alert] Failed to send WhatsApp alert:", err);
    });
  }
}

export async function logHostBlockedRequest(context: {
  ip?: string;
  host: string;
}) {
  const logEntry = {
    event: "HOST_BLOCKED",
    ip: context.ip || "unknown",
    host: context.host,
  };

  writeSecurityLog(logEntry);
  console.warn(`[SECURITY] Blocked direct access | host=${context.host} | ip=${context.ip}`);
}

export function getRecentSecurityLogs(limit = 50): any[] {
  try {
    if (!fs.existsSync(SECURITY_LOG_FILE)) return [];
    const content = fs.readFileSync(SECURITY_LOG_FILE, "utf-8");
    const lines = content.trim().split("\n").filter(Boolean);
    return lines.slice(-limit).map(line => {
      try { return JSON.parse(line); } catch { return { raw: line }; }
    }).reverse();
  } catch {
    return [];
  }
}
