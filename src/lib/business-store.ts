"use client";

// ─────────────────────────────────────────────────────────────
// ذخیره‌سازی اطلاعات کسب‌وکار (تنظیمات فاکتور) در localStorage
// فیلدهای خالی = نمایش داده نمی‌شوند؛ فیلدهای جاافتاده با پیش‌فرض پر می‌شوند
// ─────────────────────────────────────────────────────────────

import { DEFAULT_BUSINESS, type BusinessConfig } from "@/lib/business";

const BUSINESS_KEY = "laser-business";

function safeParse(raw: string | null): Partial<BusinessConfig> | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Partial<BusinessConfig>;
  } catch {
    return null;
  }
}

const str = (v: unknown, fallback: string): string =>
  typeof v === "string" ? v.trim() : fallback;

/** اطلاعات کسب‌وکار ذخیره‌شده — در نبودِ مقادیر، پیش‌فرض برمی‌گردد */
export function loadBusiness(): BusinessConfig {
  if (typeof window === "undefined") return { ...DEFAULT_BUSINESS };
  const saved = safeParse(localStorage.getItem(BUSINESS_KEY));
  if (!saved) return { ...DEFAULT_BUSINESS, terms: [...DEFAULT_BUSINESS.terms] };

  const d = DEFAULT_BUSINESS;
  // اگر terms کلید داشته باشد (حتی آرایهٔ خالی = بدون شرط)، همان ملاک است
  const terms =
    Array.isArray(saved.terms)
      ? saved.terms
          .filter((t): t is string => typeof t === "string")
          .map((t) => t.trim())
          .filter((t) => t !== "")
      : d.terms;

  return {
    name: str(saved.name, d.name) || d.name,
    fullName: str(saved.fullName, d.fullName) || d.fullName,
    latinCaption: str(saved.latinCaption, d.latinCaption),
    phone: str(saved.phone, d.phone),
    instagram: str(saved.instagram, d.instagram),
    website: str(saved.website, d.website),
    address: str(saved.address, d.address),
    terms,
  };
}

/** ذخیرهٔ اطلاعات کسب‌وکار */
export function saveBusiness(b: BusinessConfig): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(BUSINESS_KEY, JSON.stringify(b));
}

/** بازگشت کامل به مقادیر پیش‌فرض */
export function resetBusiness(): BusinessConfig {
  if (typeof window !== "undefined") localStorage.removeItem(BUSINESS_KEY);
  return { ...DEFAULT_BUSINESS, terms: [...DEFAULT_BUSINESS.terms] };
}
