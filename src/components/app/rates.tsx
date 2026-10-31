"use client";

// ─────────────────────────────────────────────────────────────
// تب «پارامترها» — ویرایش نرخ‌های برنامه توسط کاربر
// نرخ برش، نرخ ورق، نرخ prs و چگالی ورق‌ها
// ─────────────────────────────────────────────────────────────

import { useEffect, useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  SlidersHorizontal,
  Save,
  RotateCcw,
  Trash2,
  Plus,
  Info,
  Undo2,
} from "lucide-react";
import {
  DEFAULT_RATES,
  SHEET_TYPES,
  GAS_TYPES,
  THICKNESS_OPTIONS,
  type RatesConfig,
  type SheetType,
} from "@/lib/pricing";
import { faNum, toEnDigits } from "@/lib/persian";

interface Props {
  rates: RatesConfig; // مقادیر ذخیره‌شده
  draft: RatesConfig | null; // پیش‌نویس در حال ویرایش (null = همگام با ذخیره‌شده)
  onDraftChange: (r: RatesConfig | null) => void;
  onSave: (r: RatesConfig) => void;
  onReset: () => void;
}

const GAS_ICONS: Record<string, string> = { اکسیژن: "O₂", نیتروژن: "N₂" };

export function RatesView({
  rates,
  draft,
  onDraftChange,
  onSave,
  onReset,
}: Props) {
  const d = draft ?? rates;
  const [confirmReset, setConfirmReset] = useState(false);

  // اگر تأیید بازگشت ۴ ثانیه تأیید نشد، دکمه به حالت عادی برمی‌گردد
  useEffect(() => {
    if (!confirmReset) return;
    const t = setTimeout(() => setConfirmReset(false), 4000);
    return () => clearTimeout(t);
  }, [confirmReset]);

  const patch = (p: Partial<RatesConfig>) =>
    onDraftChange({ ...d, ...p });

  const setCutting = (key: string, value: number) =>
    patch({ cuttingRates: { ...d.cuttingRates, [key]: value } });

  const setSheetPrice = (key: string, value: number) =>
    patch({ sheetPrices: { ...d.sheetPrices, [key]: value } });

  const addSheetPrice = (type: SheetType, thick: number) =>
    patch({
      sheetPrices: {
        ...d.sheetPrices,
        [`${type}-${thick}mm`]: 0,
      },
    });

  const removeSheetPrice = (key: string) => {
    const { [key]: _removed, ...rest } = d.sheetPrices;
    patch({ sheetPrices: rest });
  };

  const setDensity = (type: SheetType, value: number) =>
    patch({ densities: { ...d.densities, [type]: value } });

  const dirty =
    useMemo(
      () =>
        JSON.stringify(d) !== JSON.stringify(rates),
      [d, rates]
    );

  // همهٔ مقادیر باید بزرگ‌تر از صفر باشند
  const zeroFields = useMemo(() => {
    const names: string[] = [];
    for (const [k, v] of Object.entries(d.cuttingRates))
      if (!(v > 0)) names.push(`نرخ برش ${k.replace("-", " ")}`);
    for (const [k, v] of Object.entries(d.sheetPrices))
      if (!(v > 0)) names.push(`نرخ ورق ${k.replace("-", " ").replace(/mm$/, "")}`);
    for (const [k, v] of Object.entries(d.densities))
      if (!(v > 0)) names.push(`چگالی ${k}`);
    if (!(d.prsRate > 0)) names.push("نرخ prs");
    return names;
  }, [d]);

  const handleSave = () => {
    if (!dirty || zeroFields.length > 0) return;
    onSave(d);
  };

  const handleReset = () => {
    if (!confirmReset) {
      setConfirmReset(true);
      return;
    }
    setConfirmReset(false);
    onReset();
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* راهنما */}
      <Card className="border-sky-200/70 bg-sky-50/50 dark:border-sky-900/60 dark:bg-sky-950/20">
        <CardContent className="flex items-start gap-3 p-4">
          <Info className="mt-0.5 size-4 shrink-0 text-sky-600 dark:text-sky-400" />
          <div className="text-sm leading-6 text-sky-900 dark:text-sky-200">
            نرخ‌های برنامه را همین‌جا تغییر دهید؛ پس از ذخیره، همهٔ محاسبات و
            فاکتورهای بعدی با نرخ‌های جدید انجام می‌شود. مقادیر روی همین دستگاه
            ذخیره می‌ماند و با خروج و ورود مجدد از بین نمی‌رود.
          </div>
        </CardContent>
      </Card>

      {/* نوار اقدام */}
      <div className="sticky top-[68px] z-30 rounded-xl border bg-stone-100/95 p-3 shadow-sm backdrop-blur dark:bg-stone-950/95">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="size-4 text-amber-600 dark:text-amber-500" />
            {dirty ? (
              <Badge className="bg-amber-600 text-white hover:bg-amber-600">
                تغییرات ذخیره نشده
              </Badge>
            ) : (
              <span className="text-xs text-muted-foreground">
                همه تغییرات ذخیره شده است
              </span>
            )}
            {zeroFields.length > 0 && (
              <span className="text-xs text-destructive">
                {zeroFields.length} مقدار صفر است — باید بزرگ‌تر از صفر باشد
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {dirty && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDraftChange(null)}
              >
                <Undo2 className="size-4" />
                انصراف
              </Button>
            )}
            <Button
              size="sm"
              className="bg-amber-600 text-white hover:bg-amber-700"
              disabled={!dirty || zeroFields.length > 0}
              onClick={handleSave}
            >
              <Save className="size-4" />
              ذخیره پارامترها
            </Button>
          </div>
        </div>
      </div>

      {/* ───────── نرخ برش ───────── */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">نرخ برش (ریال)</CardTitle>
          <CardDescription>
            به ازای هر متر برش، به ازای هر میلی‌متر ضخامت — مثلاً نرخ برش ورق
            سیاه با اکسیژن
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-[1fr_5rem_5rem] items-center gap-2 sm:grid-cols-[1fr_9rem_9rem]">
            <span className="px-1 text-xs text-muted-foreground">نوع ورق</span>
            {GAS_TYPES.map((g) => (
              <span
                key={g}
                className="px-1 text-center text-xs font-medium text-muted-foreground"
              >
                {g}
                <span dir="ltr" className="mr-1 text-[10px] opacity-70">
                  {GAS_ICONS[g]}
                </span>
              </span>
            ))}
          </div>
          <div className="mt-2 space-y-2">
            {SHEET_TYPES.map((t) => (
              <div
                key={t}
                className="grid grid-cols-[1fr_5rem_5rem] items-center gap-2 sm:grid-cols-[1fr_9rem_9rem]"
              >
                <div className="flex items-center px-1 py-1 text-sm">
                  {t}
                </div>
                {GAS_TYPES.map((g) => (
                  <RateInput
                    key={g}
                    value={d.cuttingRates[`${t}-${g}`] ?? 0}
                    step={1000}
                    onChange={(v) => setCutting(`${t}-${g}`, v)}
                    invalid={!(d.cuttingRates[`${t}-${g}`] > 0)}
                  />
                ))}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ───────── نرخ ورق ───────── */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">نرخ ورق — فی کیلویی (ریال)</CardTitle>
          <CardDescription>
            قیمت هر کیلوگرم ورق برای هر نوع و ضخامت. اگر برای ضخامتی نرخ
            نخواهید، از دکمه «+» اضافه کنید؛ در ماشین‌حساب همیشه می‌توانید نرخ
            دستی جداگانه وارد کنید.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {SHEET_TYPES.map((t) => {
            const keys = Object.keys(d.sheetPrices)
              .filter((k) => k.startsWith(`${t}-`))
              .sort(
                (a, b) =>
                  parseFloat(a.slice(t.length + 1, -2)) -
                  parseFloat(b.slice(t.length + 1, -2))
              );
            const missing = (THICKNESS_OPTIONS[t] ?? []).filter(
              (th) => !(`${t}-${th}mm` in d.sheetPrices)
            );
            return (
              <div
                key={t}
                className="rounded-xl border bg-muted/30 p-3 dark:bg-muted/10"
              >
                <div className="mb-2.5 flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold">{t}</p>
                  {keys.length === 0 && (
                    <span className="text-[11px] text-muted-foreground">
                      نرخ جدولی ثبت نشده
                    </span>
                  )}
                </div>
                {keys.length > 0 && (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {keys.map((k) => {
                      const thick = k.slice(t.length + 1, -2);
                      const isCustom = !(k in DEFAULT_RATES.sheetPrices);
                      return (
                        <div
                          key={k}
                          className="flex items-center gap-2 rounded-lg border bg-background p-1.5 pl-2 dark:bg-background"
                        >
                          <span className="shrink-0 text-xs tabular-nums text-muted-foreground" dir="ltr">
                            {faNum(thick)} mm
                          </span>
                          <RateInput
                            value={d.sheetPrices[k]}
                            step={10000}
                            onChange={(v) => setSheetPrice(k, v)}
                            invalid={!(d.sheetPrices[k] > 0)}
                            className="flex-1"
                          />
                          {isCustom && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8 shrink-0 text-destructive hover:text-destructive"
                              aria-label={`حذف نرخ ${t} ${thick} میلی‌متر`}
                              onClick={() => removeSheetPrice(k)}
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
                {missing.length > 0 && (
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <span className="text-[11px] text-muted-foreground">
                      افزودن ضخامت:
                    </span>
                    {missing.map((th) => (
                      <button
                        key={th}
                        type="button"
                        onClick={() => addSheetPrice(t, th)}
                        className="inline-flex items-center gap-0.5 rounded-full border border-dashed px-2 py-0.5 text-xs text-muted-foreground transition-colors hover:border-amber-600 hover:text-amber-700 dark:hover:text-amber-500"
                      >
                        <Plus className="size-3" />
                        {faNum(th)}mm
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* ───────── نرخ prs و چگالی ───────── */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">نرخ prs و چگالی ورق‌ها</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="defPrs">نرخ پیش‌فرض prs (پرس) — ریال</Label>
            <RateInput
              id="defPrs"
              value={d.prsRate}
              step={100}
              onChange={(v) => patch({ prsRate: v })}
              invalid={!(d.prsRate > 0)}
              className="max-w-48"
            />
            <p className="text-xs text-muted-foreground">
              به‌عنوان مقدار اولیهٔ «نرخ prs» در ماشین‌حساب استفاده می‌شود؛ برای
              هر فاکتور هم می‌توانید در همان فرم تغییرش دهید. برای ضخامت بالای ۲
              میلی‌متر، نرخ مؤثر به‌صورت خودکار (ضخامت ÷ ۲) × این نرخ محاسبه
              می‌شود.
            </p>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label>چگالی ورق‌ها (گرم بر سانتی‌متر مکعب)</Label>
            <p className="text-xs text-muted-foreground">
              برای محاسبهٔ وزن ورق از روی ابعاد — وزن = مساحت × ضخامت × چگالی ÷
              ۱۰٬۰۰۰
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {SHEET_TYPES.map((t) => (
                <div
                  key={t}
                  className="flex items-center gap-2 rounded-lg border bg-background p-1.5 pl-2 dark:bg-background"
                >
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {t}
                  </span>
                  <RateInput
                    value={d.densities[t] ?? 0}
                    step={0.05}
                    onChange={(v) => setDensity(t, v)}
                    invalid={!(d.densities[t] > 0)}
                    className="flex-1"
                  />
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* بازگشت به پیش‌فرض */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50/60 p-4 dark:border-rose-900/60 dark:bg-rose-950/20">
        <div>
          <p className="text-sm font-medium text-rose-800 dark:text-rose-300">
            بازگشت به نرخ‌های پیش‌فرض
          </p>
          <p className="mt-0.5 text-xs text-rose-700/80 dark:text-rose-400/80">
            همهٔ نرخ‌ها به مقادیر اولیهٔ برنامه برمی‌گردد.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className={`shrink-0 ${
            confirmReset
              ? "border-rose-600 bg-rose-600 text-white hover:bg-rose-700 hover:text-white"
              : "border-rose-300 text-rose-700 hover:bg-rose-100 hover:text-rose-800 dark:border-rose-800 dark:text-rose-400 dark:hover:bg-rose-950"
          }`}
          onClick={handleReset}
        >
          <RotateCcw className="size-4" />
          {confirmReset ? "تأیید بازگشت؟" : "بازگردانی پیش‌فرض"}
        </Button>
      </div>
    </div>
  );
}

// ───────────── ورودی عددی نرخ ─────────────
function RateInput({
  value,
  onChange,
  step = "1",
  className = "",
  invalid = false,
  id,
}: {
  value: number;
  onChange: (v: number) => void;
  step?: number | string;
  className?: string;
  invalid?: boolean;
  id?: string;
}) {
  return (
    <Input
      id={id}
      type="number"
      inputMode="decimal"
      dir="ltr"
      step={step}
      min="0"
      className={`no-spinner h-9 text-right tabular-nums ${
        invalid
          ? "border-destructive/60 focus-visible:ring-destructive/40"
          : ""
      } ${className}`}
      value={String(value)}
      onChange={(e) => {
        const raw = toEnDigits(e.target.value).replace(/[^\d.]/g, "");
        if (raw === "") return; // خالی کردن فیلد مجاز نیست — مقدار قبلی می‌ماند
        const n = Number(raw);
        if (Number.isFinite(n) && n >= 0) onChange(n);
      }}
    />
  );
}
