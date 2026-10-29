"use client";

import { useMemo } from "react";
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
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Calculator as CalculatorIcon,
  User,
  Phone,
  Layers,
  Plus,
  Trash2,
  Ruler,
  Zap,
  Scale,
  ReceiptText,
  Tags,
  Eraser,
} from "lucide-react";
import {
  SHEET_TYPES,
  GAS_TYPES,
  THICKNESS_OPTIONS,
  calculate,
  type CalcInput,
  type RatesConfig,
  type SheetDimRow,
  type SheetType,
  type GasType,
} from "@/lib/pricing";
import { faMoney, faNum, toEnDigits } from "@/lib/persian";

interface Props {
  input: CalcInput;
  rates: RatesConfig;
  onChange: (input: CalcInput) => void;
  onGoInvoice: () => void;
  onClear: () => void;
}

export function Calculator({ input, rates, onChange, onGoInvoice, onClear }: Props) {
  const result = useMemo(() => calculate({ ...input, rates }), [input, rates]);

  const set = <K extends keyof CalcInput>(key: K, value: CalcInput[K]) =>
    onChange({ ...input, [key]: value });

  const numField = (
    key: keyof CalcInput,
    placeholder: string,
    step = "1",
    min = "0"
  ) => (
    <Input
      type="number"
      inputMode="decimal"
      dir="ltr"
      className="no-spinner text-right"
      placeholder={placeholder}
      step={step}
      min={min}
      value={input[key] === "" ? "" : String(input[key])}
      onChange={(e) => {
        const raw = toEnDigits(e.target.value).replace(/[^\d.]/g, "");
        set(key, raw === "" ? ("" as never) : (Number(raw) as never));
      }}
    />
  );

  const updateDim = (id: string, field: keyof SheetDimRow, value: string) => {
    const clean = toEnDigits(value).replace(/[^\d.]/g, "");
    set(
      "dims",
      input.dims.map((d) =>
        d.id === id ? { ...d, [field]: clean === "" ? "" : Number(clean) } : d
      )
    );
  };

  const addDim = () =>
    set("dims", [
      ...input.dims,
      { id: `d${Date.now()}`, lengthCm: "", widthCm: "" },
    ]);

  const removeDim = (id: string) => {
    const next = input.dims.filter((d) => d.id !== id);
    set("dims", next.length ? next : [{ id: "d1", lengthCm: "", widthCm: "" }]);
  };

  const thicknessOptions = input.sheetType
    ? THICKNESS_OPTIONS[input.sheetType as SheetType]
    : [];

  // نرخ پیش‌فرض جدول برای این نوع/ضخامت — به‌عنوان placeholder نرخ دستی
  const defaultSheetRate =
    input.sheetType && input.thickness !== ""
      ? rates.sheetPrices[`${input.sheetType}-${Number(input.thickness)}mm`] ?? null
      : null;
  const manualRateActive =
    input.sheetPriceManual !== "" && Number(input.sheetPriceManual) > 0;

  const ready = result.totalPriceError === null && result.totalPrice > 0;

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      {/* ───────────── ستون فرم ───────────── */}
      <div className="space-y-6 lg:col-span-3">
        {/* اطلاعات مشتری */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-base">
              <User className="size-4 text-amber-600 dark:text-amber-500" />
              اطلاعات مشتری
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="custName">نام شخص / شرکت</Label>
              <Input
                id="custName"
                placeholder="مثلاً شرکت فولاد پارس"
                value={input.customerName}
                onChange={(e) => set("customerName", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="custPhone" className="flex items-center gap-1">
                <Phone className="size-3" /> شماره موبایل
              </Label>
              <Input
                id="custPhone"
                dir="ltr"
                type="tel"
                inputMode="numeric"
                className="text-right"
                placeholder="0912..."
                value={input.customerPhone}
                onChange={(e) =>
                  set(
                    "customerPhone",
                    toEnDigits(e.target.value).replace(/[^\d+]/g, "")
                  )
                }
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="custAddr">آدرس (اختیاری — در فاکتور نمایش داده می‌شود)</Label>
              <Input
                id="custAddr"
                placeholder="مثلاً کاشان، شهرک صنعتی"
                value={input.customerAddress}
                onChange={(e) => set("customerAddress", e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* مشخصات برش */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-base">
              <Zap className="size-4 text-amber-600 dark:text-amber-500" />
              مشخصات برش
            </CardTitle>
            <CardDescription>
              نوع ورق، گاز و مقادیر را وارد کنید — محاسبات آنی انجام می‌شود
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>نوع ورق</Label>
              <Select
                value={input.sheetType}
                onValueChange={(v) => set("sheetType", v as SheetType)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="نوع ورق را انتخاب کنید" />
                </SelectTrigger>
                <SelectContent>
                  {SHEET_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>نوع گاز</Label>
              <Select
                value={input.gasType}
                onValueChange={(v) => set("gasType", v as GasType)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="نوع گاز را انتخاب کنید" />
                </SelectTrigger>
                <SelectContent>
                  {GAS_TYPES.map((g) => (
                    <SelectItem key={g} value={g}>
                      {g}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="thickness">ضخامت ورق (mm)</Label>
              {numField("thickness", "مثلاً 1.5", "0.1")}
              {input.sheetType && thicknessOptions.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {thicknessOptions.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => set("thickness", t)}
                      className={`rounded-full border px-2.5 py-0.5 text-xs transition-colors ${
                        input.thickness === t
                          ? "border-amber-600 bg-amber-600 text-white"
                          : "border-border bg-muted/60 hover:bg-muted"
                      }`}
                    >
                      {faNum(t)}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="cutLen" className="flex items-center gap-1">
                <Ruler className="size-3" /> متراژ برش برای یک قطعه (m)
              </Label>
              {numField("cutLengthPerPiece", "مثلاً 2.5", "0.1")}
            </div>

            <div className="space-y-2">
              <Label htmlFor="prsPer">تعداد prs برای یک قطعه</Label>
              {numField("prsPerPiece", "مثلاً 4")}
            </div>

            <div className="space-y-2">
              <Label htmlFor="pieces">تعداد قطعه</Label>
              {numField("pieceCount", "مثلاً 10")}
            </div>

            <div className="space-y-2">
              <Label htmlFor="prsRate">نرخ prs (ریال)</Label>
              {numField("prsRate", "5500", "100")}
            </div>

            <div className="space-y-2">
              <Label htmlFor="design">هزینه طراحی (ریال)</Label>
              {numField("designCost", "0", "10000")}
            </div>
          </CardContent>
        </Card>

        {/* محاسبات ورق */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-base">
              <Scale className="size-4 text-amber-600 dark:text-amber-500" />
              محاسبات ورق
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border bg-muted/40 p-3">
              <div>
                <Label htmlFor="fromCust" className="text-sm">
                  ورق از مشتری است
                </Label>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  در صورت فعال بودن، هزینه ورق محاسبه نمی‌شود
                </p>
              </div>
              <Switch
                id="fromCust"
                checked={input.sheetFromCustomer}
                onCheckedChange={(v) => set("sheetFromCustomer", v)}
              />
            </div>

            {!input.sheetFromCustomer && (
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="sheetRate" className="flex items-center gap-1">
                    <Tags className="size-3" /> نرخ ورق — فی کیلویی (ریال)
                  </Label>
                  {numField(
                    "sheetPriceManual",
                    defaultSheetRate !== null
                      ? `نرخ جدول: ${defaultSheetRate}`
                      : "مثلاً 750000",
                    "10000"
                  )}
                  <p className="text-xs text-muted-foreground">
                    {manualRateActive
                      ? "نرخ دستی شما ملاک محاسبه است"
                      : "خالی بگذارید تا از نرخ‌های تب پارامترها استفاده شود"}
                  </p>
                </div>
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-1">
                    <Layers className="size-3" /> ابعاد ورق‌ها (cm)
                  </Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addDim}
                    className="h-8"
                  >
                    <Plus className="size-3.5" /> افزودن ردیف
                  </Button>
                </div>
                <div className="grid gap-2">
                  <div className="grid grid-cols-[1fr_1fr_auto] items-center gap-2 px-1 text-xs text-muted-foreground">
                    <span>طول (cm)</span>
                    <span>عرض (cm)</span>
                    <span className="w-9" />
                  </div>
                  {input.dims.map((d) => (
                    <div
                      key={d.id}
                      className="grid grid-cols-[1fr_1fr_auto] items-center gap-2"
                    >
                      <Input
                        type="number"
                        inputMode="decimal"
                        dir="ltr"
                        className="no-spinner text-right"
                        placeholder="طول"
                        value={d.lengthCm === "" ? "" : String(d.lengthCm)}
                        onChange={(e) =>
                          updateDim(d.id, "lengthCm", e.target.value)
                        }
                      />
                      <Input
                        type="number"
                        inputMode="decimal"
                        dir="ltr"
                        className="no-spinner text-right"
                        placeholder="عرض"
                        value={d.widthCm === "" ? "" : String(d.widthCm)}
                        onChange={(e) =>
                          updateDim(d.id, "widthCm", e.target.value)
                        }
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-9 text-destructive hover:text-destructive"
                        onClick={() => removeDim(d.id)}
                        aria-label="حذف ردیف"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  وزن = مجموع (طول × عرض) × ضخامت × چگالی ÷ ۱۰٬۰۰۰ (کیلوگرم)
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ───────────── ستون نتایج ───────────── */}
      <div className="lg:col-span-2">
        <div className="space-y-4 lg:sticky lg:top-6">
          <Card className="overflow-hidden border-amber-200/60">
            <CardHeader className="bg-amber-50/70 pb-4 dark:bg-amber-950/20">
              <CardTitle className="flex items-center gap-2 text-base">
                <CalculatorIcon className="size-4 text-amber-600 dark:text-amber-500" />
                نتایج محاسبه
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-4">
              <ResultRow
                label="نرخ برش"
                value={
                  result.cuttingRate !== null
                    ? `${faMoney(result.cuttingRate)} ریال`
                    : undefined
                }
                error={result.cuttingRateError}
                hint="به ازای هر متر به ازای هر میلی‌متر"
              />
              <ResultRow
                label="هزینه برش برای یک قطعه"
                value={
                  result.costPerPiece !== null
                    ? `${faMoney(result.costPerPiece)} ریال`
                    : undefined
                }
                error={result.costPerPieceError}
              />
              <ResultRow
                label="هزینه کل برش"
                value={
                  result.totalCutting !== null
                    ? `${faMoney(result.totalCutting)} ریال`
                    : undefined
                }
                error={result.totalCuttingError}
              />

              <Separator />

              <ResultRow
                label="نرخ مؤثر prs"
                value={
                  result.effectivePrsRate !== null
                    ? `${faMoney(result.effectivePrsRate)} ریال`
                    : undefined
                }
                error={result.totalPrsError}
                hint={
                  result.effectivePrsRate !== null
                    ? "برای هر عملیات پرس"
                    : undefined
                }
              />
              <ResultRow
                label="قیمت کل prs"
                value={
                  result.totalPrs !== null
                    ? `${faMoney(result.totalPrs)} ریال`
                    : undefined
                }
                error={result.totalPrsError}
              />

              {!input.sheetFromCustomer && (
                <>
                  <Separator />
                  <ResultRow
                    label="وزن ورق"
                    value={
                      result.sheetWeight !== null
                        ? `${faNum(Math.round(result.sheetWeight * 100) / 100)} کیلوگرم`
                        : undefined
                    }
                    error={result.sheetWeightError}
                  />
                  <ResultRow
                    label="قیمت ورق"
                    value={
                      result.sheetTotal !== null
                        ? `${faMoney(result.sheetTotal)} ریال`
                        : undefined
                    }
                    error={result.sheetTotalError}
                    hint={
                      result.sheetPricePerKg !== null
                        ? `نرخ: ${faMoney(result.sheetPricePerKg)} ریال برای هر کیلو${manualRateActive ? " (دستی)" : ""}`
                        : undefined
                    }
                  />
                </>
              )}

              {input.designCost > 0 && (
                <>
                  <Separator />
                  <ResultRow
                    label="هزینه طراحی"
                    value={`${faMoney(input.designCost)} ریال`}
                  />
                </>
              )}

              <Separator />

              <div className="rounded-xl bg-stone-900 p-4 text-white dark:bg-stone-800">
                <p className="text-xs text-stone-300">قیمت کل</p>
                <p className="mt-1 text-2xl font-bold tabular-nums">
                  {result.totalPriceError ? (
                    <span className="text-sm font-normal text-stone-400">
                      {result.totalPriceError}
                    </span>
                  ) : (
                    <>
                      {faMoney(result.totalPrice)}
                      <span className="mr-1.5 text-sm font-normal text-stone-300">
                        ریال
                      </span>
                    </>
                  )}
                </p>
                {!result.totalPriceError &&
                  (Number(input.vatPercent) || 0) > 0 && (
                    <p className="mt-1.5 text-[11px] text-stone-400">
                      بدون ارزش افزوده — قابل پرداخت در فاکتور: {" "}
                      {faMoney(result.grandTotal)} ریال
                    </p>
                  )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border bg-muted/40 p-3">
                  <p className="text-xs text-muted-foreground">فی (هر متر برش)</p>
                  <p className="mt-1 text-sm font-semibold tabular-nums">
                    {result.perMeter !== null
                      ? `${faMoney(result.perMeter)} ریال`
                      : result.perMeterError}
                  </p>
                </div>
                <div className="rounded-lg border bg-muted/40 p-3">
                  <p className="text-xs text-muted-foreground">کل متراژ برش</p>
                  <p className="mt-1 text-sm font-semibold tabular-nums">
                    {result.totalMeters
                      ? `${faNum(Math.round(result.totalMeters * 100) / 100)} متر`
                      : "—"}
                  </p>
                </div>
              </div>

              <Button
                className="w-full bg-amber-600 text-white hover:bg-amber-700"
                disabled={!ready}
                onClick={onGoInvoice}
              >
                <ReceiptText className="size-4" />
                مشاهده و چاپ فاکتور
              </Button>

              <Button
                variant="outline"
                className="w-full border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:border-rose-900/60 dark:text-rose-400 dark:hover:bg-rose-950 dark:hover:text-rose-300"
                onClick={onClear}
              >
                <Eraser className="size-4" />
                پاک کردن مقادیر
              </Button>

              {result.totalPriceError && (
                <p className="text-center text-xs text-muted-foreground">
                  برای صدور فاکتور، مقادیر بالا را کامل کنید
                </p>
              )}
            </CardContent>
          </Card>

          {result.items.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">خلاصه ردیف‌های فاکتور</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {result.items.map((it) => (
                  <div
                    key={it.row}
                    className="flex items-center justify-between gap-2 text-xs"
                  >
                    <Badge variant="outline" className="shrink-0">
                      {it.row}
                    </Badge>
                    <span className="flex-1 truncate">{it.desc}</span>
                    <span className="shrink-0 font-semibold tabular-nums">
                      {faMoney(it.amount)}
                    </span>
                  </div>
                ))}
                <Separator />
                <div className="flex items-center justify-between text-xs font-bold">
                  <span>جمع کل</span>
                  <span className="tabular-nums">
                    {faMoney(result.invoiceTotal)} ریال
                  </span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function ResultRow({
  label,
  value,
  error,
  hint,
}: {
  label: string;
  value?: string;
  error?: string | null;
  hint?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-sm">{label}</p>
        {hint && (
          <p className="mt-0.5 text-[11px] text-muted-foreground">{hint}</p>
        )}
      </div>
      <p
        className={`shrink-0 text-sm font-semibold tabular-nums ${
          error ? "font-normal text-muted-foreground" : ""
        }`}
      >
        {error ?? value ?? "—"}
      </p>
    </div>
  );
}
