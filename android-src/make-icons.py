#!/usr/bin/env python3
"""ساخت آیکون لانچر در همه تراکم‌ها از تصویر منبع مربعی (android-src/icon-source.png)
用法: make-icons.py <source.png> <res_dir>
اندازه‌ها: mdpi 48 / hdpi 72 / xhdpi 96 / xxhdpi 144 / xxxhdpi 192
"""
import os
import sys

from PIL import Image

DENSITIES = {"mdpi": 48, "hdpi": 72, "xhdpi": 96, "xxhdpi": 144, "xxxhdpi": 192}

src_path, res_dir = sys.argv[1], sys.argv[2]

im = Image.open(src_path).convert("RGBA")
w, h = im.size
side = min(w, h)
# برش مرکزی مربعی (اگر منبع مربع نباشد)
im = im.crop(((w - side) // 2, (h - side) // 2, (w + side) // 2, (h + side) // 2))

for name, size in DENSITIES.items():
    d = os.path.join(res_dir, f"mipmap-{name}")
    os.makedirs(d, exist_ok=True)
    out = im.resize((size, size), Image.LANCZOS)
    out.save(os.path.join(d, "ic_launcher.png"), optimize=True)
    print(f"mipmap-{name}/ic_launcher.png {size}x{size}")
