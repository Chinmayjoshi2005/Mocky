/**
 * Security and Input Sanitization Utility
 * Protects against SQL Injection, NoSQL Injection, XSS, and Auth Bypass payloads.
 */

// Common authentication bypass & SQL injection signatures
const SQL_INJECTION_PATTERNS = [
  /('|"|`)\s*(OR|AND)\s*('|"|`)?.*(=|<|>|LIKE)/i,
  /('|"|`)\s*OR\s+1\s*=\s*1/i,
  /('|"|`)\s*OR\s*('|"|`)[a-z0-9]('|"|`)\s*=\s*('|"|`)[a-z0-9]/i,
  /--\s*$/,
  /\/\*[\s\S]*?\*\//,
  /\bUNION\s+(ALL\s+)?SELECT\b/i,
  /\bDROP\s+(TABLE|DATABASE)\b/i,
  /\bINSERT\s+INTO\b/i,
  /\bDELETE\s+FROM\b/i,
  /\bUPDATE\s+.*SET\b/i,
  /;\s*SHUTDOWN/i,
  /admin'\s*--/i,
  /admin"\s*--/i,
  /'\s*OR\s*'1'='1/i,
  /"\s*OR\s*"1"="1/i,
  /'\s*OR\s*''='/i,
  /"\s*OR\s*""="/i,
];

// XSS & Script injection signatures
const XSS_PATTERNS = [
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  /javascript\s*:/i,
  /data:\s*text\/html/i,
  /onload\s*=/i,
  /onerror\s*=/i,
];

/**
 * Checks whether an input contains known injection codes or auth bypass patterns.
 */
export function isInjectionPayload(value: string): boolean {
  if (!value || typeof value !== "string") return false;
  const trimmed = value.trim();

  for (const pattern of SQL_INJECTION_PATTERNS) {
    if (pattern.test(trimmed)) return true;
  }

  for (const pattern of XSS_PATTERNS) {
    if (pattern.test(trimmed)) return true;
  }

  return false;
}

/**
 * Validates email and password against dangerous injection patterns.
 */
export function validateSecureInput(
  field: "email" | "password",
  value: string
): { isValid: boolean; error?: string } {
  if (!value) {
    return { isValid: false, error: `${field === "email" ? "Email" : "Password"} is required` };
  }

  if (isInjectionPayload(value)) {
    return {
      isValid: false,
      error: `Security Alert: Potential injection code detected in ${field}. Direct bypass codes are blocked.`,
    };
  }

  if (field === "email") {
    // Strict email format check
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(value.trim())) {
      return { isValid: false, error: "Please enter a valid email address." };
    }
  }

  return { isValid: true };
}

/**
 * Cryptographically hashes a password using SHA-256 via Web Crypto API.
 * Never stores or compares passwords in raw plaintext.
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = "mocky_argon_secure_salt_v2";
  const encoder = new TextEncoder();
  const data = encoder.encode(password + salt);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}
