"use client";

import { useEffect, useMemo, useState } from "react";
import { DirectionProvider } from "@radix-ui/react-direction";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Zap,
  Calculator,
  ReceiptText,
  History,
  Banknote,
  SlidersHorizontal,
} from "lucide-react";
import { Calculator as CalcView } from "@/components/app/calculator";
import { InvoiceView } from "@/components/app/invoice";
import { HistoryView } from "@/components/app/history";
import { RatesView } from "@/components/app/rates";
import { BusinessView } from "@/components/app/business";
import { BackupCard } from "@/components/app/backup-card";
import { LockCard } from "@/components/app/lock-card";
import { LockScreen } from "@/components/app/lock-screen";
import { ThemeToggle } from "@/components/app/theme-toggle";
import {
  emptyInput,
  calculate,
  DEFAULT_RATES,
  type CalcInput,
  type RatesConfig,
} from "@/lib/pricing";
import {
  loadRates,
  saveRates,
  resetRates,
} from "@/lib/rates-store";
import {
  loadBusiness,
  saveBusiness,
  resetBusiness,
} from "@/lib/business-store";
import {
  DEFAULT_BUSINESS,
  type BusinessConfig,
} from "@/lib/business";
import { uniqueCustomers } from "@/lib/customers";
import {
  isUnlocked,
  loadLock,
  markUnlocked,
  removeLock,
  saveLock,
  type LockConfig,
} from "@/lib/lock";
import {
  buildSavedInvoice,
  bumpInvoiceCounter,
  clearInput,
  deleteInvoice,
  loadInvoices,
  nextInvoiceNumber,
  saveInvoice,
  type SavedInvoice,
} from "@/lib/invoice-store";
import { todayJalali } from "@/lib/persian";

type Tab = "calc" | "invoice" | "history" | "rates";

export default function Home() {
  const { toast } = useToast();
  const [tab, setTab] = useState<Tab>("calc");
  const [input, setInput] = useState<CalcInput>(emptyInput());
  const [invoices, setInvoices] = useState<SavedInvoice[]>([]);
  const [invoiceNumber, setInvoiceNumber] = useState("1001");
  const [saved, setSaved] = useState(false);
  const [rates, setRates] = useState<RatesConfig>(DEFAULT_RATES);
  const [ratesDraft, setRatesDraft] = useState<RatesConfig | null>(null);
  const [business, setBusiness] = useState<BusinessConfig>(DEFAULT_BUSINESS);
  const [businessDraft, setBusinessDraft] = useState<BusinessConfig | null>(
    null
  );
  const [lock, setLock] = useState<LockConfig | null>(null);
  const [locked, setLocked] = useState(false);

  // در شروع برنامه: تاریخچه، شماره فاکتور و پارامترهای کاربر بازیابی می‌شود
  // اما مقادیر فرم همیشه خالی است (پس از خروج از برنامه، مقادیر قبلی نباید برگردند)
  useEffect(() => {
    let cancelled = false;
    Promise.resolve().then(() => {
      if (cancelled) return;
      clearInput();
      setInvoices(loadInvoices());
      setInvoiceNumber(nextInvoiceNumber());
      setRates(loadRates());
      setBusiness(loadBusiness());
      const l = loadLock();
      setLock(l);
      setLocked(l !== null && !isUnlocked());
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const result = useMemo(() => calculate({ ...input, rates }), [input, rates]);

  const customers = useMemo(() => uniqueCustomers(invoices), [invoices]);

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
    setInvoiceNumber(bumpInvoiceCounter());
    // پس از ذخیره، مقادیر فرم خالی می‌شود و برای فاکتور جدید به ماشین‌حساب برمی‌گردیم
    setInput(emptyInput(rates));
    setSaved(false);
    setTab("calc");
    toast({
      title: "فاکتور ذخیره شد",
      description: `فاکتور شماره ${inv.number} در تاریخچه ثبت شد و مقادیر پاک شد.`,
    });
  };

  // پاک کردن همهٔ مقادیر فرم و بازگشت به حالت اولیه
  const handleClear = () => {
    setInput(emptyInput(rates));
    setSaved(false);
    clearInput();
    toast({ title: "مقادیر پاک شد", description: "همه فیلدها به حالت اولیه برگشتند." });
  };

  const handleViewSaved = (inv: SavedInvoice) => {
    setInput({ ...emptyInput(rates), ...inv.input });
    setInvoiceNumber(inv.number);
    setSaved(true);
    setTab("invoice");
  };

  const handleDelete = (id: string) => {
    setInvoices(deleteInvoice(id));
    toast({ title: "فاکتور حذف شد" });
  };

  // ── پارامترها (نرخ‌ها) ──
  const handleSaveRates = (r: RatesConfig) => {
    saveRates(r);
    setRates(r);
    setRatesDraft(null);
    toast({
      title: "پارامترها ذخیره شد",
      description: "نرخ‌های جدید از این پس در همهٔ محاسبات اعمال می‌شود.",
    });
  };

  const handleResetRates = () => {
    setRates(resetRates());
    setRatesDraft(null);
    toast({
      title: "بازگشت به نرخ‌های پیش‌فرض",
      description: "همهٔ پارامترها به مقادیر اولیهٔ برنامه برگشت.",
    });
  };

  // ── اطلاعات کسب‌وکار ──
  const handleSaveBusiness = (b: BusinessConfig) => {
    saveBusiness(b);
    setBusiness(b);
    setBusinessDraft(null);
    toast({
      title: "اطلاعات کسب‌وکار ذخیره شد",
      description: "فاکتورهای بعدی با اطلاعات جدید صادر می‌شود.",
    });
  };

  const handleResetBusiness = () => {
    setBusiness(resetBusiness());
    setBusinessDraft(null);
    toast({
      title: "بازگشت به اطلاعات پیش‌فرض",
      description: "اطلاعات کسب‌وکار به مقادیر اولیهٔ برنامه برگشت.",
    });
  };

  // ── قفل برنامه ──
  const handleUnlock = () => {
    markUnlocked();
    setLocked(false);
  };

  const handleSaveLock = (config: LockConfig) => {
    saveLock(config);
    setLock(config);
  };

  const handleRemoveLock = () => {
    removeLock();
    setLock(null);
  };

  // ── بازیابی از پشتیبان — بارگذاری مجدد همهٔ داده‌ها ──
  const handleImported = () => {
    setInvoices(loadInvoices());
    setInvoiceNumber(nextInvoiceNumber());
    setRates(loadRates());
    setBusiness(loadBusiness());
    setBusinessDraft(null);
    setRatesDraft(null);
    const l = loadLock();
    setLock(l);
    setLocked(l !== null && !isUnlocked());
  };

  return (
    <DirectionProvider dir="rtl">
    <div className="flex min-h-screen flex-col bg-stone-100 dark:bg-stone-950">
      {/* هدر */}
      <header className="no-print sticky top-0 z-40 border-b bg-stone-900 text-white shadow-md">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-amber-600 text-white shadow-lg shadow-amber-600/30">
              <Banknote className="size-5" />
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
          <TabsList className="no-print mb-6 grid h-11 w-full max-w-xl grid-cols-4 bg-stone-200/70 p-1 dark:bg-stone-800">
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
            <TabsTrigger
              value="rates"
              className="gap-1.5 data-[state=active]:bg-white data-[state=active]:text-stone-900 dark:data-[state=active]:bg-stone-950 dark:data-[state=active]:text-white"
            >
              <SlidersHorizontal className="size-4" />
              <span className="text-sm">پارامترها</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="calc" className="mt-0">
            <CalcView
              input={input}
              rates={rates}
              customers={customers}
              onChange={setInput}
              onGoInvoice={goInvoice}
              onClear={handleClear}
            />
          </TabsContent>

          <TabsContent value="invoice" className="mt-0">
            <InvoiceView
              input={input}
              rates={rates}
              business={business}
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

          <TabsContent value="rates" className="mt-0">
            <div className="mx-auto max-w-3xl space-y-6">
              <BusinessView
                business={business}
                draft={businessDraft}
                onDraftChange={setBusinessDraft}
                onSave={handleSaveBusiness}
                onReset={handleResetBusiness}
              />
              <RatesView
                rates={rates}
                draft={ratesDraft}
                onDraftChange={setRatesDraft}
                onSave={handleSaveRates}
                onReset={handleResetRates}
              />
              <BackupCard onImported={handleImported} />
              <LockCard
                lock={lock}
                onSave={handleSaveLock}
                onRemove={handleRemoveLock}
              />
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* فوتر */}
      <footer className="no-print mt-auto border-t bg-stone-900 py-4 text-center text-xs text-stone-400">
        <p>
          قیمت برش لیزر — نرخ‌ها را می‌توانید خودتان از تب «پارامترها» مطابق
          نرخ‌های روز تغییر دهید
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

      {/* صفحهٔ قفل — در شروع هر اجرا اگر قفل فعال باشد */}
      {locked && lock && (
        <LockScreen
          lock={lock}
          appName="قیمت برش لیزر"
          onUnlocked={handleUnlock}
        />
      )}
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
