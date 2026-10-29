"use client";

// ─────────────────────────────────────────────────────────────
// کارت تنظیم قفل برنامه — فعال‌سازی، تغییر و حذف رمز (۴ تا ۶ رقم)
// ─────────────────────────────────────────────────────────────

import { useState } from "react";
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
import {
  LockKeyhole,
  ShieldCheck,
  RotateCcw,
  Unlock,
  Info,
} from "lucide-react";
import { hashPin, type LockConfig } from "@/lib/lock";
import { toEnDigits } from "@/lib/persian";
import { useToast } from "@/hooks/use-toast";

interface Props {
  lock: LockConfig | null;
  onSave: (config: LockConfig) => void;
  onRemove: () => void;
}

export function LockCard({ lock, onSave, onRemove }: Props) {
  const { toast } = useToast();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [repeat, setRepeat] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);

  const digits = (s: string) => toEnDigits(s).replace(/\D/g, "");

  const handleActivate = async () => {
    const pin = digits(next);
    if (pin.length < 4 || pin.length > 6) {
      toast({
        title: "رمز نامعتبر",
        description: "رمز باید ۴ تا ۶ رقم باشد.",
        variant: "destructive",
      });
      return;
    }
    if (pin !== digits(repeat)) {
      toast({
        title: "تکرار رمز مطابقت ندارد",
        variant: "destructive",
      });
      return;
    }
    setBusy(true);
    try {
      // اگر قفل فعلی هست، باید رمز فعلی درست باشد
      if (lock) {
        if (!current || !(await verifyCurrent())) {
          toast({
            title: "رمز فعلی اشتباه است",
            variant: "destructive",
          });
          return;
        }
      }
      onSave({ hash: await hashPin(pin), enabled: true, pinLength: pin.length });
      setCurrent("");
      setNext("");
      setRepeat("");
      toast({
        title: lock ? "رمز تغییر کرد" : "قفل فعال شد",
        description: "از این به بعد هنگام باز کردن برنامه رمز خواسته می‌شود.",
      });
    } finally {
      setBusy(false);
    }
  };

  const verifyCurrent = async () =>
    !!lock && (await hashPin(digits(current))) === lock.hash;

  const handleRemove = async () => {
    if (!confirmRemove) {
      setConfirmRemove(true);
      setTimeout(() => setConfirmRemove(false), 4000);
      return;
    }
    setBusy(true);
    try {
      if (!(await verifyCurrent())) {
        toast({ title: "رمز فعلی اشتباه است", variant: "destructive" });
        return;
      }
      onRemove();
      setCurrent("");
      setConfirmRemove(false);
      toast({ title: "قفل حذف شد", description: "برنامه بدون رمز باز می‌شود." });
    } finally {
      setBusy(false);
    }
  };

  const canActivate =
    !busy &&
    digits(next).length >= 4 &&
    digits(next).length <= 6 &&
    digits(next) === digits(repeat) &&
    (!lock || digits(current).length > 0);

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-base">
          <LockKeyhole className="size-4 text-amber-600 dark:text-amber-500" />
          قفل برنامه
        </CardTitle>
        <CardDescription>
          با فعال‌سازی، هنگام باز کردن برنامه رمز خواسته می‌شود — مناسب وقتی
          گوشی دست دیگران هم می‌شود
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div
          className={`flex items-start gap-2 rounded-lg border p-3 ${
            lock
              ? "border-emerald-200 bg-emerald-50/60 dark:border-emerald-900/50 dark:bg-emerald-950/20"
              : "border-sky-200 bg-sky-50/60 dark:border-sky-900/50 dark:bg-sky-950/20"
          }`}
        >
          {lock ? (
            <>
              <ShieldCheck className="mt-0.5 size-4 shrink-0 text-emerald-600" />
              <p className="text-sm leading-6 text-emerald-900 dark:text-emerald-300">
                قفل فعال است — رمز {lock.pinLength} رقمی. برای تغییر، رمز فعلی و
                رمز جدید را وارد کنید.
              </p>
            </>
          ) : (
            <>
              <Info className="mt-0.5 size-4 shrink-0 text-sky-600" />
              <p className="text-sm leading-6 text-sky-900 dark:text-sky-300">
                قفلی تنظیم نشده — برای فعال‌سازی، رمز جدید (۴ تا ۶ رقم) را
                وارد کنید.
              </p>
            </>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          {lock && (
            <div className="space-y-2">
              <Label htmlFor="lockCurrent">رمز فعلی</Label>
              <Input
                id="lockCurrent"
                type="password"
                inputMode="numeric"
                dir="ltr"
                maxLength={6}
                className="text-center tracking-[0.3em]"
                placeholder="••••"
                value={current}
                onChange={(e) => setCurrent(digits(e.target.value))}
              />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="lockNew">{lock ? "رمز جدید" : "رمز جدید (۴ تا ۶ رقم)"}</Label>
            <Input
              id="lockNew"
              type="password"
              inputMode="numeric"
              dir="ltr"
              maxLength={6}
              className="text-center tracking-[0.3em]"
              placeholder="••••"
              value={next}
              onChange={(e) => setNext(digits(e.target.value))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lockRepeat">تکرار رمز جدید</Label>
            <Input
              id="lockRepeat"
              type="password"
              inputMode="numeric"
              dir="ltr"
              maxLength={6}
              className="text-center tracking-[0.3em]"
              placeholder="••••"
              value={repeat}
              onChange={(e) => setRepeat(digits(e.target.value))}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          {lock ? (
            <Button
              variant="outline"
              size="sm"
              disabled={busy}
              className={
                confirmRemove
                  ? "border-rose-600 bg-rose-600 text-white hover:bg-rose-700 hover:text-white"
                  : "border-rose-300 text-rose-700 hover:bg-rose-100 hover:text-rose-800 dark:border-rose-800 dark:text-rose-400 dark:hover:bg-rose-950"
              }
              onClick={handleRemove}
            >
              <Unlock className="size-4" />
              {confirmRemove ? "تأیید حذف قفل؟" : "حذف قفل"}
            </Button>
          ) : (
            <span className="text-xs text-muted-foreground">
              رمز به‌صورت هش‌شده ذخیره می‌شود و قابل بازیابی نیست — اگر رمز را
              فراموش کنید باید داده‌های برنامه پاک شود.
            </span>
          )}
          <Button
            size="sm"
            className="bg-amber-600 text-white hover:bg-amber-700"
            disabled={!canActivate}
            onClick={handleActivate}
          >
            <RotateCcw className="size-4" />
            {lock ? "تغییر رمز" : "فعال‌سازی قفل"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
