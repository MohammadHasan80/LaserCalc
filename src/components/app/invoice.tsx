"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  Printer,
  Save,
  CheckCircle2,
  ArrowRight,
  FileText,
  Download,
  Loader2,
} from "lucide-react";
import { calculate, type CalcInput } from "@/lib/pricing";
import {
  faMoney,
  faNum,
  moneyToWords,
  todayJalali,
  toEnDigits,
} from "@/lib/persian";

interface Props {
  input: CalcInput;
  invoiceNumber: string;
  onInvoiceNumberChange: (v: string) => void;
  onSave: () => void;
  saved: boolean;
  onBack: () => void;
}

/** ساخت PDF از برگ فاکتور و ذخیره (دانلود مرورگر یا پل اندروید) */
async function buildInvoicePdf(node: HTMLElement): Promise<{ blob: Blob; dataUrl: string }> {
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

export function InvoiceView({
  input,
  invoiceNumber,
  onInvoiceNumberChange,
  onSave,
  saved,
  onBack,
}: Props) {
  const { toast } = useToast();
  const result = useMemo(() => calculate(input), [input]);
  const [date] = useState(() => new Date());
  const dateStr = todayJalali(date);
  const [exporting, setExporting] = useState(false);
  // پل اندروید موجود است؟ (در WebView اپ APK چاپ سیستم کار نمی‌کند)
  const [hasBridge, setHasBridge] = useState(false);
  useEffect(() => {
    setHasBridge(
      typeof window !== "undefined" &&
        !!(window as unknown as Record<string, unknown>).AndroidBridge
    );
  }, []);

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

  const customerDisplay = input.customerName.trim()
    ? `شرکت/آقای ${input.customerName.trim()}`
    : "مشتری تعیین نشده";
  const phoneDisplay = input.customerPhone.trim()
    ? input.customerPhone.trim()
    : "شماره وارد نشده";

  return (
    <div className="mx-auto max-w-4xl">
      {/* نوار ابزار (چاپ نمی‌شود) */}
      <div className="no-print mb-4 flex flex-wrap items-center justify-between gap-3">
        <Button variant="ghost" onClick={onBack} className="h-9">
          <ArrowRight className="size-4" /> بازگشت به ماشین‌حساب
        </Button>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2">
            <Label htmlFor="invNo" className="whitespace-nowrap text-xs">
              شماره فاکتور:
            </Label>
            <Input
              id="invNo"
              dir="ltr"
              className="no-spinner h-9 w-28 text-left"
              value={invoiceNumber}
              onChange={(e) =>
                onInvoiceNumberChange(
                  toEnDigits(e.target.value).replace(/[^\d]/g, "")
                )
              }
            />
          </div>
          <Button
            variant="outline"
            onClick={onSave}
            disabled={result.items.length === 0}
            className="h-9"
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
            className="h-9"
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
              className="h-9 bg-amber-600 text-white hover:bg-amber-700"
              disabled={result.items.length === 0}
            >
              <Printer className="size-4" /> چاپ فاکتور
            </Button>
          )}
        </div>
      </div>

      {/* برگ فاکتور */}
      <div
        id="invoice-sheet"
        className="print-area rounded-xl border bg-white p-6 shadow-sm sm:p-10"
      >
        {/* سربرگ */}
        <div className="flex flex-wrap items-start justify-between gap-4 border-b-2 border-stone-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex size-12 items-center justify-center rounded-lg bg-stone-900 text-amber-400">
              <FileText className="size-6" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold">فاکتور برش لیزر</h1>
              <p className="mt-0.5 text-xs text-stone-500">
                محاسبه قیمت برش، پرس و فروش ورق
              </p>
            </div>
          </div>
          <div className="space-y-1 text-left text-sm">
            <p>
              <span className="text-stone-500">تاریخ: </span>
              <span className="font-semibold tabular-nums">{dateStr}</span>
            </p>
            <p>
              <span className="text-stone-500">شماره فاکتور: </span>
              <span className="font-semibold tabular-nums">
                {invoiceNumber ? faNum(invoiceNumber) : "—"}
              </span>
            </p>
          </div>
        </div>

        {/* اطلاعات مشتری */}
        <div className="grid gap-3 border-b py-4 sm:grid-cols-2">
          <p className="text-sm">
            <span className="text-stone-500">نام شخص / شرکت: </span>
            <span className="font-semibold">{customerDisplay}</span>
          </p>
          <p className="text-sm sm:text-left">
            <span className="text-stone-500">شماره موبایل: </span>
            <span className="font-semibold tabular-nums" dir="ltr">
              {phoneDisplay}
            </span>
          </p>
        </div>

        {/* جدول اقلام */}
        <table className="mt-4 w-full border-collapse text-sm">
          <thead>
            <tr className="bg-stone-900 text-white">
              <th className="border border-stone-800 px-2 py-2.5 font-medium">
                ردیف
              </th>
              <th className="border border-stone-800 px-3 py-2.5 text-right font-medium">
                شرح
              </th>
              <th className="border border-stone-800 px-2 py-2.5 font-medium">
                مقدار
              </th>
              <th className="border border-stone-800 px-2 py-2.5 font-medium">
                واحد
              </th>
              <th className="border border-stone-800 px-2 py-2.5 font-medium">
                فی (ریال)
              </th>
              <th className="border border-stone-800 px-3 py-2.5 font-medium">
                مبلغ (ریال)
              </th>
            </tr>
          </thead>
          <tbody>
            {result.items.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="border px-3 py-10 text-center text-stone-400"
                >
                  هنوز موردی برای فاکتور وجود ندارد — به ماشین‌حساب بازگردید و
                  مقادیر را کامل کنید
                </td>
              </tr>
            ) : (
              result.items.map((it) => (
                <tr key={it.row} className="even:bg-stone-50">
                  <td className="border px-2 py-2.5 text-center tabular-nums">
                    {faNum(it.row)}
                  </td>
                  <td className="border px-3 py-2.5">{it.desc}</td>
                  <td className="border px-2 py-2.5 text-center tabular-nums">
                    {faNum(it.qty)}
                  </td>
                  <td className="border px-2 py-2.5 text-center">{it.unit}</td>
                  <td className="border px-2 py-2.5 text-center tabular-nums">
                    {faMoney(it.unitPrice)}
                  </td>
                  <td className="border px-3 py-2.5 text-left tabular-nums">
                    {faMoney(it.amount)}
                  </td>
                </tr>
              ))
            )}
            <tr className="bg-amber-50 font-bold">
              <td
                colSpan={5}
                className="border border-stone-300 px-3 py-3 text-left"
              >
                جمع کل
              </td>
              <td className="border border-stone-300 px-3 py-3 text-left tabular-nums">
                {faMoney(result.invoiceTotal)}
              </td>
            </tr>
          </tbody>
        </table>

        {/* جمع به حروف */}
        <div className="mt-4 rounded-lg border-2 border-dashed border-stone-300 bg-stone-50 p-3">
          <p className="text-xs text-stone-500">جمع کل به حروف:</p>
          <p className="mt-1 text-sm font-semibold">
            {result.invoiceTotal > 0
              ? moneyToWords(result.invoiceTotal)
              : "—"}
          </p>
        </div>

        {/* امضاها */}
        <div className="mt-10 grid grid-cols-2 gap-6 text-center text-sm">
          <div>
            <p className="text-stone-500">امضای فروشنده</p>
            <div className="mt-8 border-t border-stone-300 pt-1" />
          </div>
          <div>
            <p className="text-stone-500">امضای خریدار</p>
            <div className="mt-8 border-t border-stone-300 pt-1" />
          </div>
        </div>
      </div>
    </div>
  );
}
