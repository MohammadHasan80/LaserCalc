// ─────────────────────────────────────────────────────────────
// موتور محاسبات قیمت برش لیزر — دقیقاً منطق فایل اکسل
// Cutting Price App — pricing engine (Excel-faithful)
// ─────────────────────────────────────────────────────────────

export const SHEET_TYPES = [
  "ورق روغنی",
  "ورق سیاه",
  "گالوانیزه",
  "استیل",
  "فنر",
] as const;
export type SheetType = (typeof SHEET_TYPES)[number];

export const GAS_TYPES = ["اکسیژن", "نیتروژن"] as const;
export type GasType = (typeof GAS_TYPES)[number];

/** نرخ برش (ریال) به ازای هر متر به ازای هر میلی‌متر ضخامت — E:F */
export const CUTTING_RATES: Record<string, number> = {
  "ورق روغنی-اکسیژن": 100_000,
  "ورق روغنی-نیتروژن": 100_000,
  "ورق سیاه-اکسیژن": 100_000,
  "ورق سیاه-نیتروژن": 100_000,
  "استیل-اکسیژن": 190_000,
  "استیل-نیتروژن": 220_000,
  "گالوانیزه-اکسیژن": 165_000,
  "گالوانیزه-نیتروژن": 220_000,
  "فنر-اکسیژن": 165_000,
  "فنر-نیتروژن": 220_000,
};

/** نرخ ورق (ریال به ازای هر کیلوگرم) — O:P */
export const SHEET_PRICES: Record<string, number> = {
  "ورق روغنی-0.7mm": 750_000,
  "ورق روغنی-1mm": 1_000_000,
  "ورق روغنی-1.25mm": 670_000,
  "ورق روغنی-1.5mm": 2_100_000,
  "ورق سیاه-2mm": 2_300_000,
  "ورق سیاه-3mm": 1_500_000,
  "ورق سیاه-4mm": 1_400_000,
  "ورق سیاه-5mm": 600_000,
  "ورق سیاه-6mm": 1_500_000,
  "ورق سیاه-8mm": 600_000,
  "ورق سیاه-9mm": 600_000,
  "ورق سیاه-10mm": 1_500_000,
  "استیل-0.7mm": 4_000_000,
  "استیل-1mm": 4_000_000,
  "استیل-1.5mm": 4_000_000,
  "گالوانیزه-0.6mm": 780_000,
  "گالوانیزه-0.7mm": 780_000,
  "گالوانیزه-0.9mm": 780_000,
  "گالوانیزه-1mm": 1_100_000,
  "گالوانیزه-1.25mm": 780_000,
  "گالوانیزه-1.5mm": 2_100_000,
  "گالوانیزه-2mm": 780_000,
};

/** ضخامت‌های ثبت‌شده برای هر نوع ورق */
export const THICKNESS_OPTIONS: Record<SheetType, number[]> = {
  "ورق روغنی": [0.7, 1, 1.25, 1.5],
  "ورق سیاه": [2, 3, 4, 5, 6, 8, 9, 10],
  گالوانیزه: [0.6, 0.7, 0.9, 1, 1.25, 1.5, 2],
  استیل: [0.7, 1, 1.5],
  فنر: [0.5, 0.7, 1, 1.25, 1.5, 2],
};

/** چگالی ورق (g/cm³) — طبق فرمول وزن در اکسل (فنر: فولاد فنر ≈ 7.85) */
export const DENSITY: Record<SheetType, number> = {
  "ورق روغنی": 7.85,
  "ورق سیاه": 7.85,
  استیل: 7.9,
  گالوانیزه: 7.1,
  فنر: 7.85,
};

/** نرخ پیش‌فرض prs (پرس) */
export const DEFAULT_PRS_RATE = 5500;

// ───────── پارامترهای قابل ویرایش توسط کاربر ─────────
// مجموعهٔ کامل نرخ‌هایی که کاربر می‌تواند از تب «پارامترها» تغییر دهد
export interface RatesConfig {
  /** نسخهٔ ساختار داده (برای مهاجرت‌های آینده) */
  version?: number;
  /** نرخ برش (ریال) به ازای هر متر به ازای هر میلی‌متر ضخامت — کلید: «نوع ورق-نوع گاز» */
  cuttingRates: Record<string, number>;
  /** نرخ ورق (ریال بر کیلوگرم) — کلید: «نوع ورق-ضخامتmm» */
  sheetPrices: Record<string, number>;
  /** چگالی ورق‌ها (g/cm³) — برای محاسبهٔ وزن */
  densities: Record<SheetType, number>;
  /** نرخ پیش‌فرض prs (پرس) — ریال */
  prsRate: number;
}

/** مقادیر پیش‌فرض پارامترها (مبنای بازگشت) */
export const DEFAULT_RATES: RatesConfig = {
  cuttingRates: { ...CUTTING_RATES },
  sheetPrices: { ...SHEET_PRICES },
  densities: { ...DENSITY },
  prsRate: DEFAULT_PRS_RATE,
};

export interface SheetDimRow {
  id: string;
  lengthCm: number | "";
  widthCm: number | "";
}

export interface CalcInput {
  customerName: string;
  customerPhone: string;
  customerAddress: string; // آدرس مشتری (اختیاری — برای فاکتور)
  sheetType: SheetType | "";
  gasType: GasType | "";
  thickness: number | "";
  cutLengthPerPiece: number | ""; // متراژ برش برای یک قطعه (m)
  prsPerPiece: number | ""; // تعداد prs برای یک قطعه
  pieceCount: number | ""; // تعداد قطعه
  prsRate: number; // نرخ prs
  designCost: number; // هزینه طراحی
  sheetFromCustomer: boolean; // ورق از مشتری
  sheetPriceManual: number | ""; // نرخ دستی ورق (فی کیلویی) — ریال به ازای هر کیلو
  dims: SheetDimRow[]; // ابعاد ورق‌ها (cm)
  vatPercent: number; // درصد مالیات بر ارزش افزوده (۰ = بدون مالیات)
  discountAmount: number; // تخفیف (ریال)
  rates?: RatesConfig; // پارامترهای کاربر (اگر نباشد از مقادیر پیش‌فرض استفاده می‌شود)
}

export interface InvoiceItem {
  row: number;
  desc: string;
  qty: number | string;
  unit: string;
  unitPrice: number | string;
  amount: number | string;
  material?: string; // جنس ورق (برای ردیف‌های برش/ورق)
  thickness?: string; // ضخامت (میلی‌متر)
}

export interface CalcResult {
  cuttingRate: number | null; // نرخ برش
  cuttingRateError: string | null;
  costPerPiece: number | null; // هزینه برش برای یک قطعه
  costPerPieceError: string | null;
  totalCutting: number | null; // هزینه کل برش
  totalCuttingError: string | null;
  effectivePrsRate: number | null; // نرخ مؤثر prs برای هر عملیات
  totalPrs: number | null; // قیمت کل prs
  totalPrsError: string | null;
  sheetWeight: number | null; // وزن ورق (kg)
  sheetWeightError: string | null;
  sheetPricePerKg: number | null; // نرخ کیلویی ورق
  sheetPricePerKgError: string | null;
  sheetTotal: number | null; // قیمت ورق
  sheetTotalError: string | null;
  totalPrice: number; // قیمت کل
  totalPriceError: string | null;
  perMeter: number | null; // فی (ریال به ازای هر متر برش)
  perMeterError: string | null;
  totalMeters: number | null; // کل متراژ برش
  items: InvoiceItem[]; // ردیف‌های فاکتور
  invoiceTotal: number;
  vatAmount: number; // مالیات بر ارزش افزوده
  grandTotal: number; // مبلغ قابل پرداخت (پس از تخفیف و مالیات)
}

const num = (v: number | ""): number | null =>
  v === "" || v === null || v === undefined || Number.isNaN(Number(v))
    ? null
    : Number(v);

/** نرخ مؤثر prs: اگر ضخامت ≤ 2mm نرخ عادی، وگرنه (ضخامت/2)×نرخ — طبق فرمول B14 */
export function effectivePrsRate(thickness: number, prsRate: number): number {
  return thickness <= 2 ? prsRate : (thickness / 2) * prsRate;
}

/** وزن ورق به کیلوگرم: Σ(طول×عرض cm) × ضخامت mm × چگالی ÷ 10000 — طبق فرمول M2 */
export function sheetWeight(
  dims: SheetDimRow[],
  thickness: number,
  type: SheetType,
  densities: Record<SheetType, number> = DENSITY
): number {
  const area = dims.reduce((s, d) => {
    const l = num(d.lengthCm);
    const w = num(d.widthCm);
    return s + (l && w ? l * w : 0);
  }, 0);
  return (area * thickness * (densities[type] ?? DENSITY[type])) / 10_000;
}

export function calculate(input: CalcInput): CalcResult {
  // پارامترهای مؤثر: تنظیمات کاربر در صورت وجود، وگرنه مقادیر پیش‌فرض
  const CR = input.rates?.cuttingRates ?? CUTTING_RATES;
  const SP = input.rates?.sheetPrices ?? SHEET_PRICES;
  const DN = input.rates?.densities ?? DENSITY;

  const thickness = num(input.thickness);
  const cutLen = num(input.cutLengthPerPiece);
  const prsPer = num(input.prsPerPiece);
  const pieces = num(input.pieceCount);

  // ── نرخ برش (B10) ──
  let cuttingRate: number | null = null;
  let cuttingRateError: string | null = null;
  if (!input.sheetType) cuttingRateError = "نوع ورق را انتخاب کنید";
  else if (!input.gasType) cuttingRateError = "نوع گاز را انتخاب کنید";
  else {
    const r = CR[`${input.sheetType}-${input.gasType}`];
    if (r === undefined) cuttingRateError = "ترکیب نامعتبر";
    else cuttingRate = r;
  }

  // ── هزینه برش برای یک قطعه (B11) = متراژ × نرخ × ضخامت ──
  let costPerPiece: number | null = null;
  let costPerPieceError: string | null = null;
  if (thickness === null) costPerPieceError = "ضخامت را وارد کنید";
  else if (cutLen === null) costPerPieceError = "متراژ برش را وارد کنید";
  else if (cuttingRate === null) costPerPieceError = "نرخ برش نامعتبر";
  else costPerPiece = cutLen * cuttingRate * thickness;

  // ── هزینه کل برش (B12) = هزینه یک قطعه × تعداد قطعه ──
  let totalCutting: number | null = null;
  let totalCuttingError: string | null = null;
  if (pieces === null) totalCuttingError = "تعداد قطعه را وارد کنید";
  else if (costPerPiece === null) totalCuttingError = costPerPieceError;
  else totalCutting = costPerPiece * pieces;

  // ── قیمت کل prs (B14) = نرخ مؤثر × تعداد prs × تعداد قطعه ──
  let totalPrs: number | null = null;
  let totalPrsError: string | null = null;
  let effPrs: number | null = null;
  if (thickness === null) totalPrsError = "ضخامت را وارد کنید";
  else if (prsPer === null) totalPrsError = "تعداد PRS را وارد کنید";
  else if (pieces === null) totalPrsError = "تعداد قطعه را وارد کنید";
  else {
    effPrs = effectivePrsRate(thickness, input.prsRate);
    totalPrs = effPrs * prsPer * pieces;
  }

  // ── وزن و قیمت ورق (M2, M3) ──
  let sheetWt: number | null = null;
  let sheetWeightError: string | null = null;
  let sheetPerKg: number | null = null;
  let sheetPerKgError: string | null = null;
  let sheetTotal: number | null = null;
  let sheetTotalError: string | null = null;

  if (input.sheetFromCustomer) {
    sheetWeightError = "ورق از مشتری";
    sheetTotalError = "ورق از مشتری";
  } else {
    if (thickness === null) {
      sheetWeightError = "ضخامت ورق را وارد کنید";
      sheetTotalError = sheetWeightError;
    } else if (!input.sheetType) {
      sheetWeightError = "نوع ورق را انتخاب کنید";
      sheetTotalError = sheetWeightError;
    } else {
      sheetWt = sheetWeight(input.dims, thickness, input.sheetType, DN);
      const manual = num(input.sheetPriceManual);
      if (manual !== null && manual > 0) {
        // نرخ دستی (فی) ملاک محاسبه است
        sheetPerKg = manual;
        sheetTotal = sheetWt * manual;
      } else {
        const key = `${input.sheetType}-${thickness}mm`;
        const rate = SP[key];
        if (rate === undefined) {
          sheetPerKgError = "نرخ برای این ضخامت ثبت نشده — نرخ دستی وارد کنید";
          sheetTotalError = sheetPerKgError;
        } else {
          sheetPerKg = rate;
          sheetTotal = sheetWt * rate;
        }
      }
    }
  }

  // ── قیمت کل (B16) = برش + prs (+ طراحی + ورق در صورت نیاز) ──
  let totalPrice = 0;
  let totalPriceError: string | null = null;
  if (totalCutting === null) totalPriceError = "هزینه کل برش محاسبه نشده";
  else if (totalPrs === null) totalPriceError = "قیمت کل PRS محاسبه نشده";
  else {
    totalPrice = totalCutting + totalPrs + (input.designCost || 0);
    if (!input.sheetFromCustomer && sheetTotal !== null)
      totalPrice += sheetTotal;
  }

  // ── فی (B17) = قیمت کل ÷ (تعداد قطعه × متراژ) ──
  let perMeter: number | null = null;
  let perMeterError: string | null = null;
  const totalMeters =
    pieces !== null && cutLen !== null ? pieces * cutLen : null;
  if (totalPriceError) perMeterError = totalPriceError;
  else if (!totalMeters) perMeterError = "متراژ و تعداد قطعه را وارد کنید";
  else perMeter = totalPrice / totalMeters;

  // ── ردیف‌های فاکتور ──
  const items: InvoiceItem[] = [];
  let row = 1;
  if (totalMeters && costPerPiece !== null && pieces !== null) {
    items.push({
      row: row++,
      desc: `برش لیزر — گاز ${input.gasType}`,
      qty: round2(totalMeters),
      unit: "متر",
      unitPrice: round2(costPerPiece / cutLen!),
      amount: Math.round(totalCutting!),
      material: input.sheetType,
      thickness: String(thickness),
    });
  }
  if (totalPrs !== null && totalPrs > 0 && pieces !== null && prsPer !== null) {
    items.push({
      row: row++,
      desc: `پرس (prs) — ${prsPer} عملیات برای هر قطعه`,
      qty: prsPer * pieces,
      unit: "عدد",
      unitPrice: Math.round(effPrs ?? input.prsRate),
      amount: Math.round(totalPrs),
    });
  }
  if (!input.sheetFromCustomer && sheetTotal !== null && sheetTotal > 0) {
    items.push({
      row: row++,
      desc: `ورق ${input.sheetType}`,
      qty: round2(sheetWt ?? 0),
      unit: "کیلو",
      unitPrice: Math.round(sheetPerKg ?? 0),
      amount: Math.round(sheetTotal),
      material: input.sheetType,
      thickness: String(thickness),
    });
  }
  if (input.designCost > 0) {
    items.push({
      row: row++,
      desc: "هزینه طراحی",
      qty: 1,
      unit: "مورد",
      unitPrice: Math.round(input.designCost),
      amount: Math.round(input.designCost),
    });
  }

  // ── مالیات، تخفیف و مبلغ قابل پرداخت ──
  const baseSum = items.reduce(
    (s, it) => s + (typeof it.amount === "number" ? it.amount : 0),
    0
  );
  const pct = Number(input.vatPercent) || 0;
  const disc = Number(input.discountAmount) || 0;
  const net = Math.max(0, baseSum - disc);
  const vatAmount = pct > 0 ? Math.round((net * pct) / 100) : 0;
  const grandTotal = net + vatAmount;

  return {
    cuttingRate,
    cuttingRateError,
    costPerPiece,
    costPerPieceError,
    totalCutting,
    totalCuttingError,
    effectivePrsRate: effPrs,
    totalPrs,
    totalPrsError,
    sheetWeight: sheetWt,
    sheetWeightError,
    sheetPricePerKg: sheetPerKg,
    sheetPricePerKgError: sheetPerKgError,
    sheetTotal,
    sheetTotalError,
    totalPrice: totalPriceError ? 0 : totalPrice,
    totalPriceError,
    perMeter,
    perMeterError,
    totalMeters,
    items,
    invoiceTotal: baseSum,
    vatAmount,
    grandTotal: totalPriceError ? 0 : grandTotal,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** فرم خالی با نرخ prs پیش‌فرض از پارامترهای کاربر */
export function emptyInput(rates?: RatesConfig): CalcInput {
  return { ...EMPTY_INPUT, prsRate: rates?.prsRate ?? DEFAULT_PRS_RATE };
}

export const EMPTY_INPUT: CalcInput = {
  customerName: "",
  customerPhone: "",
  customerAddress: "",
  sheetType: "",
  gasType: "",
  thickness: "",
  cutLengthPerPiece: "",
  prsPerPiece: "",
  pieceCount: "",
  prsRate: DEFAULT_PRS_RATE,
  designCost: 0,
  sheetFromCustomer: true,
  sheetPriceManual: "",
  vatPercent: 0, // پیش‌فرض: بدون مالیات بر ارزش افزوده
  discountAmount: 0,
  dims: [{ id: "d1", lengthCm: "", widthCm: "" }],
};
