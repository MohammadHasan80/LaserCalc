import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/theme-provider";

export const metadata: Metadata = {
  title: "LaserCalc | محاسبه قیمت و فاکتور برش لیزر",
  description:
    "محاسبه‌گر قیمت برش لیزر، پرس و ورق به همراه صدور فاکتور فارسی با چاپ",
  keywords: ["برش لیزر", "فاکتور", "قیمت ورق", "پرس", "محاسبه قیمت"],
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#1c1917",
};

/* ═══ فونت وزیرمتن (محلی) ═══
   تعریف @font-face در یک <style> درون‌خطی قرار می‌گیرد تا url فونت‌ها نسبت به
   صفحه حل شود و با basePath انتشار وب (زیرمسیر /LaserCalc) هم کار کند؛
   در اپ اندروید/ویندوز متغیر خالی است و مسیرها مثل قبل از ریشه خوانده می‌شوند. */
const FONT_BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const FONT_FACES = [
  ["Light", 300],
  ["Regular", 400],
  ["Medium", 500],
  ["SemiBold", 600],
  ["Bold", 700],
  ["ExtraBold", 800],
] as const;

const FONT_CSS = FONT_FACES.map(
  ([name, weight]) =>
    `@font-face{font-family:"Vazirmatn";src:url("${FONT_BASE}/fonts/Vazirmatn-${name}.woff2") format("woff2");font-weight:${weight};font-style:normal;font-display:swap;}`
).join("\n");

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fa" dir="rtl" suppressHydrationWarning>
      <body className="antialiased bg-background text-foreground font-sans">
        <style dangerouslySetInnerHTML={{ __html: FONT_CSS }} />
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
