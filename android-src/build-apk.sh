#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────
# LaserCalc — ساخت APK اندروید (WebView + خروجی استاتیک Next)
# نسخه: تنها از همین‌جا خوانده می‌شود؛ به aapt2 link پاس داده
# می‌شود و روی مانیفست غلبه می‌کند.
# ابزارها (build-tools/platform/JDK17) اگر نبودند خودکار دانلود
# و استخراج می‌شوند — محیط تازه هم بدون آماده‌سازی کار می‌کند.
# ──────────────────────────────────────────────────────────────
set -euo pipefail

VERSION_NAME="1.0.0"
VERSION_CODE=1

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
AT="${ANDROID_TOOLS:-/home/z/my-project/android-tools}"
BT=$AT/bt/android-14          # build-tools r34
PLAT=$AT/plat/android-34      # platform android-34
JDK=$AT/jdk

# مواد امضا (keystore و رمز) عمداً خارج از مخزن نگهداری می‌شوند تا هرگز
# عمومی نشوند — مسیر پیش‌فرض: پوشهٔ keystore کنار مخزن (قابل تغییر با env)
KS_DIR="${KEYSTORE_DIR:-$(dirname "$ROOT")/keystore}"
KS="${KEYSTORE:-$KS_DIR/release.keystore}"
[ -f "$KS" ] || { echo "خطا: keystore پیدا نشد: $KS" >&2; exit 1; }
[ -f "$KS_DIR/keystore.env" ] && . "$KS_DIR/keystore.env"
: "${KS_PASS:?خطا: KS_PASS تنظیم نشده — فایل $KS_DIR/keystore.env را بسازید}"

RES=$ROOT/android-build/res
BUILD=$ROOT/android-build
OUT_DIR="${OUT_DIR:-/home/z/my-project/download}"
OUT_APK=$OUT_DIR/LaserCalc-v$VERSION_NAME.apk

# ─── آماده‌سازی ابزارها در صورت نبود ───
mkdir -p "$AT" "$OUT_DIR"
if [ ! -x "$BT/aapt2" ]; then
  echo "── دانلود build-tools r34 ──"
  mkdir -p "$AT/bt"
  curl -sSL --retry 3 -o "$AT/bt.zip" \
    https://dl.google.com/android/repository/build-tools_r34-linux.zip
  unzip -q "$AT/bt.zip" -d "$AT/bt" && rm "$AT/bt.zip"
fi
if [ ! -f "$PLAT/android.jar" ]; then
  echo "── دانلود platform android-34 ──"
  mkdir -p "$AT/plat"
  curl -sSL --retry 3 -o "$AT/plat.zip" \
    https://dl.google.com/android/repository/platform-34-ext7_r03.zip
  unzip -q "$AT/plat.zip" -d "$AT/plat" && rm "$AT/plat.zip"
fi
if [ ! -x "$JDK/bin/javac" ]; then
  echo "── دانلود JDK 17 ──"
  mkdir -p "$JDK"
  curl -sSL --retry 3 -o "$AT/jdk.tar.gz" \
    "https://api.adoptium.net/v3/binary/latest/17/ga/linux/x64/jdk/hotspot/normal/eclipse"
  tar -xzf "$AT/jdk.tar.gz" -C "$JDK" --strip-components=1 && rm "$AT/jdk.tar.gz"
fi

export JAVA_HOME=$JDK
export PATH=$JDK/bin:$BT:$PATH

echo "═══ [1/8] Next.js static export (EXPORT_MODE=1) ═══"
# نکته: npm run build برای standalone تنظیم شده و در حالت export
# دستور cp آن خطا می‌دهد — مستقیم next build می‌زنیم.
cd "$ROOT"
EXPORT_MODE=1 npx next build
test -f out/index.html || { echo "خطا: out/index.html نیست"; exit 1; }

echo "═══ [2/8] آیکون لانچر — همه تراکم‌ها + تطبیقی ═══"
rm -rf "$BUILD"
mkdir -p "$RES"
python3 android-src/make-icons.py android-src/icon-source.png "$RES"

echo "═══ [3/8] res/xml — network security config ═══"
mkdir -p "$RES/xml"
cp android-src/network_security_config.xml "$RES/xml/"

echo "═══ [4/8] aapt2 compile + link ═══"
"$BT/aapt2" compile --dir "$RES" -o "$BUILD/res.zip"
"$BT/aapt2" link \
  -o "$BUILD/base.apk" \
  -I "$PLAT/android.jar" \
  --manifest android-src/AndroidManifest.xml \
  --version-code "$VERSION_CODE" \
  --version-name "$VERSION_NAME" \
  --java "$BUILD/gen" \
  -A out \
  --auto-add-overlay \
  "$BUILD/res.zip"

echo "═══ [5/8] javac ═══"
mkdir -p "$BUILD/classes"
"$JDK/bin/javac" --release 11 \
  -classpath "$PLAT/android.jar" \
  -d "$BUILD/classes" \
  "$BUILD/gen/com/MohammadHasan/LaserCalc/R.java" \
  android-src/MainActivity.java

echo "═══ [6/8] d8 → classes.dex ═══"
mkdir -p "$BUILD/dex-out"
find "$BUILD/classes" -name '*.class' > "$BUILD/classlist.txt"
"$BT/d8" --release --min-api 24 --lib "$PLAT/android.jar" \
  --output "$BUILD/dex-out" \
  $(cat "$BUILD/classlist.txt" | tr '\n' ' ')
test -f "$BUILD/dex-out/classes.dex" || { echo "خطا: dex ساخته نشد"; exit 1; }

echo "═══ [7/8] افزودن classes.dex به APK ═══"
( cd "$BUILD/dex-out" && zip -q "$BUILD/base.apk" classes.dex )

echo "═══ [8/8] zipalign + apksigner ═══"
"$BT/zipalign" -f 4 "$BUILD/base.apk" "$BUILD/aligned.apk"
"$BT/apksigner" sign \
  --ks "$KS" \
  --ks-key-alias lasercut \
  --ks-pass "pass:$KS_PASS" \
  --key-pass "pass:$KS_PASS" \
  --out "$OUT_APK" \
  "$BUILD/aligned.apk"

"$BT/apksigner" verify --print-certs "$OUT_APK" | head -4
echo "═══ آماده: $OUT_APK ═══"
