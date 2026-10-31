"use client";

// ─────────────────────────────────────────────────────────────
// کارت پشتیبان‌گیری و بازیابی — همهٔ داده‌ها در یک فایل JSON
// خروجی: دانلود در مرورگر / ذخیره در Downloads از طریق پل اندروید
// ورودی: انتخاب فایل یا چسباندن متن پشتیبان
// ─────────────────────────────────────────────────────────────

import { useRef, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  DatabaseBackup,
  Download,
  Upload,
  FileJson,
  ClipboardPaste,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import {
  buildBackup,
  parseBackup,
  applyBackup,
  downloadBackup,
  type BackupSummary,
} from "@/lib/backup";
import { faNum } from "@/lib/persian";

interface Props {
  onImported: () => void;
}

export function BackupCard({ onImported }: Props) {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<{
    text: string;
    summary: BackupSummary;
  } | null>(null);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState("");

  const handleExport = async () => {
    setBusy(true);
    try {
      const result = await downloadBackup(buildBackup());
      if (result === "android") {
        toast({ title: "پشتیبان ذخیره شد", description: "فایل JSON در پوشه Downloads ذخیره شد." });
      } else if (result === "browser") {
        toast({ title: "پشتیبان ساخته شد", description: "فایل JSON دانلود شد — آن را در جای امن نگه دارید." });
      }
    } finally {
      setBusy(false);
    }
  };

  const handleFile = async (file: File) => {
    const text = await file.text();
    const parsed = parseBackup(text);
    if (!parsed.ok) {
      toast({ title: "فایل نامعتبر", description: parsed.error, variant: "destructive" });
      return;
    }
    setPending({ text, summary: parsed.summary });
  };

  const confirmImport = () => {
    if (!pending) return;
    const parsed = parseBackup(pending.text);
    if (!parsed.ok) {
      setPending(null);
      return;
    }
    applyBackup(parsed.file);
    setPending(null);
    setPasteText("");
    setPasteOpen(false);
    onImported();
    toast({
      title: "بازیابی انجام شد",
      description: "همهٔ داده‌ها از فایل پشتیبان برگرشت.",
    });
  };

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-base">
          <DatabaseBackup className="size-4 text-amber-600 dark:text-amber-500" />
          پشتیبان‌گیری و بازیابی
        </CardTitle>
        <CardDescription>
          همهٔ داده‌ها (فاکتورها، نرخ‌ها، اطلاعات کسب‌وکار و شماره فاکتور) در یک
          فایل — برای تعویض گوشی یا محافظت از داده‌ها
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* خروجی */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-muted/30 p-3 dark:bg-muted/10">
          <div>
            <p className="text-sm font-medium">ساخت فایل پشتیبان</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              در مرورگر دانلود می‌شود؛ در اپ در پوشه Downloads ذخیره می‌شود
            </p>
          </div>
          <Button
            size="sm"
            className="bg-amber-600 text-white hover:bg-amber-700"
            disabled={busy}
            onClick={handleExport}
          >
            <Download className="size-4" />
            دانلود پشتیبان
          </Button>
        </div>

        {/* ورودی */}
        <div className="space-y-3 rounded-xl border bg-muted/30 p-3 dark:bg-muted/10">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium">بازیابی از فایل پشتیبان</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                داده‌های فعلی با محتوای فایل پشتیبان جایگزین می‌شود
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setPasteOpen((v) => !v)}
              >
                <ClipboardPaste className="size-4" />
                از متن
              </Button>
              <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()}>
                <Upload className="size-4" />
                انتخاب فایل
              </Button>
            </div>
          </div>

          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
              e.target.value = "";
            }}
          />

          {pasteOpen && (
            <div className="space-y-2">
              <Textarea
                rows={4}
                dir="ltr"
                className="font-mono text-xs"
                placeholder='{"app":"lasercalc","schema":1,...}'
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
              />
              <Button
                size="sm"
                variant="outline"
                disabled={!pasteText.trim()}
                onClick={() => {
                  const parsed = parseBackup(pasteText);
                  if (!parsed.ok) {
                    toast({ title: "متن نامعتبر", description: parsed.error, variant: "destructive" });
                    return;
                  }
                  setPending({ text: pasteText, summary: parsed.summary });
                }}
              >
                <FileJson className="size-4" />
                بررسی متن
              </Button>
            </div>
          )}
        </div>

        {/* تأیید بازیابی */}
        {pending && (
          <div className="space-y-3 rounded-xl border-2 border-amber-500/60 bg-amber-50/70 p-4 dark:border-amber-500/40 dark:bg-amber-950/20">
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" />
              <div className="text-sm leading-6">
                <p className="font-semibold">بازیابی این پشتیبان؟</p>
                <ul className="mt-1 space-y-0.5 text-xs text-muted-foreground">
                  <li>
                    <CheckCircle2 className="mb-0.5 ml-1 inline size-3 text-emerald-600" />
                    {faNum(pending.summary.invoices)} فاکتور
                  </li>
                  {pending.summary.hasRates && <li>نرخ‌ها و پارامترها</li>}
                  {pending.summary.hasBusiness && <li>اطلاعات کسب‌وکار</li>}
                  {pending.summary.exportedAt && (
                    <li dir="ltr" className="text-left">
                      {new Date(pending.summary.exportedAt).toLocaleString("fa-IR")}
                    </li>
                  )}
                </ul>
                <p className="mt-1.5 text-xs font-medium text-rose-600 dark:text-rose-400">
                  داده‌های فعلی جایگزین می‌شود و قابل بازگشت نیست.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2">
              <Button size="sm" variant="ghost" onClick={() => setPending(null)}>
                انصراف
              </Button>
              <Button
                size="sm"
                className="bg-amber-600 text-white hover:bg-amber-700"
                onClick={confirmImport}
              >
                بازیابی کن
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
