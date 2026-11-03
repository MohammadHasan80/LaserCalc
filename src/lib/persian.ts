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

// ─── تبدیل تاریخ شمسی ↔ میلادی (الگوریتم استاندارد jalaali) ──

export interface JalaliYmd {
  y: number;
  m: number;
  d: number;
}

const jalaliYmdFmt = new Intl.DateTimeFormat("en-u-ca-persian", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** اجزای عددی تاریخ شمسی یک تاریخ میلادی — مثل {y:1405, m:8, d:6} */
export function jalaliYmd(date: Date = new Date()): JalaliYmd {
  try {
    const p = jalaliYmdFmt.formatToParts(date);
    return {
      y: Number(p.find((x) => x.type === "year")?.value ?? 0),
      m: Number(p.find((x) => x.type === "month")?.value ?? 0),
      d: Number(p.find((x) => x.type === "day")?.value ?? 0),
    };
  } catch {
    return { y: 0, m: 1, d: 1 };
  }
}

const jDiv = (a: number, b: number) => ~~(a / b);
const jMod = (a: number, b: number) => a - ~~(a / b) * b;

const JALALI_BREAKS = [
  -61, 9, 38, 199, 426, 686, 756, 818, 1111, 1181, 1210, 1635, 2060, 2097,
  2192, 2262, 2324, 2394, 2456, 3178,
];

/** محاسبهٔ سال کبیسه و روز آغاز سال شمسی در تقویم میلادی */
function jalCal(jy: number): { leap: number; gy: number; march: number } {
  const bl = JALALI_BREAKS.length;
  const gy = jy + 621;
  let leapJ = -14;
  let jp = JALALI_BREAKS[0]!;
  let jump = 0;
  for (let i = 1; i < bl; i += 1) {
    const jm = JALALI_BREAKS[i]!;
    jump = jm - jp;
    if (jy < jm) break;
    leapJ += jDiv(jump, 33) * 8 + jDiv(jMod(jump, 33), 4);
    jp = jm;
  }
  let n = jy - jp;
  leapJ += jDiv(n, 33) * 8 + jDiv(jMod(n, 33) + 3, 4);
  if (jMod(jump, 33) === 4 && jump - n === 4) leapJ += 1;
  const leapG = jDiv(gy, 4) - jDiv((jDiv(gy, 100) + 1) * 3, 4) - 150;
  const march = 20 + leapJ - leapG;
  if (jump - n < 6) n = n - jump + jDiv(jump + 4, 33) * 33;
  let leap = jMod(jMod(n + 1, 33) - 1, 4);
  if (leap === -1) leap = 4;
  return { leap, gy, march };
}

/** شمارهٔ روز ژولینی از تاریخ میلادی */
function g2d(gy: number, gm: number, gd: number): number {
  let d =
    jDiv((gy + jDiv(gm - 8, 6) + 100100) * 1461, 4) +
    jDiv(153 * jMod(gm + 9, 12) + 2, 5) +
    gd -
    34840408;
  d = d - jDiv(jDiv(gy + 100100 + jDiv(gm - 8, 6), 100) * 3, 4) + 752;
  return d;
}

/** تاریخ میلادی از شمارهٔ روز ژولینی */
function d2g(jdn: number): { gy: number; gm: number; gd: number } {
  let j = 4 * jdn + 139361631;
  j += jDiv(jDiv(4 * jdn + 183187720, 146097) * 3, 4) * 4 - 3908;
  const i = jDiv(jMod(j, 1461), 4) * 5 + 308;
  const gd = jDiv(jMod(i, 153), 5) + 1;
  const gm = jMod(jDiv(i, 153), 12) + 1;
  const gy = jDiv(j, 1461) - 100100 + jDiv(8 - gm, 6);
  return { gy, gm, gd };
}

/** شمارهٔ روز ژولینی از تاریخ شمسی */
function j2d(jy: number, jm: number, jd: number): number {
  const r = jalCal(jy);
  return (
    g2d(r.gy, 3, r.march) + (jm - 1) * 31 - jDiv(jm, 7) * (jm - 7) + jd - 1
  );
}

/** تبدیل تاریخ شمسی به میلادی */
export function jalaliToGregorian(
  jy: number,
  jm: number,
  jd: number
): { gy: number; gm: number; gd: number } {
  return d2g(j2d(jy, jm, jd));
}

/** تبدیل تاریخ میلادی به شمسی (وارونهٔ jalaliToGregorian) */
export function gregorianToJalali(
  gy: number,
  gm: number,
  gd: number
): JalaliYmd {
  const jdn = g2d(gy, gm, gd);
  const gy0 = d2g(jdn).gy;
  let jy = gy0 - 621;
  const r = jalCal(jy);
  const jdn1f = g2d(gy0, 3, r.march);
  let k = jdn - jdn1f;
  if (k >= 0) {
    if (k <= 185) {
      return { y: jy, m: 1 + jDiv(k, 31), d: jMod(k, 31) + 1 };
    }
    k -= 186;
  } else {
    jy -= 1;
    k += 179;
    if (r.leap === 1) k += 1;
  }
  return { y: jy, m: 7 + jDiv(k, 30), d: jMod(k, 30) + 1 };
}

/** سال شمسی کبیسه است؟ (اسفند ۳۰ روز دارد) */
export function isJalaliLeap(jy: number): boolean {
  return jalCal(jy).leap === 0;
}

/** تعداد روزهای یک ماه شمسی */
export function jalaliMonthLength(jy: number, jm: number): number {
  if (jm <= 6) return 31;
  if (jm <= 11) return 30;
  return isJalaliLeap(jy) ? 30 : 29;
}

/** تبدیل ارقام لاتین به فارسی (بدون جداکنندهٔ هزار — مناسب سال و روز) */
export function faDigits(s: string | number): string {
  return String(s).replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)] ?? d);
}

/** رشتهٔ نمایشی تاریخ شمسی — مثل ۱۴۰۵/۰۸/۰۶ */
export function formatJalaliYmd({ y, m, d }: JalaliYmd): string {
  return `${faDigits(y)}/${faDigits(String(m).padStart(2, "0"))}/${faDigits(
    String(d).padStart(2, "0")
  )}`;
}
