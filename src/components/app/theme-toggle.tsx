"use client";

import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";

const emptySubscribe = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

/**
 * دکمه تغییر تم — روشن/تاریک
 * تا پایان هیدریشن جای‌نگهدار خالی نشان می‌دهد تا با رندر سرور ناسازگار نشود
 */
export function ThemeToggle() {
  const mounted = useSyncExternalStore(
    emptySubscribe,
    getClientSnapshot,
    getServerSnapshot
  );
  const { resolvedTheme, setTheme } = useTheme();

  if (!mounted) {
    return <div className="size-9 shrink-0" aria-hidden="true" />;
  }

  const isDark = resolvedTheme === "dark";

  /** ذخیره تم در سمت اندروید (SharedPreferences) — برای رنگ پس‌زمینه WebView */
  const mirrorThemeToNative = (theme: string) => {
    if (typeof window === "undefined") return;
    const bridge = (window as unknown as Record<string, unknown>)
      .AndroidBridge as { saveTheme?: (t: string) => void } | undefined;
    bridge?.saveTheme?.(theme);
  };

  return (
    <button
      type="button"
      onClick={() => {
        const next = isDark ? "light" : "dark";
        mirrorThemeToNative(next);
        setTheme(next);
      }}
      aria-label={isDark ? "فعال‌سازی حالت روشن" : "فعال‌سازی حالت تاریک"}
      title={isDark ? "حالت روشن" : "حالت تاریک"}
      className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-stone-700 bg-stone-800 text-stone-200 shadow-sm transition-colors hover:bg-stone-700 active:bg-stone-600"
    >
      {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </button>
  );
}
