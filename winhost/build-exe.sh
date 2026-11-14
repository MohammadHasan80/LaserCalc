#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# LaserCalc — بیلد EXE ویندوز (winhost)
# 1) بیلد استاتیک سایت (EXPORT_MODE=1) اگر out/ نبود  2) زیپ → LaserCalc.www.zip
# 3) WebView2Loader.dll از NuGet اگر نبود  4) dotnet publish تک‌فایل
# خروجی: download/LaserCalc-v1.1.22-Windows-x64.exe
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

VERSION="1.1.22"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"   # ریشهٔ ریپو
WH="$ROOT/winhost"
OUT_DIR="${OUT_DIR:-/home/z/my-project/download}"
OUT_EXE="$OUT_DIR/LaserCalc-v$VERSION-Windows-x64.exe"

DOTNET="${DOTNET:-dotnet}"
if ! command -v "$DOTNET" >/dev/null 2>&1; then
  DOTNET="/home/z/my-project/dotnet/dotnet"
fi

echo "═══ [1/4] Next.js static export (EXPORT_MODE=1) ═══"
cd "$ROOT"
if [ ! -f out/index.html ]; then
  if [ ! -d node_modules ]; then
    npm ci --no-audit --no-fund 2>&1 | tail -2 || npm install --no-audit --no-fund 2>&1 | tail -2
  fi
  EXPORT_MODE=1 npx next build
fi
test -f out/index.html || { echo "خطا: out/index.html نیست"; exit 1; }

echo "═══ [2/4] زیپ سایت → LaserCalc.www.zip ═══"
rm -f "$WH/LaserCalc.www.zip"
( cd out && zip -qr "$WH/LaserCalc.www.zip" . )
ls -la "$WH/LaserCalc.www.zip"

echo "═══ [3/4] WebView2Loader.dll (win-x64) ═══"
if [ ! -f "$WH/WebView2Loader.dll" ]; then
  TMPD=$(mktemp -d)
  curl -sSL --retry 3 -o "$TMPD/wv2.nupkg" \
    "https://api.nuget.org/v3-flatcontainer/microsoft.web.webview2/1.0.4314.35/microsoft.web.webview2.1.0.4314.35.nupkg"
  unzip -o -q "$TMPD/wv2.nupkg" "runtimes/win-x64/native/WebView2Loader.dll" -d "$TMPD/x"
  cp "$TMPD/x/runtimes/win-x64/native/WebView2Loader.dll" "$WH/WebView2Loader.dll"
  rm -rf "$TMPD"
fi
ls -la "$WH/WebView2Loader.dll"

echo "═══ [4/4] dotnet publish (تک‌فایل) ═══"
"$DOTNET" publish "$WH/LaserCalc.csproj" -c Release -o "$WH/publish" 2>&1 | tail -4
test -f "$WH/publish/LaserCalc.exe" || { echo "خطا: LaserCalc.exe ساخته نشد"; exit 1; }
mkdir -p "$OUT_DIR"
cp "$WH/publish/LaserCalc.exe" "$OUT_EXE"
rm -f "$OUT_DIR/LaserCalc.pdb"
echo "═══ آماده: $OUT_EXE ═══"
sha256sum "$OUT_EXE"
