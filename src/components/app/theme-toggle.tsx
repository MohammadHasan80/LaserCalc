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

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={isDark ? "فعال‌سازی حالت روشن" : "فعال‌سازی حالت تاریک"}
      title={isDark ? "حالت روشن" : "حالت تاریک"}
      className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-stone-700 bg-stone-800 text-stone-200 shadow-sm transition-colors hover:bg-stone-700 active:bg-stone-600"
    >
      {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </button>
  );
}
