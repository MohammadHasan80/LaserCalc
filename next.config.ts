import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // حالت عادی: standalone (سرور/پیش‌نمایش)
  // حالت APK: EXPORT_MODE=1 → خروجی کاملاً استاتیک برای WebView آفلاین
  output: process.env.EXPORT_MODE === "1" ? "export" : "standalone",
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
};

export default nextConfig;
