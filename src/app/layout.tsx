import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

export const metadata: Metadata = {
  title: "اپ قیمت برش لیزر | محاسبه و فاکتور",
  description:
    "محاسبه‌گر قیمت برش لیزر، پرس و ورق به همراه صدور فاکتور فارسی با چاپ",
  keywords: ["برش لیزر", "فاکتور", "قیمت ورق", "پرس", "محاسبه قیمت"],
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#1c1917",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fa" dir="rtl" suppressHydrationWarning>
      <body className="antialiased bg-background text-foreground font-sans">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
