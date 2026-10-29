"use client";

// ─────────────────────────────────────────────────────────────
// صفحهٔ قفل — در شروع اجرای برنامه اگر قفل فعال باشد نمایش داده می‌شود
// کیبورد عددی بزرگ برای ورود راحت با لمس
// ─────────────────────────────────────────────────────────────

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Banknote, Delete } from "lucide-react";
import { verifyPin, type LockConfig } from "@/lib/lock";

interface Props {
  lock: LockConfig;
  appName: string;
  onUnlocked: () => void;
}

export function LockScreen({ lock, appName, onUnlocked }: Props) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);

  // هر بار که طول رمز به طول موردنظر رسید، بررسی می‌شود
  useEffect(() => {
    if (pin.length < lock.pinLength) return;
    let cancelled = false;
    (async () => {
      const ok = await verifyPin(pin, lock);
      if (cancelled) return;
      if (ok) {
        onUnlocked();
      } else {
        setError(true);
        setTimeout(() => {
          setPin("");
          setError(false);
        }, 700);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pin, lock, onUnlocked]);

  const press = (d: string) => {
    if (error) return;
    setPin((p) => (p.length < lock.pinLength ? p + d : p));
  };

  const back = () => {
    if (error) return;
    setPin((p) => p.slice(0, -1));
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-stone-950 px-6 text-white">
      <div className="flex flex-col items-center gap-1.5">
        <div className="mb-3 flex size-16 items-center justify-center rounded-2xl bg-amber-600 shadow-lg shadow-amber-600/30">
          <Banknote className="size-8" />
        </div>
        <h1 className="text-lg font-extrabold">{appName}</h1>
        <p className="text-sm text-stone-400">برای ورود، رمز را وارد کنید</p>
      </div>

      {/* نقاط رمز */}
      <div
        className={`mt-8 flex items-center gap-3 ${
          error ? "animate-pulse" : ""
        }`}
      >
        {Array.from({ length: lock.pinLength }).map((_, i) => (
          <span
            key={i}
            className={`size-3.5 rounded-full border-2 transition-colors ${
              error
                ? "border-rose-500 bg-rose-500"
                : i < pin.length
                  ? "border-amber-500 bg-amber-500"
                  : "border-stone-600"
            }`}
          />
        ))}
      </div>
      <p
        className={`mt-3 h-5 text-xs ${
          error ? "text-rose-400" : "text-transparent"
        }`}
      >
        رمز اشتباه است — دوباره تلاش کنید
      </p>

      {/* کیبورد */}
      <div className="mt-6 grid w-full max-w-72 grid-cols-3 gap-3">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
          <button
            key={d}
            type="button"
            dir="ltr"
            onClick={() => press(d)}
            className="h-14 rounded-xl border border-stone-700 bg-stone-800/60 text-xl font-semibold tabular-nums transition-colors hover:bg-stone-700/70 active:bg-stone-700"
          >
            {d}
          </button>
        ))}
        <span />
        <button
          type="button"
          dir="ltr"
          onClick={() => press("0")}
          className="h-14 rounded-xl border border-stone-700 bg-stone-800/60 text-xl font-semibold tabular-nums transition-colors hover:bg-stone-700/70 active:bg-stone-700"
        >
          0
        </button>
        <Button
          type="button"
          variant="ghost"
          className="h-14 rounded-xl text-stone-300 hover:bg-stone-800 hover:text-white"
          onClick={back}
          aria-label="حذف رقم"
        >
          <Delete className="size-5" />
        </Button>
      </div>
    </div>
  );
}
