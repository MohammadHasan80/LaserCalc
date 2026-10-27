"use client";

import { useEffect, useMemo, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Zap, Calculator, ReceiptText, History, Flame } from "lucide-react";
import { Calculator as CalcView } from "@/components/app/calculator";
import { InvoiceView } from "@/components/app/invoice";
import { HistoryView } from "@/components/app/history";
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
    <div className="flex min-h-screen flex-col bg-stone-100 dark:bg-stone-950">
      {/* هدر */}
      <header className="no-print sticky top-0 z-40 border-b bg-stone-900 text-white shadow-md">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-amber-600 text-white shadow-lg shadow-amber-600/30">
              <Flame className="size-5" />
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
      </footer>
    </div>
  );
}
