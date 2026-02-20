const PHONE_PATTERNS = [
  /\+994[\s\-]?\d{2}[\s\-]?\d{3}[\s\-]?\d{2}[\s\-]?\d{2}/g,
  /\+?[1-9]\d{0,2}[\s\-]?\(?\d{2,4}\)?[\s\-]?\d{3,4}[\s\-]?\d{2,4}/g,
  /\b0\d{2}[\s\-]?\d{3}[\s\-]?\d{2}[\s\-]?\d{2}\b/g,
];

const EMAIL_PATTERN = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;

const CREDIT_CARD_PATTERN = /\b(?:\d{4}[\s\-]?){3}\d{4}\b/g;

const AZ_ID_PATTERNS = [
  /\b[A-Z]{2,3}\d{6,8}\b/g,
  /\bFIN[\s\-:]?\w{8,10}\b/gi,
];

export function redactPII(text: string): string {
  if (!text) return text;

  let result = text;

  result = result.replace(EMAIL_PATTERN, "[EMAIL REDACTED]");

  result = result.replace(CREDIT_CARD_PATTERN, "[CARD REDACTED]");

  for (const pattern of PHONE_PATTERNS) {
    pattern.lastIndex = 0;
    result = result.replace(pattern, "[PHONE REDACTED]");
  }

  for (const pattern of AZ_ID_PATTERNS) {
    pattern.lastIndex = 0;
    result = result.replace(pattern, "[ID REDACTED]");
  }

  return result;
}

export function containsPII(text: string): boolean {
  if (!text) return false;
  return text !== redactPII(text);
}
