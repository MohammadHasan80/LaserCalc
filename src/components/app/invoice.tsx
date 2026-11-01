"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import {
  Printer,
  Save,
  CheckCircle2,
  ArrowRight,
  Download,
  Loader2,
  Minus,
  Plus,
  RotateCcw,
  Crosshair,
  Timer,
  Gem,
  Cog,
  RectangleVertical,
  RectangleHorizontal,
  FileText,
  CalendarDays,
  Hourglass,
  UserRound,
  ClipboardList,
  MapPin,
  Phone,
  Instagram,
  Globe,
} from "lucide-react";
import { calculate, type CalcResult, type CalcInput, type RatesConfig } from "@/lib/pricing";
import {
  DEFAULT_BUSINESS,
  type BusinessConfig,
} from "@/lib/business";
import {
  faMoney,
  faNum,
  moneyToWords,
  todayJalali,
  toEnDigits,
} from "@/lib/persian";
import {
  DEFAULT_PAPER,
  PAPER_MM,
  designOf,
  loadPaper,
  pagePx,
  paperScale,
  savePaper,
  type PaperConfig,
} from "@/lib/paper-store";

interface Props {
  input: CalcInput;
  rates: RatesConfig;
  business?: BusinessConfig;
  invoiceNumber: string;
  onInvoiceNumberChange: (v: string) => void;
  onPatch: (patch: Partial<CalcInput>) => void;
  onSave: () => void;
  saved: boolean;
  onBack: () => void;
}

/** داده‌های لازم برای ترسیم برگ فاکتور */
interface SheetData {
  biz: BusinessConfig;
  result: CalcResult;
  invoiceNumber: string;
  dateStr: string;
  validStr: string;
  baseTotal: number;
  discount: number;
  vatPct: number;
  vatAmount: number;
  grandTotal: number;
  customerDisplay: string;
  phoneDisplay: string;
  addressDisplay: string;
}

/**
 * ساخت PDF در قالب دقیق کاغذ انتخابی (A4/A5، عمودی/افقی — تمام‌صفحه):
 * ۱) نسخهٔ اختصاصی فاکتور با طرح پایهٔ ۷۹۴×۱۱۲۳px (A4 عمودی) به‌صورت پنهان
 *    رندر و با مقیاس یکنواخت در ابعاد کاغذ انتخابی جای می‌گیرد.
 * ۲) کانواس خروجی ۱:۱ و بدون هیچ حاشیه‌ای روی صفحه می‌نشیند؛ اگر
 *    محتوا از یک صفحه بلندتر شود، به‌صورت تمام‌عرض به صفحه‌های بعدی برش می‌خورد.
 */
async function buildInvoicePdf(
  paper: PaperConfig
): Promise<{ blob: Blob; dataUrl: string }> {
  const [{ toCanvas }, { jsPDF }] = await Promise.all([
    import("html-to-image"),
    import("jspdf"),
  ]);
  if (document.fonts?.ready) await document.fonts.ready;
  const node = document.getElementById("invoice-a4-sheet");
  if (!node) throw new Error("برگ فاکتور پیدا نشد");
  const canvas = await toCanvas(node, {
    pixelRatio: 3,
    backgroundColor: "#ffffff",
  });
  const mm = PAPER_MM[paper.size];
  const pdf = new jsPDF({
    orientation: paper.orientation,
    unit: "mm",
    format: paper.size,
    compress: true,
  });
  const pageW = paper.orientation === "portrait" ? mm.w : mm.h;
  const pageH = paper.orientation === "portrait" ? mm.h : mm.w;
  // ارتفاع هر برشِ صفحه بر حسب پیکسلِ کانواس (هم‌نسبت کاغذ)؛ تلورانس ۴px بوم
  // (= حدود ۱px صفحه در pixelRatio ۳) برای حذف صفحه‌های لاشِ نیم‌پیکسلی
  const sliceH = Math.round((canvas.width * pageH) / pageW);
  const pages =
    canvas.height <= sliceH + 4 ? 1 : Math.ceil(canvas.height / sliceH);
  for (let i = 0; i < pages; i++) {
    const y = i * sliceH;
    const h = Math.min(sliceH, canvas.height - y);
    const pageCanvas = document.createElement("canvas");
    pageCanvas.width = canvas.width;
    pageCanvas.height = sliceH;
    const ctx = pageCanvas.getContext("2d");
    if (!ctx) throw new Error("کانتکست کانواس در دسترس نیست");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
    ctx.drawImage(canvas, 0, y, canvas.width, h, 0, 0, canvas.width, h);
    if (i > 0) pdf.addPage();
    // تصویر دقیقاً کل صفحه را می‌پوشاند — بدون حاشیه و بدون مقیاس
    pdf.addImage(
      pageCanvas.toDataURL("image/png"),
      "PNG",
      0,
      0,
      pageW,
      pageH,
      undefined,
      "FAST"
    );
  }
  return { blob: pdf.output("blob"), dataUrl: pdf.output("datauristring") };
}

/** ویژگی‌های نمایش‌داده‌شده در هدر فاکتور */
const FEATURES = [
  { icon: Crosshair, label: "دقت بالا" },
  { icon: Timer, label: "سرعت اجرا" },
  { icon: Gem, label: "کیفیت برش" },
  { icon: Cog, label: "قابل اعتماد" },
] as const;

const NAVY = "#13233a";
const ORANGE = "#f39c1d";

/**
 * نقشهٔ کلاس‌های طرح پرتره (عرض ۷۹۴px، A4 عمودی) — پایهٔ هر دو جهت.
 * نکته: هدر با «flex-row-reverse» ستون عنوان را در جریان عادی نگه می‌دارد تا
 * ارتفاعش با محتوا (لوگو + نام‌ها) رشد کند — بنر هرگز بریده نمی‌شود.
 */
const SHEET_STYLES = {
  root: "flex min-h-[1123px] w-full flex-col bg-white",
  header:
    "relative flex min-h-[190px] shrink-0 flex-row-reverse overflow-hidden bg-[#13233a]",
  titleWrap:
    "relative z-10 flex w-[42%] shrink-0 flex-col justify-center gap-2.5 p-5",
  logo: "mb-2 size-12 rounded-lg bg-white/95 object-contain p-0.5",
  titleSmall: "text-lg font-black leading-7 text-[#f6a21e]",
  titleBig: "text-2xl font-black leading-8 text-white",
  caption:
    "mt-1 text-right text-[9px] font-semibold tracking-[0.3em] text-slate-400",
  feature: "flex items-center gap-1 text-[11px] text-slate-200",
  heroW: "w-[58%]",
  barLeft: "calc(42% + 8px)",
  body: "flex flex-1 flex-col p-7",
  topGrid: "grid grid-cols-2 gap-5",
  secIcon: "flex size-7 items-center justify-center rounded-md text-[#f6a21e]",
  secTitle: "text-sm font-bold text-[#13233a]",
  custTable:
    "overflow-hidden rounded-lg border border-slate-200 text-[13px]",
  custRow: "grid grid-cols-[150px_1fr]",
  custCell:
    "flex items-center border-l border-slate-200 bg-slate-100 px-2.5 py-2 font-semibold text-[#13233a]",
  custCellVal: "px-2.5 py-2 text-slate-700",
  pill: "flex flex-1 items-center justify-between rounded-md bg-slate-100 px-3 py-2 text-[13px]",
  table:
    "mt-6 w-full border-collapse overflow-hidden rounded-lg text-xs",
  cellPadN: "px-1.5 py-2.5",
  cellPadW: "px-2.5 py-2.5",
  bottomGrid: "mt-6 grid grid-cols-2 gap-5",
  summary:
    "overflow-hidden rounded-lg border border-slate-200 text-[13px]",
  sumRowFirst: "flex items-center justify-between bg-slate-100 px-3 py-2.5",
  sumRow: "flex items-center justify-between border-t border-slate-200 px-3 py-2.5",
  sumTotal: "flex items-center justify-between px-3 py-3 text-sm",
  sumNote:
    "border-t border-slate-200 px-3 py-1.5 text-[10px] leading-4 text-slate-500",
  termsText: "space-y-2 text-[11px] leading-5 text-slate-600",
  signatures: "mt-auto grid grid-cols-2 gap-5 pt-7",
  sigBox:
    "rounded-lg border border-dashed border-slate-300 px-3 pb-7 pt-2 text-center text-[11px] text-slate-500",
  sigLine: "mt-5 border-t border-dashed border-slate-300",
  footer:
    "flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t-[3px] border-[#f39c1d] bg-[#13233a] px-7 py-3.5 text-xs text-slate-200",
};

/**
 * بازنویسی‌های طرح افقی (۱۱۲۳×۷۹۴px، A4 افقی):
 * همان ساختار با چیدمان فشرده‌تر عمودی — ارتفاع بنر و فاصله‌ها کمتر تا
 * فاکتور در ارتفاع محدودترِ کاغذ افقی جا شود؛ جدول از عرض اضافه استفاده می‌کند.
 */
const LANDSCAPE_STYLES: Partial<typeof SHEET_STYLES> = {
  root: "flex min-h-[794px] w-full flex-col bg-white",
  header:
    "relative flex min-h-[128px] shrink-0 flex-row-reverse overflow-hidden bg-[#13233a]",
  titleWrap:
    "relative z-10 flex w-[34%] shrink-0 flex-col justify-center gap-1.5 p-4",
  logo: "mb-1 size-9 rounded-lg bg-white/95 object-contain p-0.5",
  titleSmall: "text-sm font-black leading-6 text-[#f6a21e]",
  titleBig: "text-lg font-black leading-7 text-white",
  caption:
    "mt-0.5 text-right text-[8px] font-semibold tracking-[0.3em] text-slate-400",
  feature: "flex items-center gap-1 text-[10px] text-slate-200",
  heroW: "w-[64%]",
  barLeft: "calc(34% + 8px)",
  body: "flex flex-1 flex-col p-4",
  topGrid: "grid grid-cols-[1.15fr_1fr] gap-4",
  secIcon: "flex size-6 items-center justify-center rounded-md text-[#f6a21e]",
  secTitle: "text-[13px] font-bold text-[#13233a]",
  custTable:
    "overflow-hidden rounded-lg border border-slate-200 text-[12px]",
  custRow: "grid grid-cols-[120px_1fr]",
  custCell:
    "flex items-center border-l border-slate-200 bg-slate-100 px-2 py-1.5 font-semibold text-[#13233a]",
  custCellVal: "px-2 py-1.5 text-slate-700",
  pill: "flex flex-1 items-center justify-between rounded-md bg-slate-100 px-3 py-1.5 text-[12px]",
  table:
    "mt-4 w-full border-collapse overflow-hidden rounded-lg text-[11px]",
  cellPadN: "px-1.5 py-1.5",
  cellPadW: "px-2 py-1.5",
  bottomGrid: "mt-4 grid grid-cols-2 gap-4",
  sumRowFirst: "flex items-center justify-between bg-slate-100 px-3 py-1.5",
  sumRow: "flex items-center justify-between border-t border-slate-200 px-3 py-1.5",
  sumTotal: "flex items-center justify-between px-3 py-2 text-sm",
  sumNote:
    "border-t border-slate-200 px-3 py-1 text-[9px] leading-4 text-slate-500",
  termsText: "space-y-1 text-[10px] leading-4 text-slate-600",
  signatures: "mt-auto grid grid-cols-2 gap-4 pt-4",
  sigBox:
    "rounded-lg border border-dashed border-slate-300 px-3 pb-5 pt-1.5 text-center text-[10px] text-slate-500",
  sigLine: "mt-3 border-t border-dashed border-slate-300",
  footer:
    "flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 border-t-[3px] border-[#f39c1d] bg-[#13233a] px-5 py-2.5 text-[11px] text-slate-200",
};

/**
 * برگ فاکتور — طرح ثابت در دو جهت:
 * پرتره ۷۹۴×۱۱۲۳ و افقی ۱۱۲۳×۷۹۴ (چیدمان عریض اختصاصی)؛ همیشه در PageFrame
 * با مقیاس یکنواخت در کاغذ انتخابی جای می‌گیرد.
 */
function InvoiceSheet({
  d,
  landscape = false,
}: {
  d: SheetData;
  landscape?: boolean;
}) {
  const { biz, result } = d;
  const customerRows: [string, string][] = [
    ["نام شرکت / شخص:", d.customerDisplay],
    ["شماره تماس:", d.phoneDisplay],
    ["آدرس:", d.addressDisplay],
  ];
  const metaPills = [
    { icon: FileText, label: "شماره فاکتور:", value: d.invoiceNumber || "—" },
    { icon: CalendarDays, label: "تاریخ فاکتور:", value: d.dateStr },
    { icon: Hourglass, label: "مهلت اعتبار:", value: d.validStr },
  ];
  // نقشهٔ کلاس‌ها بر اساس جهت کاغذ (پرتره/افقی)
  const s = landscape
    ? { ...SHEET_STYLES, ...LANDSCAPE_STYLES }
    : SHEET_STYLES;

  return (
    <div className={s.root}>
      {/* ── هدر سرمه‌ای با تصویر برش لیزر ── */}
      <div className={s.header}>
        <img
          src={`${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/images/invoice-hero.png`}
          alt=""
          className={`absolute inset-y-0 right-0 h-full ${s.heroW} object-cover`}
          style={{ clipPath: "polygon(7% 0, 100% 0, 100% 100%, 0% 100%)" }}
        />
        {/* نوار مورب نارنجی روی لبه برش تصویر */}
        <div
          className="absolute inset-y-0 z-[1] w-3.5 bg-gradient-to-b from-[#f6a21e] to-[#dd7d0b]"
          style={{
            left: s.barLeft,
            transform: "skewX(-13.5deg)",
          }}
        />
        {/* عنوان و ویژگی‌ها — سمت چپ */}
        <div className={s.titleWrap}>
          <div>
            {biz.logo && (
              <img
                src={biz.logo}
                alt=""
                className={s.logo}
              />
            )}
            <p className={s.titleSmall}>فاکتور خدمات برش لیزر</p>
            <p className={s.titleBig}>{biz.fullName}</p>
            {biz.latinCaption && (
              <p dir="ltr" className={s.caption}>
                {biz.latinCaption}
              </p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1">
            {FEATURES.map(({ icon: Icon, label }) => (
              <span key={label} className={s.feature}>
                <Icon className="size-3 shrink-0 text-[#f6a21e]" />
                {label}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className={s.body}>
        {/* ── مشخصات مشتری + شماره/تاریخ ── */}
        <div className={s.topGrid}>
          {/* مشخصات مشتری (راست) */}
          <div>
            <div className="mb-2 flex items-center gap-2">
              <span className={s.secIcon} style={{ backgroundColor: NAVY }}>
                <UserRound className="size-4" />
              </span>
              <h2 className={s.secTitle}>مشخصات مشتری</h2>
            </div>
            <div className={s.custTable}>
              {customerRows.map(([label, value], i) => (
                <div
                  key={label}
                  className={`${s.custRow} ${
                    i > 0 ? "border-t border-slate-200" : ""
                  }`}
                >
                  <span className={s.custCell}>
                    {label}
                  </span>
                  <span className={s.custCellVal}>{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* شماره و تاریخ (چپ) */}
          <div className="flex flex-col justify-center gap-2">
            {metaPills.map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-center gap-2">
                <span
                  className="flex size-8 shrink-0 items-center justify-center rounded-md text-[#f6a21e]"
                  style={{ backgroundColor: NAVY }}
                >
                  <Icon className="size-4" />
                </span>
                <div className={s.pill}>
                  <span className="font-semibold text-[#13233a]">{label}</span>
                  <span
                    className="font-bold tabular-nums text-[#d97706]"
                    suppressHydrationWarning
                  >
                    {value}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── جدول خدمات ── */}
        <table className={s.table}>
          <thead>
            <tr className="text-white" style={{ backgroundColor: NAVY }}>
              <th className={`border border-[#1e3450] ${s.cellPadN} text-right font-semibold`}>
                ردیف
              </th>
              <th className={`border border-[#1e3450] ${s.cellPadW} text-right font-semibold`}>
                شرح خدمات
              </th>
              <th className={`border border-[#1e3450] ${s.cellPadN} text-right font-semibold`}>
                جنس ورق
              </th>
              <th className={`border border-[#1e3450] ${s.cellPadN} text-right font-semibold`}>
                ضخامت (mm)
              </th>
              <th className={`border border-[#1e3450] ${s.cellPadN} text-right font-semibold`}>
                تعداد
              </th>
              <th className={`border border-[#1e3450] ${s.cellPadN} text-right font-semibold`}>
                قیمت واحد (ریال)
              </th>
              <th className={`border border-[#1e3450] ${s.cellPadW} text-right font-semibold`}>
                مبلغ کل (ریال)
              </th>
            </tr>
          </thead>
          <tbody>
            {result.items.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="border border-slate-200 px-3 py-10 text-center text-slate-400"
                >
                  هنوز موردی برای فاکتور وجود ندارد — به ماشین‌حساب بازگردید و
                  مقادیر را کامل کنید
                </td>
              </tr>
            ) : (
              result.items.map((it, i) => (
                <tr
                  key={it.row}
                  className={i % 2 === 1 ? "bg-slate-100" : "bg-white"}
                >
                  <td className={`border border-slate-200 ${s.cellPadN} text-right font-semibold tabular-nums text-[#13233a]`}>
                    {faNum(it.row)}
                  </td>
                  <td className={`border border-slate-200 ${s.cellPadW} text-right font-medium text-slate-800`}>
                    {it.desc}
                  </td>
                  <td className={`border border-slate-200 ${s.cellPadN} text-right text-slate-600`}>
                    {it.material ?? "—"}
                  </td>
                  <td className={`border border-slate-200 ${s.cellPadN} text-right tabular-nums text-slate-600`}>
                    {it.thickness ? faNum(it.thickness) : "—"}
                  </td>
                  <td className={`border border-slate-200 ${s.cellPadN} text-right tabular-nums text-slate-700`}>
                    {faNum(it.qty)} {it.unit}
                  </td>
                  <td className={`border border-slate-200 ${s.cellPadN} text-right tabular-nums text-slate-700`}>
                    {faMoney(it.unitPrice)}
                  </td>
                  <td className={`border border-slate-200 ${s.cellPadW} text-right font-bold tabular-nums text-slate-900`}>
                    {faMoney(it.amount)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* ── خلاصه مالی + توضیحات ── */}
        <div className={s.bottomGrid}>
          {/* خلاصه مالی (راست) */}
          <div className={s.summary}>
            <div className={s.sumRowFirst}>
              <span className="font-semibold text-[#13233a]">
                جمع کل (ریال)
              </span>
              <span className="font-bold tabular-nums text-slate-800">
                {faMoney(d.baseTotal)}
              </span>
            </div>
            {d.discount > 0 && (
              <div className={s.sumRow}>
                <span className="font-semibold text-[#13233a]">تخفیف</span>
                <span className="font-bold tabular-nums text-rose-600">
                  {faMoney(d.discount)}−
                </span>
              </div>
            )}
            {d.vatPct > 0 && (
              <div className={s.sumRow}>
                <span className="font-semibold text-[#13233a]">
                  مالیات بر ارزش افزوده ({faNum(d.vatPct)}٪)
                </span>
                <span className="font-bold tabular-nums text-slate-800">
                  {faMoney(d.vatAmount)}
                </span>
              </div>
            )}
            <div className={s.sumTotal} style={{ backgroundColor: ORANGE }}>
              <span className="font-black text-[#13233a]">
                مبلغ قابل پرداخت (ریال)
              </span>
              <span className="font-black tabular-nums text-[#13233a]">
                {faMoney(d.grandTotal)}
              </span>
            </div>
            <div className={s.sumNote}>
              به حروف: {d.grandTotal > 0 ? moneyToWords(d.grandTotal) : "—"}
            </div>
          </div>

          {/* توضیحات (چپ) — در نبودِ شرط‌ها نمایش داده نمی‌شود */}
          {biz.terms.length > 0 ? (
            <div className="rounded-lg border border-slate-200 p-3">
              <div className="mb-2 flex items-center gap-1.5">
                <ClipboardList className="size-4 text-[#f39c1d]" />
                <span className="text-sm font-bold text-[#e07f0e]">
                  توضیحات:
                </span>
              </div>
              <ul className={s.termsText}>
                {biz.terms.map((t) => (
                  <li key={t} className="flex items-start gap-1.5">
                    <span className="mt-1 size-1.5 shrink-0 rounded-full bg-[#f39c1d]" />
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div />
          )}
        </div>

        {/* ── امضاها — در حالت A4 به پایین صفحه چسبیده می‌ماند ── */}
        <div className={s.signatures}>
          {["مهر و امضای فروشنده", "مهر و امضای مشتری"].map((label) => (
            <div key={label} className={s.sigBox}>
              {label}
              <div className={s.sigLine} />
            </div>
          ))}
        </div>
      </div>

      {/* ── فوتر سرمه‌ای ── */}
      <div className={s.footer}>
        {biz.address && (
          <span className="flex items-center gap-1.5">
            <MapPin className="size-3.5 shrink-0 text-[#f6a21e]" />
            {biz.address}
          </span>
        )}
        {biz.phone && (
          <span className="flex items-center gap-1.5 tabular-nums">
            <Phone className="size-3.5 shrink-0 text-[#f6a21e]" />
            {/* شماره تلفن باید عیناً بدون ممیز و بدون تبدیل نمایش داده شود */}
            <span dir="ltr">{biz.phone}</span>
          </span>
        )}
        {biz.instagram && (
          <span className="flex items-center gap-1.5">
            <Instagram className="size-3.5 shrink-0 text-[#f6a21e]" />
            <span dir="ltr">@{biz.instagram}</span>
          </span>
        )}
        {biz.website && (
          <span className="flex items-center gap-1.5" dir="ltr">
            <Globe className="size-3.5 shrink-0 text-[#f6a21e]" />
            <span>{biz.website}</span>
          </span>
        )}
      </div>
    </div>
  );
}

/**
 * قاب صفحهٔ کاغذ — جعبهٔ بیرونی دقیقاً به ابعاد صفحهٔ کاغذ (px در ۹۶dpi) است و
 * طرح پایه با مقیاس یکنواخت داخل آن جای می‌گیرد (مبنای PDF و چاپ).
 * اگر محتوا بلندتر از یک صفحه شود، جعبه رشد می‌کند و PDF چندصفحه‌ای می‌سازد.
 */
function PageFrame({
  box,
  design,
  scale,
  sheetId,
  className,
  children,
}: {
  box: { w: number; h: number };
  design: { w: number; h: number };
  scale: number;
  sheetId?: string;
  className?: string;
  children: ReactNode;
}) {
  const innerRef = useRef<HTMLDivElement>(null);
  const [contentH, setContentH] = useState(design.h * scale);
  useEffect(() => {
    const el = innerRef.current;
    if (!el) return;
    const update = () =>
      setContentH(Math.max(el.getBoundingClientRect().height, box.h));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [scale, box.h]);
  return (
    <div
      {...(sheetId ? { id: sheetId } : {})}
      className={className}
      style={{
        width: `${Math.round(box.w)}px`,
        height: `${Math.round(contentH)}px`,
        overflow: "hidden",
        position: "relative",
        background: "#fff",
      }}
    >
      <div
        ref={innerRef}
        style={{
          width: `${design.w}px`,
          position: "absolute",
          top: 0,
          right: 0,
          transform: `scale(${scale})`,
          transformOrigin: "top right",
          background: "#fff",
        }}
      >
        {children}
      </div>
    </div>
  );
}

export function InvoiceView({
  input,
  rates,
  business,
  invoiceNumber,
  onInvoiceNumberChange,
  onPatch,
  onSave,
  saved,
  onBack,
}: Props) {
  const biz = business ?? DEFAULT_BUSINESS;
  const { toast } = useToast();
  const result = useMemo(() => calculate({ ...input, rates }), [input, rates]);
  const [date] = useState(() => new Date());
  const dateStr = todayJalali(date);
  const validStr = todayJalali(new Date(date.getTime() + 7 * 86_400_000));
  const [exporting, setExporting] = useState(false);
  // تنظیمات کاغذ فاکتور (اندازه + جهت) — با ماندگاری در localStorage
  const [paper, setPaperState] = useState<PaperConfig>(DEFAULT_PAPER);
  useEffect(() => {
    setPaperState(loadPaper());
  }, []);
  const changePaper = (patch: Partial<PaperConfig>) => {
    setPaperState((prev) => {
      const next = { ...prev, ...patch };
      savePaper(next);
      return next;
    });
  };
  // اندازهٔ قاب پیش‌نمایش برای مقیاس جاشدن در عرض (پیش‌نمایش مو‌به‌مو کاغذ)
  const previewWrapRef = useRef<HTMLDivElement>(null);
  const [wrapW, setWrapW] = useState(0);
  useEffect(() => {
    const el = previewWrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) setWrapW(e.contentRect.width);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // ── بزرگ‌نمایی پیش‌نمایش (۱× تا ۴× نسبت به جاشدن در عرض) ──
  // برای خوانایی فاکتور روی صفحه‌های کوچک؛ خروجی PDF/چاپ تحت تأثیر نیست.
  const [zoom, setZoomState] = useState(1);
  const zoomRef = useRef(1);
  const setZoom = (z: number) => {
    const v = Math.min(4, Math.max(1, z));
    zoomRef.current = v;
    setZoomState(v);
  };
  const stepZoom = (d: number) =>
    setZoom(Math.round((zoomRef.current + d) * 2) / 2);
  // با تغییر کاغذ (اندازه/جهت) بزرگ‌نمایی به حالت عادی برمی‌گردد
  useEffect(() => {
    setZoom(1);
  }, [paper.size, paper.orientation]);

  // زوم دو-انگشتی (Pinch) روی قاب پیش‌نمایش — شنوندهٔ بومی غیر-گذرا
  // تا preventDefault کار کند و حرکت بومی مرورگر مزاحم نشود.
  useEffect(() => {
    const el = previewWrapRef.current;
    if (!el) return;
    const twoDist = (t: TouchList) =>
      Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
    let start = 0;
    let startZoom = 1;
    let pinching = false;
    const onStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        pinching = true;
        start = twoDist(e.touches);
        startZoom = zoomRef.current;
        e.preventDefault();
      }
    };
    const onMove = (e: TouchEvent) => {
      if (!pinching || e.touches.length < 2) return;
      e.preventDefault();
      const next = Math.min(
        4,
        Math.max(1, startZoom * (twoDist(e.touches) / start))
      );
      const prev = zoomRef.current;
      if (next === prev) return;
      zoomRef.current = next;
      setZoomState(next);
      // ثابت نگه‌داشتن نقطهٔ وسط دو انگشت (قاب RTL — مبدأ از راست)
      const rect = el.getBoundingClientRect();
      const mx = (e.touches[0].clientX + e.touches[1].clientX) / 2;
      const my = (e.touches[0].clientY + e.touches[1].clientY) / 2;
      const vx = rect.right - mx;
      const vy = my - rect.top;
      const dR = Math.abs(el.scrollLeft) + vx;
      const dT = el.scrollTop + vy;
      const k = next / prev;
      requestAnimationFrame(() => {
        el.scrollLeft = -(Math.max(0, dR * k - vx));
        el.scrollTop = Math.max(0, dT * k - vy);
      });
    };
    const onEnd = (e: TouchEvent) => {
      if (pinching && e.touches.length < 2) pinching = false;
    };
    el.addEventListener("touchstart", onStart, { passive: false });
    el.addEventListener("touchmove", onMove, { passive: false });
    el.addEventListener("touchend", onEnd);
    el.addEventListener("touchcancel", onEnd);
    return () => {
      el.removeEventListener("touchstart", onStart);
      el.removeEventListener("touchmove", onMove);
      el.removeEventListener("touchend", onEnd);
      el.removeEventListener("touchcancel", onEnd);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // پل اندروید موجود است؟ (در WebView اپ APK چاپ سیستم کار نمی‌کند)
  const [hasBridge, setHasBridge] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setHasBridge(
      typeof window !== "undefined" &&
        !!(window as unknown as Record<string, unknown>).AndroidBridge
    );
    setMounted(true);
  }, []);

  const baseTotal = result.invoiceTotal;
  const discount = Number(input.discountAmount) || 0;
  const vatPct = Number(input.vatPercent) || 0;
  const vatAmount = result.vatAmount;
  const grandTotal = result.grandTotal;

  // هندسهٔ کاغذ انتخابی + طرح پایهٔ متناسب با جهت
  const page = pagePx(paper);
  const design = designOf(paper);
  const isLandscape = paper.orientation === "landscape";
  // جعبهٔ صفحه برای خروجی PDF/چاپ — حاشیهٔ ایمنی ۰٫۲۵٪ برای جلوگیری از
  // سرریز نیم‌پیکسلی و صفحهٔ خالی اضافه در چاپ
  const box = { w: page.w * 0.9975, h: page.h * 0.9975 };
  // مقیاس داخلی: جای‌گیری کامل طرح پایه در جعبهٔ صفحه
  const printScale = Math.min(box.w / design.w, box.h / design.h);
  // مقیاس جاشدن در عرض (پایهٔ زوم) و مقیاس نهایی پس از بزرگ‌نمایی
  const fitScale = wrapW > 0 ? Math.min(wrapW / page.w, 1) : 0;
  const previewScale = fitScale * zoom;
  const pageSizeLabel = `${paper.size.toUpperCase()} ${paper.orientation === "portrait" ? "عمودی" : "افقی"}`;

  const handleDownloadPdf = async () => {
    if (exporting) return;
    setExporting(true);
    const filename = `invoice-${invoiceNumber || "0"}.pdf`;
    try {
      const { blob, dataUrl } = await buildInvoicePdf(paper);
      const bridge = (
        window as unknown as {
          AndroidBridge?: { savePdf?: (b64: string, name: string) => string };
        }
      ).AndroidBridge;
      if (bridge?.savePdf) {
        const base64 = dataUrl.split("base64,")[1] ?? "";
        const res = bridge.savePdf(base64, filename);
        if (res === "ok") {
          toast({
            title: "PDF ذخیره شد",
            description: `فایل ${filename} در پوشه Downloads ذخیره شد.`,
          });
        } else if (res === "permission") {
          toast({
            title: "اجازه دسترسی به حافظه",
            description:
              "اجازه ذخیره‌سازی را تأیید کنید؛ فایل به‌صورت خودکار ذخیره می‌شود.",
          });
        } else {
          toast({ title: "ذخیره PDF ناموفق بود", variant: "destructive" });
        }
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 4000);
        toast({ title: "PDF دانلود شد", description: filename });
      }
    } catch (err) {
      console.error("PDF_EXPORT_ERROR", err);
      toast({ title: "ساخت PDF ناموفق بود", variant: "destructive" });
    } finally {
      setExporting(false);
    }
  };

  const numPatch = (key: "vatPercent" | "discountAmount") => (raw: string) => {
    const clean = toEnDigits(raw).replace(/[^\d.]/g, "");
    onPatch({ [key]: clean === "" ? 0 : Number(clean) });
  };

  const customerDisplay = input.customerName.trim()
    ? input.customerName.trim()
    : "مشتری تعیین نشده";
  const phoneDisplay = input.customerPhone.trim()
    ? input.customerPhone.trim()
    : "—";
  const addressDisplay = input.customerAddress.trim()
    ? input.customerAddress.trim()
    : "—";

  // داده‌های مشترک برگ فاکتور (پیش‌نمایش و نسخهٔ A4)
  const sheetData: SheetData = {
    biz,
    result,
    invoiceNumber,
    dateStr,
    validStr,
    baseTotal,
    discount,
    vatPct,
    vatAmount,
    grandTotal,
    customerDisplay,
    phoneDisplay,
    addressDisplay,
  };

  return (
    <div className="mx-auto max-w-4xl">
      {/* نوار ابزار (چاپ نمی‌شود) */}
      <div className="no-print mb-4 flex items-center">
        <Button variant="ghost" onClick={onBack} className="h-9">
          <ArrowRight className="size-4" /> بازگشت به ماشین‌حساب
        </Button>
      </div>

      {/* تنظیمات فاکتور — داخل کادر مثل بخش ماشین‌حساب (چاپ نمی‌شود) */}
      <Card className="no-print mb-4">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <ClipboardList className="size-4 text-amber-600 dark:text-amber-500" />
            تنظیمات فاکتور
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="invNo">شماره فاکتور</Label>
              <Input
                id="invNo"
                dir="ltr"
                type="tel"
                inputMode="numeric"
                className="no-spinner text-right"
                value={invoiceNumber}
                onChange={(e) =>
                  onInvoiceNumberChange(
                    toEnDigits(e.target.value).replace(/[^\d]/g, "")
                  )
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vatPct">ارزش افزوده ٪</Label>
              <Input
                id="vatPct"
                dir="ltr"
                inputMode="decimal"
                className="no-spinner text-right"
                value={vatPct > 0 ? String(vatPct) : ""}
                placeholder="0"
                onChange={(e) => numPatch("vatPercent")(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="discount">تخفیف (ریال)</Label>
              <Input
                id="discount"
                dir="ltr"
                inputMode="decimal"
                className="no-spinner text-right"
                value={discount > 0 ? String(discount) : ""}
                placeholder="0"
                onChange={(e) => numPatch("discountAmount")(e.target.value)}
              />
            </div>
          </div>
          {/* ── اندازه و جهت کاغذ فاکتور ── */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>اندازهٔ کاغذ</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={paper.size === "a4" ? "default" : "outline"}
                  onClick={() => changePaper({ size: "a4" })}
                  className="h-9"
                >
                  <span dir="ltr" className="font-bold">A4</span>
                  <span className="text-xs opacity-80">۲۱۰×۲۹۷</span>
                </Button>
                <Button
                  type="button"
                  variant={paper.size === "a5" ? "default" : "outline"}
                  onClick={() => changePaper({ size: "a5" })}
                  className="h-9"
                >
                  <span dir="ltr" className="font-bold">A5</span>
                  <span className="text-xs opacity-80">۱۴۸×۲۱۰</span>
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>جهت کاغذ</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={paper.orientation === "portrait" ? "default" : "outline"}
                  onClick={() => changePaper({ orientation: "portrait" })}
                  className="h-9"
                >
                  <RectangleVertical className="size-4" />
                  عمودی
                </Button>
                <Button
                  type="button"
                  variant={paper.orientation === "landscape" ? "default" : "outline"}
                  onClick={() => changePaper({ orientation: "landscape" })}
                  className="h-9"
                >
                  <RectangleHorizontal className="size-4" />
                  افقی
                </Button>
              </div>
            </div>
          </div>
          <p className="text-[11px] leading-4 text-slate-500">
            خروجی PDF و چاپ دقیقاً با همین اندازه و جهت ساخته می‌شود
            (حالت فعلی: {pageSizeLabel}).
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={onSave}
              disabled={result.items.length === 0}
              className="min-w-40 flex-1"
            >
              {saved ? (
                <CheckCircle2 className="size-4 text-emerald-600" />
              ) : (
                <Save className="size-4" />
              )}
              {saved ? "ذخیره شد" : "ذخیره فاکتور"}
            </Button>
            <Button
              onClick={handleDownloadPdf}
              disabled={result.items.length === 0 || exporting}
              className="min-w-40 flex-1"
            >
              {exporting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Download className="size-4" />
              )}
              {exporting ? "در حال ساخت…" : "دانلود PDF"}
            </Button>
            {!hasBridge && (
              <Button
                onClick={() => window.print()}
                disabled={result.items.length === 0}
                className="min-w-40 flex-1 bg-[#f39c1d] text-white hover:bg-[#dd8a10]"
              >
                <Printer className="size-4" /> چاپ فاکتور
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ═════ برگ فاکتور — پیش‌نمایش دقیق کاغذ، با بزرگ‌نمایی برای خوانایی ═════ */}
      <div id="invoice-sheet" className="print-area">
        {/* نوار کنترل بزرگ‌نمایی — فقط برای نمایش، چاپ نمی‌شود */}
        <div className="no-print mb-2 flex items-center justify-between gap-3">
          <span className="text-[11px] text-slate-500">
            پیش‌نمایش کاغذ — {pageSizeLabel}
          </span>
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="icon"
              className="size-8"
              onClick={() => stepZoom(-0.5)}
              disabled={zoom <= 1}
              aria-label="کوچک‌نمایی"
            >
              <Minus className="size-4" />
            </Button>
            <span className="min-w-11 text-center text-xs font-bold tabular-nums text-slate-600">
              {faNum(Math.round(zoom * 100))}٪
            </span>
            <Button
              variant="outline"
              size="icon"
              className="size-8"
              onClick={() => stepZoom(0.5)}
              disabled={zoom >= 4}
              aria-label="بزرگ‌نمایی"
            >
              <Plus className="size-4" />
            </Button>
            {zoom !== 1 && (
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                onClick={() => setZoom(1)}
                aria-label="اندازهٔ عادی"
              >
                <RotateCcw className="size-4" />
              </Button>
            )}
          </div>
        </div>
        {fitScale > 0 && fitScale < 0.75 && zoom === 1 && (
          <p className="no-print mb-2 text-[11px] leading-4 text-amber-600 dark:text-amber-500">
            برگ برای جا شدن در صفحهٔ گوشی کوچک شده است — برای خواندن متن، با
            دکمه‌ها یا با دو انگشت بزرگ‌نمایی کنید.
          </p>
        )}
        <div
          ref={previewWrapRef}
          className="custom-scroll overflow-auto"
          style={{ touchAction: "pan-x pan-y" }}
        >
          {previewScale > 0 && (
            <div className="mx-auto w-fit">
              <PageFrame
                box={{ w: page.w * previewScale, h: page.h * previewScale }}
                design={design}
                scale={previewScale * paperScale(paper)}
                className="rounded-sm shadow-md ring-1 ring-slate-200"
              >
                <InvoiceSheet d={sheetData} landscape={isLandscape} />
              </PageFrame>
            </div>
          )}
        </div>
      </div>

      {/* ═══ برگ پنهان — قاب دقیق کاغذ انتخابی، مبنای خروجی PDF و چاپ ═══ */}
      {mounted &&
        createPortal(
          <div className="invoice-a4-host" aria-hidden="true">
            <PageFrame
              box={box}
              design={design}
              scale={printScale}
              sheetId="invoice-a4-sheet"
            >
              <InvoiceSheet d={sheetData} landscape={isLandscape} />
            </PageFrame>
          </div>,
          document.body
        )}

      {/* اندازهٔ صفحهٔ چاپ مطابق کاغذ انتخابی (A4/A5، عمودی/افقی) */}
      <style
        dangerouslySetInnerHTML={{
          __html: `@media print { @page { size: ${paper.size.toUpperCase()} ${paper.orientation}; margin: 0; } }`,
        }}
      />
    </div>
  );
}
