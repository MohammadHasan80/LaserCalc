"use client";

// ─────────────────────────────────────────────────────────────
// گزارش فروش — جمع فاکتورها به تفکیک ماه شمسی (۶ ماه اخیر)
// ─────────────────────────────────────────────────────────────

import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { BarChart3, TrendingUp, CalendarDays, Wallet } from "lucide-react";
import type { SavedInvoice } from "@/lib/invoice-store";
import {
  faMoney,
  faNum,
  jalaliMonthInfo,
  jalaliYearMonth,
  jalaliMonthLabel,
} from "@/lib/persian";

interface MonthRow {
  key: string;
  label: string;
  count: number;
  sum: number;
  isCurrent: boolean;
}

export function SalesReport({ invoices }: { invoices: SavedInvoice[] }) {
  const { current, previous, totalAll, months } = useMemo(() => {
    // ۶ ماه شمسی اخیر — با محاسبهٔ سال/ماه شمسی از تاریخ جاری
    const nowYM = jalaliYearMonth(new Date());
    const keys: { key: string; label: string }[] = [];
    for (let i = 0; i < 6; i++) {
      let m = nowYM.m - i;
      let y = nowYM.y;
      if (m <= 0) {
        m += 12;
        y -= 1;
      }
      keys.push({
        key: `${y}-${String(m).padStart(2, "0")}`,
        label: jalaliMonthLabel(y, m),
      });
    }

    // جمع فاکتورها بر اساس ماه شمسی
    const sums = new Map<string, { sum: number; count: number }>();
    let all = 0;
    for (const inv of invoices) {
      const { key } = jalaliMonthInfo(new Date(inv.dateISO));
      const cur = sums.get(key) ?? { sum: 0, count: 0 };
      cur.sum += inv.total ?? 0;
      cur.count += 1;
      sums.set(key, cur);
      all += inv.total ?? 0;
    }

    const rows: MonthRow[] = keys.map((k, i) => {
      const s = sums.get(k.key) ?? { sum: 0, count: 0 };
      return {
        key: k.key,
        label: k.label,
        count: s.count,
        sum: s.sum,
        isCurrent: i === 0,
      };
    });

    return {
      current: rows[0],
      previous: rows[1],
      totalAll: all,
      months: rows,
    };
  }, [invoices]);

  const maxSum = Math.max(...months.map((m) => m.sum), 1);

  return (
    <Card className="mx-auto max-w-4xl">
      <CardContent className="space-y-4 p-5">
        {/* کاشی‌های خلاصه */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl border bg-muted/40 p-3 text-center">
            <p className="flex items-center justify-center gap-1 text-[11px] text-muted-foreground">
              <CalendarDays className="size-3" /> این ماه
            </p>
            <p className="mt-1 text-sm font-bold tabular-nums sm:text-base">
              {faMoney(current.sum)}
            </p>
            <p className="text-[10px] text-muted-foreground">
              {faNum(current.count)} فاکتور
            </p>
          </div>
          <div className="rounded-xl border bg-muted/40 p-3 text-center">
            <p className="flex items-center justify-center gap-1 text-[11px] text-muted-foreground">
              <TrendingUp className="size-3" /> ماه قبل
            </p>
            <p className="mt-1 text-sm font-bold tabular-nums sm:text-base">
              {faMoney(previous.sum)}
            </p>
            <p className="text-[10px] text-muted-foreground">
              {faNum(previous.count)} فاکتور
            </p>
          </div>
          <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3 text-center dark:border-amber-900/50 dark:bg-amber-950/20">
            <p className="flex items-center justify-center gap-1 text-[11px] text-amber-700 dark:text-amber-400">
              <Wallet className="size-3" /> مجموع کل
            </p>
            <p className="mt-1 text-sm font-bold tabular-nums text-amber-800 dark:text-amber-300 sm:text-base">
              {faMoney(totalAll)}
            </p>
            <p className="text-[10px] text-amber-700/70 dark:text-amber-500/70">
              {faNum(invoices.length)} فاکتور
            </p>
          </div>
        </div>

        {/* ۶ ماه اخیر */}
        <div>
          <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
            <BarChart3 className="size-3.5" />
            ۶ ماه اخیر (مبلغ قابل پرداخت — ریال)
          </p>
          <div className="space-y-1.5">
            {months.map((m) => (
              <div
                key={m.key}
                className="flex items-center gap-2 text-xs sm:text-[13px]"
              >
                <span
                  className={`w-24 shrink-0 truncate ${
                    m.isCurrent
                      ? "font-semibold text-amber-700 dark:text-amber-400"
                      : "text-muted-foreground"
                  }`}
                >
                  {m.label}
                </span>
                <div className="h-4 flex-1 overflow-hidden rounded-full bg-muted/60">
                  <div
                    className={`h-full rounded-full transition-all ${
                      m.isCurrent
                        ? "bg-amber-600"
                        : "bg-stone-400 dark:bg-stone-600"
                    }`}
                    style={{
                      width: `${Math.max(m.sum > 0 ? 4 : 0, (m.sum / maxSum) * 100)}%`,
                    }}
                  />
                </div>
                <span className="w-24 shrink-0 text-left tabular-nums">
                  {m.sum > 0 ? faMoney(m.sum) : "—"}
                </span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
