"use client";

import { useEffect, useMemo, useState } from "react";
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
  Crosshair,
  Timer,
  Gem,
  Cog,
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
 * ساخت PDF در قالب دقیق A4 (تمام‌صفحه):
 * ۱) نسخهٔ اختصاصی فاکتور با عرض ثابت ۷۹۴px (دقیقاً ۲۱۰ میلی‌متر در ۹۶dpi)
 *    به‌صورت پنهان رندر می‌شود و چون ارتفاعش با min-height روی ۱۱۲۳px
 *    (۲۹۷ میلی‌متر) تنظیم شده، خروجی هم‌نسبتِ کاغذ A4 است.
 * ۲) کانواس خروجی ۱:۱ و بدون هیچ حاشیه‌ای روی صفحهٔ A4 می‌نشیند؛ اگر
 *    محتوا از یک صفحه بلندتر شود، به‌صورت تمام‌عرض به صفحه‌های بعدی برش می‌خورد.
 */
async function buildInvoicePdf(): Promise<{ blob: Blob; dataUrl: string }> {
  const [{ toCanvas }, { jsPDF }] = await Promise.all([
    import("html-to-image"),
    import("jspdf"),
  ]);
  if (document.fonts?.ready) await document.fonts.ready;
  const node = document.getElementById("invoice-a4-sheet");
  if (!node) throw new Error("برگ A4 فاکتور پیدا نشد");
  const canvas = await toCanvas(node, {
    pixelRatio: 3,
    backgroundColor: "#ffffff",
  });
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
    compress: true,
  });
  const pageW = 210;
  const pageH = 297;
  // ارتفاع هر برشِ صفحه بر حسب پیکسلِ کانواس (هم‌نسبت A4)
  const sliceH = Math.round((canvas.width * pageH) / pageW);
  const pages = Math.max(1, Math.ceil(canvas.height / sliceH));
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
 * برگ فاکتور — یک ساختار، دو حالت:
 *  - حالت صفحه (پیش‌نمایش واکنش‌گرا در خود برنامه)
 *  - حالت A4 (نسخهٔ ثابت ۷۹۴px برای خروجی PDF و چاپ — تمام‌صفحه)
 */
function InvoiceSheet({ d, a4 = false }: { d: SheetData; a4?: boolean }) {
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
  // نقشهٔ کلاس‌ها: هر عنصر در حالت A4 اندازهٔ ثابتِ متناسب با عرض ۷۹۴px دارد
  const s = a4
    ? {
        root: "flex min-h-[1123px] w-[794px] flex-col bg-white",
        header: "relative h-[150px] shrink-0 overflow-hidden bg-[#13233a]",
        titleWrap:
          "absolute inset-y-0 left-0 z-10 flex w-[42%] flex-col justify-center gap-2.5 p-5",
        logo: "mb-2 size-12 rounded-lg bg-white/95 object-contain p-0.5",
        titleSmall: "text-lg font-black leading-7 text-[#f6a21e]",
        titleBig: "text-2xl font-black leading-8 text-white",
        caption:
          "mt-1 text-right text-[9px] font-semibold tracking-[0.3em] text-slate-400",
        feature: "flex items-center gap-1 text-[11px] text-slate-200",
        body: "flex flex-1 flex-col p-7",
        topGrid: "grid grid-cols-2 gap-5",
        custTable:
          "overflow-hidden rounded-lg border border-slate-200 text-[13px]",
        custRow: "grid grid-cols-[150px_1fr]",
        pill: "flex flex-1 items-center justify-between rounded-md bg-slate-100 px-3 py-2 text-[13px]",
        table:
          "mt-6 w-full border-collapse overflow-hidden rounded-lg text-xs",
        bottomGrid: "mt-6 grid grid-cols-2 gap-5",
        summary:
          "overflow-hidden rounded-lg border border-slate-200 text-[13px]",
        termsText: "space-y-2 text-[11px] leading-5 text-slate-600",
        signatures: "mt-auto grid grid-cols-2 gap-5 pt-7",
        footer:
          "flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t-[3px] border-[#f39c1d] bg-[#13233a] px-7 py-3.5 text-xs text-slate-200",
      }
    : {
        root: "overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm",
        header:
          "relative min-h-[128px] overflow-hidden bg-[#13233a] sm:min-h-[150px]",
        titleWrap:
          "absolute inset-y-0 left-0 z-10 flex w-[42%] flex-col justify-center gap-2.5 p-4 sm:p-5",
        logo: "mb-2 size-10 rounded-lg bg-white/95 object-contain p-0.5 sm:size-12",
        titleSmall: "text-base font-black leading-7 text-[#f6a21e] sm:text-lg",
        titleBig: "text-lg font-black leading-8 text-white sm:text-2xl",
        caption:
          "mt-1 text-right text-[8px] font-semibold tracking-[0.3em] text-slate-400 sm:text-[9px]",
        feature: "flex items-center gap-1 text-[10px] text-slate-200 sm:text-[11px]",
        body: "p-4 sm:p-6",
        topGrid: "grid gap-4 sm:grid-cols-2",
        custTable:
          "overflow-hidden rounded-lg border border-slate-200 text-xs sm:text-[13px]",
        custRow: "grid grid-cols-[110px_1fr] sm:grid-cols-[128px_1fr]",
        pill: "flex flex-1 items-center justify-between rounded-md bg-slate-100 px-3 py-2 text-xs sm:text-[13px]",
        table:
          "mt-5 w-full border-collapse overflow-hidden rounded-lg text-[11px] sm:text-xs",
        bottomGrid: "mt-5 grid gap-4 sm:grid-cols-2",
        summary:
          "overflow-hidden rounded-lg border border-slate-200 text-xs sm:text-[13px]",
        termsText:
          "space-y-1.5 text-[10px] leading-4 text-slate-600 sm:text-[11px] sm:leading-5",
        signatures: "mt-6 grid grid-cols-2 gap-4",
        footer:
          "flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t-[3px] border-[#f39c1d] bg-[#13233a] px-4 py-3 text-[11px] text-slate-200 sm:px-6 sm:text-xs",
      };

  return (
    <div id={a4 ? "invoice-a4-sheet" : undefined} className={s.root}>
      {/* ── هدر سرمه‌ای با تصویر برش لیزر ── */}
      <div className={s.header}>
        <img
          src="/images/invoice-hero.png"
          alt=""
          className="absolute inset-y-0 right-0 h-full w-[58%] object-cover"
          style={{ clipPath: "polygon(7% 0, 100% 0, 100% 100%, 0% 100%)" }}
        />
        {/* نوار مورب نارنجی روی لبه برش تصویر */}
        <div
          className="absolute inset-y-0 z-[1] w-3.5 bg-gradient-to-b from-[#f6a21e] to-[#dd7d0b]"
          style={{
            left: "calc(42% + 8px)",
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
              <span
                className="flex size-7 items-center justify-center rounded-md text-[#f6a21e]"
                style={{ backgroundColor: NAVY }}
              >
                <UserRound className="size-4" />
              </span>
              <h2 className="text-sm font-bold text-[#13233a]">
                مشخصات مشتری
              </h2>
            </div>
            <div className={s.custTable}>
              {customerRows.map(([label, value], i) => (
                <div
                  key={label}
                  className={`${s.custRow} ${
                    i > 0 ? "border-t border-slate-200" : ""
                  }`}
                >
                  <span className="flex items-center border-l border-slate-200 bg-slate-100 px-2.5 py-2 font-semibold text-[#13233a]">
                    {label}
                  </span>
                  <span className="px-2.5 py-2 text-slate-700">{value}</span>
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
              <th className="border border-[#1e3450] px-1.5 py-2.5 text-right font-semibold">
                ردیف
              </th>
              <th className="border border-[#1e3450] px-2.5 py-2.5 text-right font-semibold">
                شرح خدمات
              </th>
              <th className="border border-[#1e3450] px-1.5 py-2.5 text-right font-semibold">
                جنس ورق
              </th>
              <th className="border border-[#1e3450] px-1.5 py-2.5 text-right font-semibold">
                ضخامت (mm)
              </th>
              <th className="border border-[#1e3450] px-1.5 py-2.5 text-right font-semibold">
                تعداد
              </th>
              <th className="border border-[#1e3450] px-1.5 py-2.5 text-right font-semibold">
                قیمت واحد (ریال)
              </th>
              <th className="border border-[#1e3450] px-2.5 py-2.5 text-right font-semibold">
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
                  <td className="border border-slate-200 px-1.5 py-2.5 text-right font-semibold tabular-nums text-[#13233a]">
                    {faNum(it.row)}
                  </td>
                  <td className="border border-slate-200 px-2.5 py-2.5 text-right font-medium text-slate-800">
                    {it.desc}
                  </td>
                  <td className="border border-slate-200 px-1.5 py-2.5 text-right text-slate-600">
                    {it.material ?? "—"}
                  </td>
                  <td className="border border-slate-200 px-1.5 py-2.5 text-right tabular-nums text-slate-600">
                    {it.thickness ? faNum(it.thickness) : "—"}
                  </td>
                  <td className="border border-slate-200 px-1.5 py-2.5 text-right tabular-nums text-slate-700">
                    {faNum(it.qty)} {it.unit}
                  </td>
                  <td className="border border-slate-200 px-1.5 py-2.5 text-right tabular-nums text-slate-700">
                    {faMoney(it.unitPrice)}
                  </td>
                  <td className="border border-slate-200 px-2.5 py-2.5 text-right font-bold tabular-nums text-slate-900">
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
            <div className="flex items-center justify-between bg-slate-100 px-3 py-2.5">
              <span className="font-semibold text-[#13233a]">
                جمع کل (ریال)
              </span>
              <span className="font-bold tabular-nums text-slate-800">
                {faMoney(d.baseTotal)}
              </span>
            </div>
            {d.discount > 0 && (
              <div className="flex items-center justify-between border-t border-slate-200 px-3 py-2.5">
                <span className="font-semibold text-[#13233a]">تخفیف</span>
                <span className="font-bold tabular-nums text-rose-600">
                  {faMoney(d.discount)}−
                </span>
              </div>
            )}
            {d.vatPct > 0 && (
              <div className="flex items-center justify-between border-t border-slate-200 px-3 py-2.5">
                <span className="font-semibold text-[#13233a]">
                  مالیات بر ارزش افزوده ({faNum(d.vatPct)}٪)
                </span>
                <span className="font-bold tabular-nums text-slate-800">
                  {faMoney(d.vatAmount)}
                </span>
              </div>
            )}
            <div
              className="flex items-center justify-between px-3 py-3 text-sm"
              style={{ backgroundColor: ORANGE }}
            >
              <span className="font-black text-[#13233a]">
                مبلغ قابل پرداخت (ریال)
              </span>
              <span className="font-black tabular-nums text-[#13233a]">
                {faMoney(d.grandTotal)}
              </span>
            </div>
            <div className="border-t border-slate-200 px-3 py-1.5 text-[10px] leading-4 text-slate-500">
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
            <div
              key={label}
              className="rounded-lg border border-dashed border-slate-300 px-3 pb-7 pt-2 text-center text-[11px] text-slate-500"
            >
              {label}
              <div className="mt-5 border-t border-dashed border-slate-300" />
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

  const handleDownloadPdf = async () => {
    if (exporting) return;
    setExporting(true);
    const filename = `invoice-${invoiceNumber || "0"}.pdf`;
    try {
      const { blob, dataUrl } = await buildInvoicePdf();
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

      {/* ═══════════ برگ فاکتور — پیش‌نمایش (چاپ از نسخهٔ A4 انجام می‌شود) ═══════════ */}
      <div id="invoice-sheet" className="print-area">
        <InvoiceSheet d={sheetData} />
      </div>

      {/* ═══════ برگ اختصاصی A4 (پنهان) — مبنای خروجی PDF و چاپ تمام‌صفحه ═══════ */}
      {mounted &&
        createPortal(
          <div className="invoice-a4-host" aria-hidden="true">
            <InvoiceSheet d={sheetData} a4 />
          </div>,
          document.body
        )}
    </div>
  );
}
