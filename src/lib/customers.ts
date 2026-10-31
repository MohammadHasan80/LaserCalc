"use client";

// ─────────────────────────────────────────────────────────────
// دفترچه مشتریان — استخراج مشتری‌های یکتا از فاکتورهای ذخیره‌شده
// بر اساس نام + شماره موبایل؛ مرتب بر اساس آخرین استفاده
// ─────────────────────────────────────────────────────────────

import type { SavedInvoice } from "@/lib/invoice-store";

export interface CustomerEntry {
  name: string;
  phone: string;
  lastUsedISO: string;
  invoiceCount: number;
}

/** مشتری‌های یکتا از تاریخچهٔ فاکتورها — جدیدترین اول */
export function uniqueCustomers(invoices: SavedInvoice[]): CustomerEntry[] {
  const map = new Map<string, CustomerEntry>();
  for (const inv of invoices) {
    const name = (inv.customerName ?? "").trim();
    const phone = (inv.customerPhone ?? "").trim();
    if (!name && !phone) continue;
    // کلید یکتایی: نام (بی‌اهمیت به بزرگی حروف) یا شماره در نبود نام
    const key = (name || phone).toLowerCase();
    const existing = map.get(key);
    if (existing) {
      existing.invoiceCount += 1;
      if (inv.dateISO > existing.lastUsedISO) {
        existing.lastUsedISO = inv.dateISO;
        // اگر در فاکتور جدیدتر شماره تکمیل شده باشد
        if (phone && !existing.phone) existing.phone = phone;
        if (name && !existing.name) existing.name = name;
      }
    } else {
      map.set(key, {
        name,
        phone,
        lastUsedISO: inv.dateISO,
        invoiceCount: 1,
      });
    }
  }
  return Array.from(map.values()).sort((a, b) =>
    b.lastUsedISO.localeCompare(a.lastUsedISO)
  );
}
