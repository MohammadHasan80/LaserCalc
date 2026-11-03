"use client";

// ─────────────────────────────────────────────────────────────
// تنظیمات نمایش فاکتور — ماندگار در localStorage:
// ۱) mono: فاکتور رنگی یا سیاه‌وسفید (برای چاپ اقتصادی لیزری/جوهرافشان)
// ۲) cal:  تقویم نمایش تاریخ در بخش تنظیم — شمسی (پیش‌فرض) یا میلادی
//
// الگوی ذخیره‌سازی عیناً مثل paper-store است. از v1.1.19 فاکتور
// (پیش‌نمایش، PDF، مهلت اعتبار و نام فایل) همیشه شمسی است و «cal»
// فقط نحوهٔ نمایش تاریخ تنظیم‌شده در بخش تنظیم فاکتور را عوض می‌کند.
// ─────────────────────────────────────────────────────────────

export type InvoiceCalendar = "jalali" | "gregorian";

export interface InvoicePrefs {
  mono: boolean;
  cal: InvoiceCalendar;
}

export const DEFAULT_INVOICE_PREFS: InvoicePrefs = {
  mono: false,
  cal: "jalali",
};

const PREFS_KEY = "laser-invoice-prefs";

/** تنظیمات ذخیره‌شده — در نبودِ مقادیر معتبر، پیش‌فرض برمی‌گردد */
export function loadInvoicePrefs(): InvoicePrefs {
  if (typeof window === "undefined") return { ...DEFAULT_INVOICE_PREFS };
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return { ...DEFAULT_INVOICE_PREFS };
    const saved = JSON.parse(raw) as Partial<InvoicePrefs>;
    return {
      mono: saved.mono === true,
      cal: saved.cal === "gregorian" ? "gregorian" : "jalali",
    };
  } catch {
    return { ...DEFAULT_INVOICE_PREFS };
  }
}

/** ذخیرهٔ تنظیمات نمایش فاکتور */
export function saveInvoicePrefs(p: InvoicePrefs): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(PREFS_KEY, JSON.stringify(p));
}
