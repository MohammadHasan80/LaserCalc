"use client";

// ─────────────────────────────────────────────────────────────
// کارت «اطلاعات کسب‌وکار» — ویرایش اطلاعات نمایش‌داده‌شده روی فاکتور
// نام، کپشن لاتین، تماس، آدرس و شرایط فاکتور
// ─────────────────────────────────────────────────────────────

import { useEffect, useMemo, useRef, useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { Building2, Save, RotateCcw, Undo2, Info, ImageUp, ImageOff, Trash2 } from "lucide-react";
import type { BusinessConfig } from "@/lib/business";

interface Props {
  business: BusinessConfig; // مقادیر ذخیره‌شده
  draft: BusinessConfig | null; // پیش‌نویس در حال ویرایش (null = همگام)
  onDraftChange: (b: BusinessConfig | null) => void;
  onSave: (b: BusinessConfig) => void;
  onReset: () => void;
}

export function BusinessView({
  business,
  draft,
  onDraftChange,
  onSave,
  onReset,
}: Props) {
  const b = draft ?? business;
  const [confirmReset, setConfirmReset] = useState(false);
  const logoRef = useRef<HTMLInputElement>(null);

  // تأیید بازگشت پس از ۴ ثانیه به حالت عادی برمی‌گردد
  useEffect(() => {
    if (!confirmReset) return;
    const t = setTimeout(() => setConfirmReset(false), 4000);
    return () => clearTimeout(t);
  }, [confirmReset]);

  const patch = (p: Partial<BusinessConfig>) => onDraftChange({ ...b, ...p });

  /** انتخاب و کوچک‌سازی لوگو به مربع ۲۵۶×۲۵۶ و ذخیره به‌صورت dataURL */
  const handleLogoFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const S = 256;
        const canvas = document.createElement("canvas");
        canvas.width = S;
        canvas.height = S;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        const side = Math.min(img.width, img.height);
        const sx = (img.width - side) / 2;
        const sy = (img.height - side) / 2;
        ctx.drawImage(img, sx, sy, side, side, 0, 0, S, S);
        patch({ logo: canvas.toDataURL("image/png") });
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  };

  const dirty = useMemo(
    () => JSON.stringify(b) !== JSON.stringify(business),
    [b, business]
  );

  const termsText = b.terms.join("\n");

  const setTerms = (raw: string) => {
    // فقط خط کامل‌شده را بند حساب می‌کنیم — خط آخر (در حال تایپ) هم ذخیره می‌شود
    const lines = raw.split("\n").map((l) => l.trimStart());
    patch({ terms: lines });
  };

  const cleanTerms = (terms: string[]) =>
    terms.map((t) => t.trim()).filter((t) => t !== "");

  const handleSave = () => {
    if (!dirty) return;
    const terms = cleanTerms(b.terms);
    onSave({
      ...b,
      name: b.name.trim() || business.name,
      fullName: b.fullName.trim() || business.fullName,
      latinCaption: b.latinCaption.trim(),
      phone: b.phone.trim(),
      instagram: b.instagram.trim().replace(/^@/, ""),
      website: b.website.trim(),
      address: b.address.trim(),
      terms,
    });
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
    <Card>
      <CardHeader className="pb-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Building2 className="size-4 text-amber-600 dark:text-amber-500" />
              اطلاعات کسب‌وکار
            </CardTitle>
            <CardDescription>
              این اطلاعات روی برگ فاکتور (هدر و فوتر) نمایش داده می‌شود — هر
              فیلد را خالی بگذارید تا از فاکتور حذف شود.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {dirty && (
              <Badge className="bg-amber-600 text-white hover:bg-amber-600">
                ذخیره نشده
              </Badge>
            )}
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
              disabled={!dirty}
              onClick={handleSave}
            >
              <Save className="size-4" />
              ذخیره اطلاعات
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* لوگو */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-muted/30 p-3 dark:bg-muted/10">
          <div className="flex items-center gap-3">
            {b.logo ? (
              <img
                src={b.logo}
                alt="لوگو"
                className="size-14 rounded-xl border bg-white object-contain p-0.5"
              />
            ) : (
              <div className="flex size-14 items-center justify-center rounded-xl border border-dashed">
                <ImageOff className="size-5 text-muted-foreground/50" />
              </div>
            )}
            <div>
              <p className="text-sm font-medium">لوگوی فاکتور (اختیاری)</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                تصویر مربعی در هدر فاکتور نمایش داده می‌شود — خودکار مربع و کوچک
                می‌شود
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {b.logo && (
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={() => patch({ logo: undefined })}
              >
                <Trash2 className="size-4" />
                حذف
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => logoRef.current?.click()}
            >
              <ImageUp className="size-4" />
              {b.logo ? "تغییر لوگو" : "انتخاب تصویر"}
            </Button>
          </div>
          <input
            ref={logoRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleLogoFile(f);
              e.target.value = "";
            }}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="bizName">نام کامل کسب‌وکار (هدر فاکتور)</Label>
            <Input
              id="bizName"
              placeholder="مثلاً شرکت آذرخش تابلو باستان"
              value={b.fullName}
              onChange={(e) => patch({ fullName: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bizLatin">کپشن لاتین (زیر نام — اختیاری)</Label>
            <Input
              id="bizLatin"
              dir="ltr"
              className="text-left"
              placeholder="AZARAKHSH TABLO BASTAN CO."
              value={b.latinCaption}
              onChange={(e) => patch({ latinCaption: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bizPhone">شماره تماس</Label>
            <Input
              id="bizPhone"
              dir="ltr"
              inputMode="tel"
              className="text-left"
              placeholder="0913..."
              value={b.phone}
              onChange={(e) => patch({ phone: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bizInsta">اینستاگرام (بدون @ — اختیاری)</Label>
            <Input
              id="bizInsta"
              dir="ltr"
              className="text-left"
              placeholder="azarakhshtabloo"
              value={b.instagram}
              onChange={(e) => patch({ instagram: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bizSite">وبسایت (اختیاری)</Label>
            <Input
              id="bizSite"
              dir="ltr"
              className="text-left"
              placeholder="example.com"
              value={b.website}
              onChange={(e) => patch({ website: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bizAddr">آدرس</Label>
            <Textarea
              id="bizAddr"
              rows={2}
              placeholder="کاشان، بلوار شهدا، ..."
              className="resize-none"
              value={b.address}
              onChange={(e) => patch({ address: e.target.value })}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="bizTerms">توضیحات و شرایط فاکتور (هر خط یک بند)</Label>
          <Textarea
            id="bizTerms"
            rows={6}
            className="leading-6"
            placeholder={"قیمت‌ها بر اساس نرخ روز است.\nهزینه حمل بر عهده مشتری است."}
            value={termsText}
            onChange={(e) => setTerms(e.target.value)}
          />
          <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
            <Info className="mt-0.5 size-3.5 shrink-0" />
            فاکتور همیشه از آخرین اطلاعات ذخیره‌شده استفاده می‌کند؛ تغییرات روی
            فاکتورهای قبلیِ ذخیره‌شده در تاریخچه هم اعمال می‌شود.
          </p>
        </div>

        <div className="flex items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50/60 p-3 dark:border-rose-900/60 dark:bg-rose-950/20">
          <p className="text-xs leading-5 text-rose-800 dark:text-rose-300">
            بازگشت اطلاعات کسب‌وکار به مقادیر پیش‌فرض برنامه
          </p>
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
      </CardContent>
    </Card>
  );
}
