"use client";

import { useEffect, useMemo, useState } from "react";
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
import { calculate, type CalcInput, type RatesConfig } from "@/lib/pricing";
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

/** ساخت PDF از برگ فاکتور و ذخیره (دانلود مرورگر یا پل اندروید) */
async function buildInvoicePdf(
  node: HTMLElement
): Promise<{ blob: Blob; dataUrl: string }> {
  const [{ toCanvas }, { jsPDF }] = await Promise.all([
    import("html-to-image"),
    import("jspdf"),
  ]);
  if (document.fonts?.ready) await document.fonts.ready;
  const canvas = await toCanvas(node, {
    pixelRatio: 2,
    backgroundColor: "#ffffff",
    style: { boxShadow: "none" },
  });
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
    compress: true,
  });
  const pageW = 210;
  const pageH = 297;
  const imgW = pageW;
  const imgH = (canvas.height * pageW) / canvas.width;
  const scale = imgH > pageH ? pageH / imgH : 1;
  const w = imgW * scale;
  const h = imgH * scale;
  pdf.addImage(
    canvas.toDataURL("image/png"),
    "PNG",
    (pageW - w) / 2,
    0,
    w,
    h,
    undefined,
    "FAST"
  );
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
  useEffect(() => {
    setHasBridge(
      typeof window !== "undefined" &&
        !!(window as unknown as Record<string, unknown>).AndroidBridge
    );
  }, []);

  const baseTotal = result.invoiceTotal;
  const discount = Number(input.discountAmount) || 0;
  const vatPct = Number(input.vatPercent) || 0;
  const vatAmount = result.vatAmount;
  const grandTotal = result.grandTotal;

  const handleDownloadPdf = async () => {
    const node = document.getElementById("invoice-sheet");
    if (!node || exporting) return;
    setExporting(true);
    const filename = `invoice-${invoiceNumber || "0"}.pdf`;
    try {
      const { blob, dataUrl } = await buildInvoicePdf(node);
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

  const metaPills = [
    { icon: FileText, label: "شماره فاکتور:", value: invoiceNumber || "—" },
    { icon: CalendarDays, label: "تاریخ فاکتور:", value: dateStr },
    { icon: Hourglass, label: "مهلت اعتبار:", value: validStr },
  ];

  const customerRows: [string, string][] = [
    ["نام شرکت / شخص:", customerDisplay],
    ["شماره تماس:", phoneDisplay],
    ["آدرس:", addressDisplay],
  ];

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

      {/* ═══════════ برگ فاکتور ═══════════ */}
      <div
        id="invoice-sheet"
        className="print-area overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
      >
        {/* ── هدر سرمه‌ای با تصویر برش لیزر ── */}
        <div className="relative min-h-[128px] overflow-hidden bg-[#13233a] sm:min-h-[150px]">
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
          <div className="absolute inset-y-0 left-0 z-10 flex w-[42%] flex-col justify-center gap-2.5 p-4 sm:p-5">
            <div>
              <p className="text-base font-black leading-7 text-[#f6a21e] sm:text-lg">
                فاکتور خدمات برش لیزر
              </p>
              <p className="text-lg font-black leading-8 text-white sm:text-2xl">
                {biz.fullName}
              </p>
              {biz.latinCaption && (
                <p
                  dir="ltr"
                  className="mt-1 text-right text-[8px] font-semibold tracking-[0.3em] text-slate-400 sm:text-[9px]"
                >
                  {biz.latinCaption}
                </p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1">
              {FEATURES.map(({ icon: Icon, label }) => (
                <span
                  key={label}
                  className="flex items-center gap-1 text-[10px] text-slate-200 sm:text-[11px]"
                >
                  <Icon className="size-3 shrink-0 text-[#f6a21e]" />
                  {label}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-6">
          {/* ── مشخصات مشتری + شماره/تاریخ ── */}
          <div className="grid gap-4 sm:grid-cols-2">
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
              <div className="overflow-hidden rounded-lg border border-slate-200 text-xs sm:text-[13px]">
                {customerRows.map(([label, value], i) => (
                  <div
                    key={label}
                    className={`grid grid-cols-[110px_1fr] sm:grid-cols-[128px_1fr] ${
                      i > 0 ? "border-t border-slate-200" : ""
                    }`}
                  >
                    <span
                      className="flex items-center border-l border-slate-200 bg-slate-100 px-2.5 py-2 font-semibold text-[#13233a]"
                    >
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
                  <div className="flex flex-1 items-center justify-between rounded-md bg-slate-100 px-3 py-2 text-xs sm:text-[13px]">
                    <span className="font-semibold text-[#13233a]">
                      {label}
                    </span>
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
          <table className="mt-5 w-full border-collapse overflow-hidden rounded-lg text-[11px] sm:text-xs">
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
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {/* خلاصه مالی (راست) */}
            <div className="overflow-hidden rounded-lg border border-slate-200 text-xs sm:text-[13px]">
              <div className="flex items-center justify-between bg-slate-100 px-3 py-2.5">
                <span className="font-semibold text-[#13233a]">
                  جمع کل (ریال)
                </span>
                <span className="font-bold tabular-nums text-slate-800">
                  {faMoney(baseTotal)}
                </span>
              </div>
              {discount > 0 && (
                <div className="flex items-center justify-between border-t border-slate-200 px-3 py-2.5">
                  <span className="font-semibold text-[#13233a]">تخفیف</span>
                  <span className="font-bold tabular-nums text-rose-600">
                    {faMoney(discount)}−
                  </span>
                </div>
              )}
              {vatPct > 0 && (
                <div className="flex items-center justify-between border-t border-slate-200 px-3 py-2.5">
                  <span className="font-semibold text-[#13233a]">
                    مالیات بر ارزش افزوده ({faNum(vatPct)}٪)
                  </span>
                  <span className="font-bold tabular-nums text-slate-800">
                    {faMoney(vatAmount)}
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
                  {faMoney(grandTotal)}
                </span>
              </div>
              <div className="border-t border-slate-200 px-3 py-1.5 text-[10px] leading-4 text-slate-500">
                به حروف: {grandTotal > 0 ? moneyToWords(grandTotal) : "—"}
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
                <ul className="space-y-1.5 text-[10px] leading-4 text-slate-600 sm:text-[11px] sm:leading-5">
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

          {/* ── امضاها ── */}
          <div className="mt-6 grid grid-cols-2 gap-4">
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
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t-[3px] border-[#f39c1d] bg-[#13233a] px-4 py-3 text-[11px] text-slate-200 sm:px-6 sm:text-xs">
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
    </div>
  );
}
