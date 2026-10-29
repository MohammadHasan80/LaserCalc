"use client";

// ─────────────────────────────────────────────────────────────
// پشتیبان‌گیری و بازیابی — همهٔ داده‌های برنامه در یک فایل JSON
// شامل: فاکتورها، شمارندهٔ فاکتور، نرخ‌ها و اطلاعات کسب‌وکار
// ─────────────────────────────────────────────────────────────

const INVOICES_KEY = "laser-invoices";
const COUNTER_KEY = "laser-inv-counter";
const RATES_KEY = "laser-rates";
const BUSINESS_KEY = "laser-business";

export interface BackupFile {
  app: "cutting-price-app";
  schema: 1;
  exportedAt: string;
  data: {
    invoices: unknown;
    counter: unknown;
    rates: unknown;
    business: unknown;
  };
}

/** جمع‌آوری داده‌های فعلی برای پشتیبان‌گیری */
export function buildBackup(): BackupFile {
  const read = (key: string): unknown => {
    try {
      const raw = localStorage.getItem(key);
      return raw === null ? null : JSON.parse(raw);
    } catch {
      return null;
    }
  };
  return {
    app: "cutting-price-app",
    schema: 1,
    exportedAt: new Date().toISOString(),
    data: {
      invoices: read(INVOICES_KEY),
      counter: read(COUNTER_KEY),
      rates: read(RATES_KEY),
      business: read(BUSINESS_KEY),
    },
  };
}

export interface BackupSummary {
  invoices: number;
  hasRates: boolean;
  hasBusiness: boolean;
  hasCounter: boolean;
  exportedAt: string | null;
}

/** اعتبارسنجی ساختار فایل پشتیبان — خروجی: خلاصهٔ محتوا یا خطا */
export function parseBackup(text: string):
  | { ok: true; file: BackupFile; summary: BackupSummary }
  | { ok: false; error: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, error: "فایل، JSON معتبر نیست" };
  }
  const f = parsed as Partial<BackupFile>;
  if (!f || typeof f !== "object") return { ok: false, error: "ساختار فایل نامعتبر است" };
  if (f.app !== "cutting-price-app")
    return { ok: false, error: "این فایل پشتیبان «قیمت برش لیزر» نیست" };
  if (f.schema !== 1)
    return { ok: false, error: "نسخهٔ فایل پشتیبان پشتیبانی نمی‌شود" };
  if (!f.data || typeof f.data !== "object")
    return { ok: false, error: "دادهٔ فایل پشتیبان خالی است" };

  const invoices = Array.isArray(f.data.invoices) ? f.data.invoices : [];
  return {
    ok: true,
    file: parsed as BackupFile,
    summary: {
      invoices: invoices.length,
      hasRates: f.data.rates != null,
      hasBusiness: f.data.business != null,
      hasCounter: f.data.counter != null,
      exportedAt: typeof f.exportedAt === "string" ? f.exportedAt : null,
    },
  };
}

/** بازیابی: نوشتن محتوای پشتیبان روی داده‌های فعلی */
export function applyBackup(file: BackupFile): void {
  const write = (key: string, value: unknown) => {
    if (value === null || value === undefined) {
      localStorage.removeItem(key);
    } else {
      localStorage.setItem(key, JSON.stringify(value));
    }
  };
  write(INVOICES_KEY, file.data.invoices);
  write(COUNTER_KEY, file.data.counter);
  write(RATES_KEY, file.data.rates);
  write(BUSINESS_KEY, file.data.business);
}

/** نام فایل پیشنهادی پشتیبان — تاریخ شمسی از تاریخ سیستم */
export function backupFilename(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `cutting-price-backup-${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}.json`;
}

/** ذخیرهٔ فایل پشتیبان — در مرورگر دانلود، در اپ از پل اندروید */
export async function downloadBackup(
  file: BackupFile
): Promise<"browser" | "android" | "failed"> {
  const json = JSON.stringify(file, null, 2);
  const filename = backupFilename();
  const bridge = (
    window as unknown as Record<string, unknown>
  ).AndroidBridge as { saveJson?: (b64: string, name: string) => string } | undefined;

  // در اپ اندروید: ذخیره در Downloads از طریق پل
  if (bridge && typeof bridge.saveJson === "function") {
    try {
      const b64 = base64Utf8(json);
      const res = bridge.saveJson(b64, filename);
      return res === "ok" ? "android" : "failed";
    } catch {
      return "failed";
    }
  }

  // در مرورگر: دانلود معمول
  try {
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 3000);
    return "browser";
  } catch {
    return "failed";
  }
}

/** رشتهٔ UTF-8 به base64 (برای پل اندروید) */
export function base64Utf8(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let bin = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(bin);
}

/** base64 به رشتهٔ UTF-8 */
export function utf8FromBase64(b64: string): string {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}
