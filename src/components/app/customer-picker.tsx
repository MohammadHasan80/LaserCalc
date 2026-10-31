"use client";

// ─────────────────────────────────────────────────────────────
// انتخاب مشتری از دفترچهٔ فاکتورهای قبلی — جستجو و پر کردن خودکار
// ─────────────────────────────────────────────────────────────

import { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, Search, UserRoundCheck } from "lucide-react";
import type { CustomerEntry } from "@/lib/customers";
import { faNum, toEnDigits } from "@/lib/persian";

interface Props {
  customers: CustomerEntry[];
  onPick: (name: string, phone: string) => void;
}

export function CustomerPicker({ customers, onPick }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = toEnDigits(query.trim()).toLowerCase();
    if (!q) return customers;
    return customers.filter(
      (c) => c.name.toLowerCase().includes(q) || c.phone.includes(q)
    );
  }, [customers, query]);

  const pick = (c: CustomerEntry) => {
    onPick(c.name, c.phone);
    setOpen(false);
    setQuery("");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 shrink-0"
          disabled={customers.length === 0}
        >
          <Users className="size-3.5" />
          مشتریان قبلی
          <Badge className="mr-1 h-4 bg-amber-600 px-1 text-[9px] text-white hover:bg-amber-600">
            {faNum(customers.length)}
          </Badge>
        </Button>
      </DialogTrigger>
      <DialogContent dir="rtl" className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Users className="size-4 text-amber-600 dark:text-amber-500" />
            انتخاب مشتری
          </DialogTitle>
          <DialogDescription>
            از فاکتورهای قبلی — با انتخاب، نام و شماره به‌صورت خودکار پر می‌شود
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="جستجوی نام یا شماره…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pr-9"
            />
          </div>
          <div className="custom-scroll max-h-72 space-y-1.5 overflow-y-auto pl-1">
            {filtered.length === 0 && (
              <p className="py-8 text-center text-sm text-muted-foreground">
                مشتری‌ای پیدا نشد
              </p>
            )}
            {filtered.map((c) => (
              <button
                key={`${c.name}-${c.phone}`}
                type="button"
                onClick={() => pick(c)}
                className="flex w-full items-center justify-between gap-3 rounded-lg border bg-card p-3 text-right transition-colors hover:bg-muted/50"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">
                    {c.name || "بدون نام"}
                  </p>
                  {c.phone && (
                    <p dir="ltr" className="text-xs text-muted-foreground tabular-nums">
                      {c.phone}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-1.5 text-[11px] text-muted-foreground">
                  {faNum(c.invoiceCount)} فاکتور
                  <UserRoundCheck className="size-4 text-amber-600 dark:text-amber-500" />
                </div>
              </button>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
