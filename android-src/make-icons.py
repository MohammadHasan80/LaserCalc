#!/usr/bin/env python3
"""ساخت آیکون لانچر در همه تراکم‌ها از تصویر منبع مربعی (android-src/icon-source.png)
用法: make-icons.py <source.png> <res_dir>
اندازه‌ها: mdpi 48 / hdpi 72 / xhdpi 96 / xxhdpi 144 / xxxhdpi 192
+ آیکون تطبیقی اندروید ۸+ (API 26):
  - values/colors.xml  → رنگ پس‌زمینه (میانه پیکسل‌های پس‌زمینه تصویر)
  - mipmap-anydpi-v26/ic_launcher.xml → adaptive-icon
  - mipmap-*/ic_launcher_foreground.png → تصویر با پس‌زمینه تخت‌شده (حذف وینیت)
    + برش هوشمند حول محتوا + رعایت دایره امن → بدون هیچ درزی روی هر ماسکی
"""
import math
import os
import sys

import numpy as np
from PIL import Image, ImageChops

DENSITIES = {"mdpi": 48, "hdpi": 72, "xhdpi": 96, "xxhdpi": 144, "xxxhdpi": 192}
# بوم آیکون تطبیقی = 108dp → 108/162/216/324/432 پیکسل
ADAPTIVE = {"mdpi": 108, "hdpi": 162, "xhdpi": 216, "xxhdpi": 324, "xxxhdpi": 432}
SAFE_ZONE = 0.61      # قطر دایره امن = 66dp از بوم 108dp (مرجع)
CONTENT_TARGET = 0.63  # سهم قطر محتوا از بوم (کمی بزرگ‌تر از دایره امن)
FEATHER_FRAC = 0.07    # گرادیان شفافیت لبه مربع پیش‌زمینه (حذف هر مرز محسوس)

ADAPTIVE_XML = """<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/ic_launcher_background"/>
    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>
</adaptive-icon>
"""

COLORS_XML = """<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="ic_launcher_background">{bg}</color>
</resources>
"""


def flatten_bg(img: Image.Image) -> tuple[Image.Image, str]:
    """حذف وینیت کم‌فرکانس: میدان روشنایی پس‌زمینه را تخمین می‌زند و به رنگ ثابت می‌برد.
    خروجی: (تصویر تخت‌شده، رنگ پس‌زمینه به‌صورت ‎#RRGGBB)"""
    arr = np.asarray(img.convert("RGB"), dtype=np.float32)
    mx = arr.max(axis=2)
    sat = mx - arr.min(axis=2)
    # تیره و کم‌اشباع و نزدیک به رنگ غالب پس‌زمینه (نور جرقه‌ها را کنار می‌گذارد)
    bg_mask = (mx < 80) & (sat < 30)
    if bg_mask.any():
        med = np.median(arr[bg_mask], axis=0)
        bg_mask &= (np.linalg.norm(arr - med[None, None, :], axis=2) < 25)

    solid = np.median(arr[bg_mask], axis=0) if bg_mask.any() else np.array([37, 40, 46], np.float32)

    H, W = bg_mask.shape
    B = 16
    gh, gw = (H + B - 1) // B, (W + B - 1) // B
    grid = np.full((gh, gw, 3), np.nan, dtype=np.float32)
    for gy in range(gh):
        for gx in range(gw):
            blk = bg_mask[gy * B:(gy + 1) * B, gx * B:(gx + 1) * B]
            if blk.any():
                grid[gy, gx] = arr[gy * B:(gy + 1) * B, gx * B:(gx + 1) * B][blk].mean(axis=0)

    # پر کردن خانه‌های بدون پیکسل پس‌زمینه با نزدیک‌ترین همسایه معتبر
    valid = ~np.isnan(grid[..., 0])
    if not valid.all():
        idx = np.argwhere(valid)
        for gy in range(gh):
            for gx in range(gw):
                if not valid[gy, gx]:
                    d = ((idx - np.array([gy, gx])) ** 2).sum(axis=1)
                    grid[gy, gx] = grid[tuple(idx[d.argmin()])]

    # نرم‌سازی میدان (یک بار box blur — گذارهای تیز مثل سایه حفظ شود)
    g = grid
    p = np.pad(g, ((1, 1), (1, 1), (0, 0)), mode="edge")
    g = (p[:-2, :-2] + p[:-2, 1:-1] + p[:-2, 2:] +
         p[1:-1, :-2] + p[1:-1, 1:-1] + p[1:-1, 2:] +
         p[2:, :-2] + p[2:, 1:-1] + p[2:, 2:]) / 9.0

    field = np.asarray(
        Image.fromarray(np.clip(g, 0, 255).astype(np.uint8)).resize((W, H), Image.BICUBIC),
        dtype=np.float32)
    out = np.clip(arr + (solid[None, None, :] - field), 0, 255).astype(np.uint8)
    return Image.fromarray(out), "#%02X%02X%02X" % tuple(int(v) for v in solid)


def feather_edges(img: Image.Image, frac: float = FEATHER_FRAC) -> Image.Image:
    """گرادیان شفافیت روی لبه‌های تصویر مربعی (حذف مرز سخت بین لایه و پس‌زمینه)"""
    arr = np.array(img)
    s = arr.shape[0]
    f = max(2, round(s * frac))
    ramp = np.ones((s, s), dtype=np.float32)
    lin = np.linspace(0.0, 1.0, f, dtype=np.float32)
    ramp[:f, :] *= lin[:, None]
    ramp[-f:, :] *= lin[::-1][:, None]
    ramp[:, :f] *= lin[None, :]
    ramp[:, -f:] *= lin[::-1][None, :]
    arr[..., 3] = (arr[..., 3].astype(np.float32) * ramp).astype(np.uint8)
    return Image.fromarray(arr)


src_path, res_dir = sys.argv[1], sys.argv[2]

im = Image.open(src_path).convert("RGBA")
w, h = im.size
side = min(w, h)
# برش مرکزی مربعی (اگر منبع مربع نباشد)
im = im.crop(((w - side) // 2, (h - side) // 2, (w + side) // 2, (h + side) // 2))

# ── ۱) آیکون کلاسیک (اندروید ۷ و پایین‌تر) — تمام‌صفحه با وینیت طبیعی ──
for name, size in DENSITIES.items():
    d = os.path.join(res_dir, f"mipmap-{name}")
    os.makedirs(d, exist_ok=True)
    out = im.resize((size, size), Image.LANCZOS)
    out.save(os.path.join(d, "ic_launcher.png"), optimize=True)
    print(f"mipmap-{name}/ic_launcher.png {size}x{size}")

# ── ۲) کادر محتوا روی تصویر اصلی ──
rgb = im.convert("RGB")
cw, chh = rgb.size
corners = [(8, 8), (cw - 9, 8), (8, chh - 9), (cw - 9, chh - 9)]
bg = tuple(sum(rgb.getpixel(c)[i] for c in corners) // 4 for i in range(3))
diff = ImageChops.difference(rgb, Image.new("RGB", rgb.size, bg))
mask = diff.convert("L").point(lambda p: 255 if p > 26 else 0)
bbox = mask.getbbox() or (0, 0, side, side)
bcx = (bbox[0] + bbox[2]) / 2
bcy = (bbox[1] + bbox[3]) / 2
bw, bh = bbox[2] - bbox[0], bbox[3] - bbox[1]
content_diag = math.hypot(bw, bh)

# برش مربعی حول مرکز محتوا با حاشیه ۸٪ (گلو/سایه‌های کم‌رنگ را هم می‌گیرد)
crop_side = int(min(side, max(bw, bh) * 1.16))
x0 = min(max(round(bcx - crop_side / 2), 0), side - crop_side)
y0 = min(max(round(bcy - crop_side / 2), 0), side - crop_side)
crop = im.crop((x0, y0, x0 + crop_side, y0 + crop_side))

# ── ۳) تخت‌کردن پس‌زمینه (حذف وینیت) فقط برای لایه پیش‌زمینه adaptive ──
flat, bg_hex = flatten_bg(crop)
flat = flat.convert("RGBA")

# مقیاس: قطر محتوا ≈ ۶۳٪ بوم (سقف: مربع برش حداکثر ۸۰٪ بوم)
for name, canvas in ADAPTIVE.items():
    k = min(CONTENT_TARGET * canvas / max(content_diag, 1),
            0.80 * canvas / crop_side)
    # داون‌اسکیل دومرحله‌ای: BOX (بدون ringing) سپس LANCZOS برای شارپ بودن نهایی
    target = max(1, round(crop_side * k))
    mid = min(crop_side, target * 2)
    scaled = flat.resize((mid, mid), Image.BOX).resize((target, target), Image.LANCZOS)
    scaled = feather_edges(scaled)
    fg = Image.new("RGBA", (canvas, canvas), (0, 0, 0, 0))
    # alpha_composite (نه paste با ماسک) — paste مقادیر RGB را در ماسک ضرب می‌کند
    # و با composite بعدیِ لانچر، آلفا دوبار اعمال و لبه تیره می‌شود
    fg.alpha_composite(scaled, (round((canvas - scaled.width) / 2),
                                round((canvas - scaled.height) / 2)))
    d = os.path.join(res_dir, f"mipmap-{name}")
    os.makedirs(d, exist_ok=True)
    fg.save(os.path.join(d, "ic_launcher_foreground.png"), optimize=True)
    print(f"mipmap-{name}/ic_launcher_foreground.png {canvas}x{canvas} (k={k:.2f})")

# ── ۴) XML آیکون تطبیقی + رنگ پس‌زمینه ──
d26 = os.path.join(res_dir, "mipmap-anydpi-v26")
os.makedirs(d26, exist_ok=True)
with open(os.path.join(d26, "ic_launcher.xml"), "w", encoding="utf-8") as f:
    f.write(ADAPTIVE_XML)
dval = os.path.join(res_dir, "values")
os.makedirs(dval, exist_ok=True)
with open(os.path.join(dval, "colors.xml"), "w", encoding="utf-8") as f:
    f.write(COLORS_XML.format(bg=bg_hex))
print(f"mipmap-anydpi-v26/ic_launcher.xml + values/colors.xml (bg {bg_hex})")
