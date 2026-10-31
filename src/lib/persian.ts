// ─────────────────────────────────────────────────────────────
// ابزارهای فارسی: قالب‌بندی اعداد، عدد به حروف، تاریخ شمسی
// ─────────────────────────────────────────────────────────────

const faFormatter = new Intl.NumberFormat("fa-IR", {
  maximumFractionDigits: 2,
});

const faFormatter0 = new Intl.NumberFormat("fa-IR", {
  maximumFractionDigits: 0,
});

/** قالب‌بندی عدد با جداکننده هزار و ارقام فارسی */
export function faNum(n: number | string | null | undefined): string {
  if (n === null || n === undefined || n === "") return "—";
  const v = typeof n === "string" ? Number(n) : n;
  if (Number.isNaN(v)) return "—";
  return faFormatter.format(v);
}

/** قالب‌بندی عدد صحیح (پول) */
export function faMoney(n: number | string | null | undefined): string {
  if (n === null || n === undefined || n === "") return "—";
  const v = typeof n === "string" ? Number(n) : n;
  if (Number.isNaN(v)) return "—";
  return faFormatter0.format(Math.round(v));
}

/** قالب‌بندی با ارقام لاتین (برای input) */
export function enNum(n: number | string | null | undefined): string {
  if (n === null || n === undefined || n === "") return "";
  const v = typeof n === "string" ? Number(n) : n;
  if (Number.isNaN(v)) return "";
  return String(v);
}

// ─── عدد به حروف فارسی ───────────────────────────────────────

const ONES = [
  "", "یک", "دو", "سه", "چهار", "پنج", "شش", "هفت", "هشت", "نه",
];
const TEENS = [
  "ده", "یازده", "دوازده", "سیزده", "چهارده", "پانزده", "شانزده",
  "هفده", "هجده", "نوزده",
];
const TENS = ["", "", "بیست", "سی", "چهل", "پنجاه", "شصت", "هفتاد", "هشتاد", "نود"];
const HUNDREDS = [
  "", "صد", "دویست", "سیصد", "چهارصد", "پانصد", "ششصد", "هفتصد", "هشتصد", "نهصد",
];
const SCALES = ["", " هزار", " میلیون", " میلیارد", " تریلیون"];

function threeDigitToWords(n: number): string {
  const parts: string[] = [];
  const h = Math.floor(n / 100);
  const rest = n % 100;
  if (h > 0) parts.push(HUNDREDS[h]);
  if (rest >= 10 && rest < 20) {
    parts.push(TEENS[rest - 10]);
  } else {
    const t = Math.floor(rest / 10);
    const o = rest % 10;
    if (t > 0) parts.push(TENS[t]);
    if (o > 0) parts.push(ONES[o]);
  }
  return parts.join(" و ");
}

/** تبدیل عدد صحیح به حروف فارسی (تا تریلیون) */
export function numToPersianWords(n: number): string {
  if (!Number.isFinite(n)) return "";
  if (n === 0) return "صفر";
  const negative = n < 0;
  let x = Math.floor(Math.abs(n));
  const groups: string[] = [];
  let scaleIdx = 0;
  while (x > 0) {
    const g = x % 1000;
    if (g > 0) {
      groups.unshift(threeDigitToWords(g) + SCALES[scaleIdx]);
    }
    x = Math.floor(x / 1000);
    scaleIdx++;
  }
  return (negative ? "منفی " : "") + groups.join(" و ");
}

/** مبلغ به حروف با واحد */
export function moneyToWords(n: number, unit = "ریال"): string {
  const v = Math.round(n);
  if (v === 0) return `صفر ${unit}`;
  return `${numToPersianWords(v)} ${unit}`;
}

// ─── تاریخ شمسی ──────────────────────────────────────────────

const jalaliFmt = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** تاریخ امروز به شمسی (مثلاً ۱۴۰۵/۰۸/۰۶) */
export function todayJalali(date: Date = new Date()): string {
  try {
    const parts = jalaliFmt.formatToParts(date);
    const y = parts.find((p) => p.type === "year")?.value ?? "";
    const m = parts.find((p) => p.type === "month")?.value ?? "";
    const d = parts.find((p) => p.type === "day")?.value ?? "";
    return `${y}/${m}/${d}`;
  } catch {
    return date.toISOString().slice(0, 10);
  }
}

/** تبدیل ارقام فارسی/عربی یک رشته به لاتین (برای ورودی‌های عددی) */
export function toEnDigits(s: string): string {
  const fa = "۰۱۲۳۴۵۶۷۸۹";
  const ar = "٠١٢٣٤٥٦٧٨٩";
  return s.replace(/[۰-۹٠-٩]/g, (ch) => {
    const i = fa.indexOf(ch);
    return String(i >= 0 ? i : ar.indexOf(ch));
  });
}

// ─── ماه شمسی برای گزارش فروش ────────────────────────────────

const jalaliMonthKeyFmt = new Intl.DateTimeFormat("en-u-ca-persian", {
  year: "numeric",
  month: "2-digit",
});

export const PERSIAN_MONTHS = [
  "فروردین",
  "اردیبهشت",
  "خرداد",
  "تیر",
  "مرداد",
  "شهریور",
  "مهر",
  "آبان",
  "آذر",
  "دی",
  "بهمن",
  "اسفند",
];

/** سال و ماه شمسی یک تاریخ (عدد لاتین برای محاسبه) */
export function jalaliYearMonth(date: Date): { y: number; m: number } {
  try {
    const kp = jalaliMonthKeyFmt.formatToParts(date);
    const y = Number(kp.find((p) => p.type === "year")?.value ?? 0);
    const m = Number(kp.find((p) => p.type === "month")?.value ?? 0);
    return { y, m };
  } catch {
    return { y: 0, m: 1 };
  }
}

/** برچسب فارسی ماه شمسی (مثل «آبان ۱۴۰۵») */
export function jalaliMonthLabel(y: number, m: number): string {
  const name = PERSIAN_MONTHS[(m - 1 + 12) % 12] ?? "";
  const yearFa = String(y).replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)]);
  return `${name} ${yearFa}`;
}

/** کلید ماه شمسی (مثل 1405-08 برای مرتب‌سازی/گروه‌بندی) و برچسب فارسی */
export function jalaliMonthInfo(date: Date): { key: string; label: string } {
  const { y, m } = jalaliYearMonth(date);
  return {
    key: `${y}-${String(m).padStart(2, "0")}`,
    label: jalaliMonthLabel(y, m),
  };
}
