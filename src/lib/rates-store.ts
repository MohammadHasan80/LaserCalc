"use client";

// ─────────────────────────────────────────────────────────────
// ذخیره‌سازی پارامترهای کاربر (نرخ‌ها) در localStorage
// اگر کلیدی در نسخه‌های بعدی اضافه شود، مقدار پیش‌فرض جایگزین می‌شود
// ─────────────────────────────────────────────────────────────

import {
  DEFAULT_RATES,
  normalizeRateKey,
  type RatesConfig,
  type SheetType,
} from "@/lib/pricing";

const RATES_KEY = "laser-rates";
const RATES_VERSION = 1;

function safeParse(raw: string | null): Partial<RatesConfig> | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Partial<RatesConfig>;
  } catch {
    return null;
  }
}

/** کلیدهای نسخه‌های قبل (مثل «ورق روغنی-1mm») به شکل جدید («روغنی-1mm») تبدیل می‌شود */
function migrateKeys(obj: unknown): Record<string, unknown> {
  if (!obj || typeof obj !== "object") return {};
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj as Record<string, unknown>))
    out[normalizeRateKey(k)] = v;
  return out;
}

/** پارامترهای ذخیره‌شدهٔ کاربر — در نبودِ مقادیر ذخیره‌شده، پیش‌فرض برمی‌گردد */
export function loadRates(): RatesConfig {
  if (typeof window === "undefined") return { ...DEFAULT_RATES };
  const savedRaw = safeParse(localStorage.getItem(RATES_KEY));
  if (!savedRaw) return { ...DEFAULT_RATES };
  // مهاجرت کلیدهای قدیمی
  const saved: Partial<RatesConfig> = {
    ...savedRaw,
    cuttingRates: migrateKeys(savedRaw.cuttingRates),
    sheetPrices: migrateKeys(savedRaw.sheetPrices),
    densities: migrateKeys(savedRaw.densities) as RatesConfig["densities"],
  };

  const d = DEFAULT_RATES;
  const numOr = (v: unknown, fallback: number): number =>
    typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : fallback;

  // ادغام با پیش‌فرض‌ها تا کلیدهای جدیدِ نسخه‌های آینده مقدار داشته باشند
  const cuttingRates: Record<string, number> = { ...d.cuttingRates };
  if (saved.cuttingRates) {
    for (const k of Object.keys(d.cuttingRates)) {
      if (saved.cuttingRates[k] !== undefined)
        cuttingRates[k] = numOr(saved.cuttingRates[k], d.cuttingRates[k]);
    }
  }

  const sheetPrices: Record<string, number> = { ...d.sheetPrices };
  if (saved.sheetPrices) {
    for (const k of Object.keys(d.sheetPrices)) {
      if (saved.sheetPrices[k] !== undefined)
        sheetPrices[k] = numOr(saved.sheetPrices[k], d.sheetPrices[k]);
    }
  }

  const densities: Record<SheetType, number> = { ...d.densities };
  if (saved.densities) {
    for (const k of Object.keys(d.densities) as SheetType[]) {
      if (saved.densities[k] !== undefined)
        densities[k] = numOr(saved.densities[k], d.densities[k]);
    }
  }

  return {
    version: RATES_VERSION,
    cuttingRates,
    sheetPrices,
    densities,
    prsRate: numOr(saved.prsRate, d.prsRate) || d.prsRate,
  } as RatesConfig;
}

/** ذخیرهٔ پارامترهای کاربر */
export function saveRates(rates: RatesConfig): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(
    RATES_KEY,
    JSON.stringify({ ...rates, version: RATES_VERSION })
  );
}

/** بازگشت کامل به مقادیر پیش‌فرض */
export function resetRates(): RatesConfig {
  if (typeof window !== "undefined") localStorage.removeItem(RATES_KEY);
  return { ...DEFAULT_RATES };
}

/** آیا کاربر تغییری نسبت به پیش‌فرض ذخیره کرده است؟ */
export function hasCustomRates(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(RATES_KEY) !== null;
}
