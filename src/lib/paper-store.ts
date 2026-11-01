"use client";

// ─────────────────────────────────────────────────────────────
// تنظیمات کاغذ فاکتور (اندازهٔ A4/A5 + جهت عمودی/افقی) در localStorage
//
// طرح پایهٔ برگ فاکتور، ثابتِ A4 عمودی (۷۹۴×۱۱۲۳ پیکسل در ۹۶dpi) است و
// برای هر ترکیب کاغذ با «مقیاس یکنواخت» در ابعاد صفحه جای می‌گیرد؛
// بنابراین نسبت‌های طرح در همهٔ حالت‌ها مو‌به‌مو حفظ می‌شود و خروجی
// PDF و چاپ دقیقاً با پیش‌نمایش یکی است.
// ─────────────────────────────────────────────────────────────

export type PaperSize = "a4" | "a5";
export type PaperOrientation = "portrait" | "landscape";

export interface PaperConfig {
  size: PaperSize;
  orientation: PaperOrientation;
}

export const DEFAULT_PAPER: PaperConfig = {
  size: "a4",
  orientation: "portrait",
};

const PAPER_KEY = "laser-paper";

/** ابعاد کاغذ بر حسب میلی‌متر (کاغذی، مستقل از جهت) */
export const PAPER_MM: Record<PaperSize, { w: number; h: number }> = {
  a4: { w: 210, h: 297 },
  a5: { w: 148, h: 210 },
};

/** ابعاد طرح پایهٔ برگ فاکتور بر حسب پیکسل (۹۶dpi) — جدا برای هر جهت */
export const DESIGN_PORTRAIT = { w: 794, h: 1123 }; // A4 عمودی
export const DESIGN_LANDSCAPE = { w: 1123, h: 794 }; // A4 افقی (چیدمان عریض اختصاصی)

/** طرح پایهٔ متناسب با جهت انتخابی */
export function designOf(p: PaperConfig): { w: number; h: number } {
  return p.orientation === "landscape" ? DESIGN_LANDSCAPE : DESIGN_PORTRAIT;
}

/** ابعاد صفحهٔ نهایی بر حسب پیکسل (۹۶dpi) — جهت اعمال شده */
export function pagePx(p: PaperConfig): { w: number; h: number } {
  const mm = PAPER_MM[p.size];
  const w = Math.round((mm.w * 96) / 25.4);
  const h = Math.round((mm.h * 96) / 25.4);
  return p.orientation === "portrait" ? { w, h } : { w: h, h: w };
}

/** ضریب مقیاس یکنواخت طرح پایه برای جای‌گرفتن کامل در کاغذ انتخابی */
export function paperScale(p: PaperConfig): number {
  const page = pagePx(p);
  const d = designOf(p);
  return Math.min(page.w / d.w, page.h / d.h);
}

/** تنظیمات کاغذ ذخیره‌شده — در نبودِ مقادیر معتبر، پیش‌فرض برمی‌گردد */
export function loadPaper(): PaperConfig {
  if (typeof window === "undefined") return { ...DEFAULT_PAPER };
  try {
    const raw = localStorage.getItem(PAPER_KEY);
    if (!raw) return { ...DEFAULT_PAPER };
    const saved = JSON.parse(raw) as Partial<PaperConfig>;
    return {
      size: saved.size === "a5" ? "a5" : "a4",
      orientation:
        saved.orientation === "landscape" ? "landscape" : "portrait",
    };
  } catch {
    return { ...DEFAULT_PAPER };
  }
}

/** ذخیرهٔ تنظیمات کاغذ */
export function savePaper(p: PaperConfig): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(PAPER_KEY, JSON.stringify(p));
}
