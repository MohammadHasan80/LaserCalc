"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { History, Trash2, Eye, FileX2 } from "lucide-react";
import type { SavedInvoice } from "@/lib/invoice-store";
import { faMoney } from "@/lib/persian";
import { SalesReport } from "@/components/app/sales-report";

interface Props {
  invoices: SavedInvoice[];
  onView: (inv: SavedInvoice) => void;
  onDelete: (id: string) => void;
}

export function HistoryView({ invoices, onView, onDelete }: Props) {
  if (invoices.length === 0) {
    return (
      <div className="space-y-6">
        <SalesReport invoices={invoices} />
        <Card className="mx-auto max-w-lg">
          <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
            <FileX2 className="size-10 text-muted-foreground/50" />
            <p className="font-semibold">هنوز فاکتوری ذخیره نشده است</p>
            <p className="text-sm text-muted-foreground">
              در تب «فاکتور» پس از کامل کردن مقادیر، دکمه «ذخیره فاکتور» را بزنید
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SalesReport invoices={invoices} />
      <Card className="mx-auto max-w-4xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <History className="size-4 text-amber-600 dark:text-amber-500" />
          فاکتورهای ذخیره‌شده
        </CardTitle>
        <CardDescription>
          {invoices.length} فاکتور ذخیره شده — برای چاپ مجدد، فاکتور را باز کنید
        </CardDescription>
      </CardHeader>
      <CardContent className="custom-scroll max-h-[65vh] space-y-3 overflow-y-auto pl-1">
        {invoices.map((inv) => (
          <div
            key={inv.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card p-4 transition-colors hover:bg-muted/40"
          >
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="bg-stone-900 text-amber-400 hover:bg-stone-800 dark:bg-stone-800 dark:hover:bg-stone-700">
                  شماره {faMoney(inv.number)}
                </Badge>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {inv.dateJalali}
                </span>
              </div>
              <p className="mt-1.5 truncate text-sm font-semibold">
                {inv.customerName.trim() || "بدون نام مشتری"}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground tabular-nums">
                {inv.items.length} ردیف • قابل پرداخت: {faMoney(inv.total)} ریال
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => onView(inv)}
                className="h-8"
              >
                <Eye className="size-3.5" /> مشاهده
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="size-3.5" />
                    <span className="sr-only">حذف فاکتور</span>
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent dir="rtl">
                  <AlertDialogHeader>
                    <AlertDialogTitle>حذف فاکتور؟</AlertDialogTitle>
                    <AlertDialogDescription>
                      فاکتور شماره {faMoney(inv.number)} برای همیشه حذف می‌شود.
                      این عمل قابل بازگشت نیست.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>انصراف</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => onDelete(inv.id)}
                      className="bg-destructive text-white hover:bg-destructive/90"
                    >
                      حذف کن
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        ))}
      </CardContent>
      </Card>
    </div>
  );
}
