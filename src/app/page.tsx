"use client";

import { useEffect, useMemo, useState } from "react";
import { DirectionProvider } from "@radix-ui/react-direction";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Zap, Calculator, ReceiptText, History } from "lucide-react";
import { Calculator as CalcView } from "@/components/app/calculator";
import { InvoiceView } from "@/components/app/invoice";
import { HistoryView } from "@/components/app/history";
import { ThemeToggle } from "@/components/app/theme-toggle";
import {
  EMPTY_INPUT,
  calculate,
  type CalcInput,
} from "@/lib/pricing";
import {
  buildSavedInvoice,
  bumpInvoiceCounter,
  deleteInvoice,
  loadInvoices,
  loadInput,
  nextInvoiceNumber,
  persistInput,
  saveInvoice,
  type SavedInvoice,
} from "@/lib/invoice-store";
import { todayJalali } from "@/lib/persian";

type Tab = "calc" | "invoice" | "history";

export default function Home() {
  const { toast } = useToast();
  const [tab, setTab] = useState<Tab>("calc");
  const [input, setInput] = useState<CalcInput>(EMPTY_INPUT);
  const [invoices, setInvoices] = useState<SavedInvoice[]>([]);
  const [invoiceNumber, setInvoiceNumber] = useState("1001");
  const [saved, setSaved] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  // بازیابی از localStorage (خواندن در callback تا از رندر آبشاری جلوگیری شود)
  useEffect(() => {
    let cancelled = false;
    Promise.resolve().then(() => {
      if (cancelled) return;
      setInput({ ...EMPTY_INPUT, ...loadInput(EMPTY_INPUT) });
      setInvoices(loadInvoices());
      setInvoiceNumber(nextInvoiceNumber());
      setHydrated(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // ذخیره خودکار ورودی‌ها
  useEffect(() => {
    if (hydrated) persistInput(input);
  }, [input, hydrated]);

  const result = useMemo(() => calculate(input), [input]);

  const goInvoice = () => {
    setSaved(false);
    setTab("invoice");
  };

  const handleSave = () => {
    if (result.items.length === 0) return;
    const inv = buildSavedInvoice(
      invoiceNumber,
      input,
      result.items,
      result.grandTotal
    );
    setInvoices(saveInvoice(inv));
    setSaved(true);
    setInvoiceNumber(bumpInvoiceCounter());
    toast({
      title: "فاکتور ذخیره شد",
      description: `فاکتور شماره ${inv.number} در تاریخچه ثبت شد.`,
    });
  };

  const handleViewSaved = (inv: SavedInvoice) => {
    setInput({ ...EMPTY_INPUT, ...inv.input });
    setInvoiceNumber(inv.number);
    setSaved(true);
    setTab("invoice");
  };

  const handleDelete = (id: string) => {
    setInvoices(deleteInvoice(id));
    toast({ title: "فاکتور حذف شد" });
  };

  return (
    <DirectionProvider dir="rtl">
    <div className="flex min-h-screen flex-col bg-stone-100 dark:bg-stone-950">
      {/* هدر */}
      <header className="no-print sticky top-0 z-40 border-b bg-stone-900 text-white shadow-md">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-amber-600 text-white shadow-lg shadow-amber-600/30">
              <RialBanknoteIcon className="size-5" />
            </div>
            <div>
              <h1 className="flex items-center gap-1.5 text-lg font-extrabold">
                قیمت برش لیزر
                <Zap className="size-4 text-amber-400" />
              </h1>
              <p className="text-xs text-stone-400">
                محاسبه آنی قیمت و صدور فاکتور
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="rounded-full bg-stone-800 px-3 py-1 text-xs text-stone-300 tabular-nums">
              تاریخ: {todayJalali()}
            </span>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* محتوا */}
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6">
        <Tabs
          value={tab}
          onValueChange={(v) => {
            if (v === "invoice") setSaved(false);
            setTab(v as Tab);
          }}
        >
          <TabsList className="no-print mb-6 grid h-11 w-full max-w-md grid-cols-3 bg-stone-200/70 p-1 dark:bg-stone-800">
            <TabsTrigger
              value="calc"
              className="gap-1.5 data-[state=active]:bg-white data-[state=active]:text-stone-900 dark:data-[state=active]:bg-stone-950 dark:data-[state=active]:text-white"
            >
              <Calculator className="size-4" />
              <span className="text-sm">ماشین‌حساب</span>
            </TabsTrigger>
            <TabsTrigger
              value="invoice"
              className="gap-1.5 data-[state=active]:bg-white data-[state=active]:text-stone-900 dark:data-[state=active]:bg-stone-950 dark:data-[state=active]:text-white"
            >
              <ReceiptText className="size-4" />
              <span className="text-sm">فاکتور</span>
            </TabsTrigger>
            <TabsTrigger
              value="history"
              className="gap-1.5 data-[state=active]:bg-white data-[state=active]:text-stone-900 dark:data-[state=active]:bg-stone-950 dark:data-[state=active]:text-white"
            >
              <History className="size-4" />
              <span className="text-sm">تاریخچه</span>
              {invoices.length > 0 && (
                <Badge className="h-5 bg-amber-600 px-1.5 text-[10px] text-white hover:bg-amber-600">
                  {invoices.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="calc" className="mt-0">
            <CalcView
              input={input}
              onChange={setInput}
              onGoInvoice={goInvoice}
            />
          </TabsContent>

          <TabsContent value="invoice" className="mt-0">
            <InvoiceView
              input={input}
              invoiceNumber={invoiceNumber}
              onInvoiceNumberChange={setInvoiceNumber}
              onPatch={(patch) => setInput((prev) => ({ ...prev, ...patch }))}
              onSave={handleSave}
              saved={saved}
              onBack={() => setTab("calc")}
            />
          </TabsContent>

          <TabsContent value="history" className="mt-0">
            <HistoryView
              invoices={invoices}
              onView={handleViewSaved}
              onDelete={handleDelete}
            />
          </TabsContent>
        </Tabs>
      </main>

      {/* فوتر */}
      <footer className="no-print mt-auto border-t bg-stone-900 py-4 text-center text-xs text-stone-400">
        <p>
          قیمت برش لیزر — بر اساس نرخ‌های روز؛ برای تغییر نرخ‌ها با پشتیبانی
          هماهنگ کنید
        </p>
        <p className="mt-2 flex flex-wrap items-center justify-center gap-x-1.5 gap-y-1">
          <span>گزارش اشکالات و پیشنهادات:</span>
          <a
            href="https://t.me/Aghaghadiri"
            target="_blank"
            rel="noopener noreferrer"
            dir="ltr"
            className="inline-flex items-center gap-1 rounded font-medium text-sky-400 transition-colors hover:text-sky-300"
          >
            <TelegramIcon className="h-3.5 w-3.5" />
            @aghaghadiri
          </a>
        </p>
      </footer>
    </div>
    </DirectionProvider>
  );
}

/** لوگوی تلگرام — مسیر رسمی Simple Icons */
function TelegramIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="#26A5E4"
      className={className}
      aria-hidden="true"
    >
      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
    </svg>
  );
}

/** اسکناس موج‌دار با علامت ریال — SVG سفارشی (لوسید آیکون ریال ندارد) */
function RialBanknoteIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {/* بدنه اسکناس — لبه‌های موجی بالا و پایین */}
      <path d="M2 7c1.7-2 3.3-2 5 0s3.3 2 5 0 3.3-2 5 0 3.3 2 5 0v10c-1.7 2-3.3 2-5 0s-3.3-2-5 0-3.3 2-5 0-3.3-2-5 0z" />
      {/* علامت ریال */}
      <text
        x="12"
        y="14.8"
        textAnchor="middle"
        fontSize="7.5"
        fontWeight="700"
        fill="currentColor"
        stroke="none"
        textLength="9"
        lengthAdjust="spacingAndGlyphs"
        fontFamily="Vazirmatn, 'Noto Naskh Arabic', Tahoma, sans-serif"
      >
        ﷼
      </text>
    </svg>
  );
}
