"use client";

// ─────────────────────────────────────────────────────────────
// قفل برنامه با رمز — رمز به‌صورت هش SHA-256 ذخیره می‌شود
// ساختار: laser-lock = { hash, enabled, pinLength, timeoutMinutes }
// timeoutMinutes = 0 → در هر اجرای برنامه یک‌بار رمز خواسته می‌شود
// timeoutMinutes = N → رمز فقط بعد از N دقیقه بی‌کاری دوباره پرسیده می‌شود
// آخرین فعالیت کاربر در laser-last-active (timestamp) نگهداری می‌شود
// ─────────────────────────────────────────────────────────────

const LOCK_KEY = "laser-lock";
const UNLOCKED_KEY = "laser-unlocked";

export interface LockConfig {
  hash: string; // هش SHA-256 رمز
  enabled: boolean;
  pinLength: number; // طول رمز (۴ تا ۶ رقم)
  timeoutMinutes: number; // ۰ = هر بار باز کردن برنامه؛ N = بعد از N دقیقه بی‌کاری
}

/** گزینه‌های مجاز برای «پرسیدن دوبارهٔ رمز» (دقیقه) */
export const LOCK_TIMEOUT_OPTIONS = [0, 1, 5, 15, 30, 60] as const;

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
    const t = Number(parsed.timeoutMinutes);
    return {
      hash: parsed.hash,
      enabled: parsed.enabled !== false,
      pinLength: len >= 4 && len <= 6 ? len : 4,
      timeoutMinutes: (LOCK_TIMEOUT_OPTIONS as readonly number[]).includes(t)
        ? t
        : 0,
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
// قفل خودکار بعد از بی‌کاری — timeoutMinutes > 0
// آخرین فعالیت کاربر (لمس/کلیک/کیبورد/بازگشت به برنامه) ثبت می‌شود؛
// زمانی که برنامه در پس‌زمینه است چیزی ثبت نمی‌شود، پس مدت حضور
// در پس‌زمینه هم جزو بی‌کاری حساب می‌شود.
// ─────────────────────────────────────────────────────────────

const LAST_ACTIVE_KEY = "laser-last-active";

/** زمان آخرین فعالیت کاربر (ms) — ۰ یعنی هرگز */
export function getLastActive(): number {
  if (typeof window === "undefined") return 0;
  try {
    return Number(localStorage.getItem(LAST_ACTIVE_KEY)) || 0;
  } catch {
    return 0;
  }
}

/** ثبت فعالیت کاربر — با force همیشه نوشته می‌شود، وگرنه حداکثر هر ۵ ثانیه */
export function touchLastActive(force = false): void {
  if (typeof window === "undefined") return;
  const now = Date.now();
  if (!force && now - getLastActive() < 5000) return;
  try {
    localStorage.setItem(LAST_ACTIVE_KEY, String(now));
  } catch {
    /* بی‌اهمیت */
  }
}

/**
 * آیا الان باید قفل نمایش داده شود؟
 * - timeout = 0: رفتار قبلی — یک‌بار در هر اجرای برنامه (sessionStorage)
 * - timeout = N: اگر کمتر از N دقیقه از آخرین فعالیت گذشته باشد باز است؛
 *   در غیر این صورت قفل نمایش داده می‌شود (حتی در وسط اجرا، بعد از بی‌کاری)
 */
export function shouldLock(config: LockConfig): boolean {
  if (!config.enabled) return false;
  const t = config.timeoutMinutes;
  if (t <= 0) return !isUnlocked();
  if (Date.now() - getLastActive() <= t * 60_000) {
    markUnlocked(); // در مهلت مجاز — بدون قفل ادامه می‌دهیم
    return false;
  }
  return true;
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
