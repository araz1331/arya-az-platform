import * as fs from "fs";
import * as path from "path";

const ADMIN_WHATSAPP = process.env.ADMIN_WHATSAPP_NUMBER || "";
const LOG_DIR = path.join(process.cwd(), "logs");
const MAX_LOG_SIZE = 5 * 1024 * 1024;

function getLogFileName(): string {
  const date = new Date().toISOString().split("T")[0];
  return path.join(LOG_DIR, `security-${date}.log`);
}

const alertCooldown = new Map<string, number>();
const COOLDOWN_MS = 5 * 60_000;

function ensureLogDir() {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
}

function writeSecurityLog(entry: Record<string, any>) {
  ensureLogDir();
  const logFile = getLogFileName();
  try {
    const stat = fs.existsSync(logFile) ? fs.statSync(logFile) : null;
    if (stat && stat.size > MAX_LOG_SIZE) {
      fs.renameSync(logFile, logFile + ".old");
    }
  } catch {}
  const line = JSON.stringify({ ...entry, timestamp: new Date().toISOString() }) + "\n";
  fs.appendFileSync(logFile, line, "utf-8");
}

function shouldAlert(key: string): boolean {
  const now = Date.now();
  const last = alertCooldown.get(key);
  if (last && now - last < COOLDOWN_MS) return false;
  alertCooldown.set(key, now);
  return true;
}

async function sendAlert(message: string) {
  if (!ADMIN_WHATSAPP) return;
  try {
    const { sendWhatsAppMessage } = await import("./whatsapp-service");
    await sendWhatsAppMessage(ADMIN_WHATSAPP, message);
  } catch (err) {
    console.error("[security-alert] Failed to send WhatsApp alert:", err);
  }
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

  if (shouldAlert(`injection-${context.channel}-${context.ip || context.from}`)) {
    await sendAlert(`🚨 SECURITY ALERT\n\nBlocked prompt injection attempt\n📍 Channel: ${context.channel}\n🏪 Profile: ${context.slug || "N/A"}\n🌐 IP: ${context.ip || "N/A"}\n📱 From: ${context.from || "N/A"}\n💬 Message: "${truncatedMsg}..."`);
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

  if (shouldAlert(`twilio-sig-${context.ip}`)) {
    await sendAlert(`🚨 SECURITY ALERT\n\nInvalid Twilio signature detected\n🌐 IP: ${context.ip || "unknown"}\n📍 Path: ${context.path}\n📱 From: ${context.from || "N/A"}\n\nPossible webhook spoofing attempt.`);
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

  if (shouldAlert(`ratelimit-${context.ip}-${context.path}`)) {
    await sendAlert(`⚠️ RATE LIMIT\n\nExcessive requests detected\n🌐 IP: ${context.ip || "unknown"}\n📍 Path: ${context.path}\n🔒 Limit: ${context.limit} req/min`);
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
    ensureLogDir();
    const files = fs.readdirSync(LOG_DIR)
      .filter(f => f.startsWith("security-") && f.endsWith(".log"))
      .sort()
      .reverse();
    const allLines: any[] = [];
    for (const file of files) {
      if (allLines.length >= limit) break;
      const content = fs.readFileSync(path.join(LOG_DIR, file), "utf-8");
      const lines = content.trim().split("\n").filter(Boolean);
      for (let i = lines.length - 1; i >= 0 && allLines.length < limit; i--) {
        try { allLines.push(JSON.parse(lines[i])); } catch { allLines.push({ raw: lines[i] }); }
      }
    }
    return allLines;
  } catch {
    return [];
  }
}
