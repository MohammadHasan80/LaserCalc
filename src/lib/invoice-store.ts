"use client";

import type { CalcInput, InvoiceItem } from "@/lib/pricing";
import { todayJalali } from "@/lib/persian";

export interface SavedInvoice {
  id: string;
  number: string;
  dateISO: string;
  dateJalali: string;
  customerName: string;
  customerPhone: string;
  items: InvoiceItem[];
  total: number;
  input: CalcInput;
}

const INVOICES_KEY = "laser-invoices";
const INPUT_KEY = "laser-calc-input";
const COUNTER_KEY = "laser-inv-counter";

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function loadInvoices(): SavedInvoice[] {
  if (typeof window === "undefined") return [];
  return safeParse<SavedInvoice[]>(localStorage.getItem(INVOICES_KEY), []);
}

export function saveInvoice(inv: SavedInvoice): SavedInvoice[] {
  const list = loadInvoices();
  const next = [inv, ...list.filter((i) => i.id !== inv.id)];
  localStorage.setItem(INVOICES_KEY, JSON.stringify(next));
  return next;
}

export function deleteInvoice(id: string): SavedInvoice[] {
  const next = loadInvoices().filter((i) => i.id !== id);
  localStorage.setItem(INVOICES_KEY, JSON.stringify(next));
  return next;
}

/** پاک‌سازی ورودی‌های ذخیره‌شدهٔ فرم — پس از خروج از برنامه مقادیر خالی باشد */
export function clearInput() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(INPUT_KEY);
}

/** شماره فاکتور بعدی (شروع از ۱۰۰۱) */
export function nextInvoiceNumber(): string {
  if (typeof window === "undefined") return "1001";
  const n = Number(localStorage.getItem(COUNTER_KEY) ?? "1001");
  return String(Number.isFinite(n) && n > 0 ? n : 1001);
}

export function bumpInvoiceCounter(): string {
  if (typeof window === "undefined") return "1001";
  const n = Number(localStorage.getItem(COUNTER_KEY) ?? "1001");
  const next = (Number.isFinite(n) && n > 0 ? n : 1001) + 1;
  localStorage.setItem(COUNTER_KEY, String(next));
  return String(next);
}

export function buildSavedInvoice(
  number: string,
  input: CalcInput,
  items: InvoiceItem[],
  total: number
): SavedInvoice {
  const now = new Date();
  return {
    id: `inv-${now.getTime()}`,
    number,
    dateISO: now.toISOString(),
    dateJalali: todayJalali(now),
    customerName: input.customerName,
    customerPhone: input.customerPhone,
    items,
    total,
    input,
  };
}
