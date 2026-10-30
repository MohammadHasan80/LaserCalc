"use client";

// ─────────────────────────────────────────────────────────────
// قفل برنامه با رمز — رمز به‌صورت هش SHA-256 ذخیره می‌شود
// ساختار: laser-lock = { hash, enabled }
// در هر اجرای برنامه یک‌بار رمز خواسته می‌شود (sessionStorage)
// ─────────────────────────────────────────────────────────────

const LOCK_KEY = "laser-lock";
const UNLOCKED_KEY = "laser-unlocked";

export interface LockConfig {
  hash: string; // هش SHA-256 رمز
  enabled: boolean;
  pinLength: number; // طول رمز (۴ تا ۶ رقم)
}

async function sha256Hex(text: string): Promise<string> {
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(text)
  );
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** هش رمز با پیشوند ثابت */
export async function hashPin(pin: string): Promise<string> {
  return sha256Hex(`laser-cut-app:${pin}`);
}

/** تنظیمات قفل ذخیره‌شده — null یعنی قفل تنظیم نشده */
export function loadLock(): LockConfig | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(LOCK_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<LockConfig>;
    if (typeof parsed.hash !== "string" || parsed.hash.length !== 64) return null;
    const len = Number(parsed.pinLength);
    return {
      hash: parsed.hash,
      enabled: parsed.enabled !== false,
      pinLength: len >= 4 && len <= 6 ? len : 4,
    };
  } catch {
    return null;
  }
}

export function saveLock(config: LockConfig): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(LOCK_KEY, JSON.stringify(config));
}

export function removeLock(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(LOCK_KEY);
}

/** آیا در این اجرای برنامه باز شده است؟ */
export function isUnlocked(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return sessionStorage.getItem(UNLOCKED_KEY) === "1";
  } catch {
    return false;
  }
}

export function markUnlocked(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(UNLOCKED_KEY, "1");
  } catch {
    /* بی‌اهمیت */
  }
}

/** بررسی رمز واردشده */
export async function verifyPin(
  pin: string,
  config: LockConfig
): Promise<boolean> {
  const h = await hashPin(pin);
  return h === config.hash;
}

// ─────────────────────────────────────────────────────────────
// ورود با اثر انگشت — پیش‌فرض روشن است؛ کاربر می‌تواند خاموشش کند
// کلید جدا از قفل نگه داشته می‌شود تا حذف/تغییر رمز روی آن اثر نگذارد
// ─────────────────────────────────────────────────────────────

const BIO_ENABLED_KEY = "laser-bio-enabled";

/** آیا ورود با اثر انگشت روشن است؟ — بدون کلید یعنی روشن (پیش‌فرض) */
export function loadBioEnabled(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return localStorage.getItem(BIO_ENABLED_KEY) !== "0";
  } catch {
    return true;
  }
}

export function saveBioEnabled(on: boolean): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(BIO_ENABLED_KEY, on ? "1" : "0");
  } catch {
    /* بی‌اهمیت */
  }
}
