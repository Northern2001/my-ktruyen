#!/usr/bin/env python3
"""Dựng bộ icon MKT: icon PWA, apple-touch, favicon và ảnh chia sẻ og:image.

Icon cũ là ảnh bìa album gốc, không dùng lại được. Bộ mới vẽ hoàn toàn từ code
theo đúng tông app: nền #080808 của theme-color, chữ màu #762326 của wordmark
trong images/mkt-logo.svg. Vì #762326 đặt thẳng lên #080808 chỉ đạt tương phản
1.9:1 (đọc không ra ở cỡ 192px), nền được nâng thành gradient tròn ngả đỏ và
chữ được tô gradient sáng hơn cùng tông — tương phản lên khoảng 3.9:1.

Cỡ favicon 16 và 32 px thì ba chữ MKT bết thành vệt, nên các cỡ đó chỉ vẽ chữ M.

Chữ lấy từ GeistMono-Bold.ttf trong repo, cùng font với logo, giãn chữ (tracking)
cho cân khung. Vẽ ở độ phân giải gấp 4 rồi thu nhỏ để cạnh chữ mịn.

    python3 tools/make-icons.py [--text MKT] [--out images]
"""

import argparse
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parent.parent
FONT = ROOT / "fonts" / "GeistMono-Bold.ttf"

BG_INNER = (42, 14, 16)      # tâm: đen ngả đỏ
BG_OUTER = (7, 6, 7)         # rìa: gần như đen tuyền
BLOOM = (118, 35, 38)        # quầng sáng sau chữ, đúng màu wordmark #762326
INK_TOP = (201, 72, 76)      # đỉnh chữ
INK_BOTTOM = (122, 36, 39)   # chân chữ

SS = 4                       # hệ số vẽ dư rồi thu nhỏ
FILL_W = 0.76                # bề ngang chữ chiếm bao nhiêu phần khung
CAP_H = 0.32                 # chiều cao chữ hoa so với cạnh khung
CAP_H_MARK = 0.46            # riêng frame một chữ (favicon 16/32) thì để to hơn


def radial_background(size: int) -> Image.Image:
    """Gradient tròn, dựng ở 64x64 rồi phóng to — đủ mượt mà rẻ."""
    small = 64
    grad = Image.new("RGB", (small, small))
    pixels = grad.load()
    center = (small - 1) / 2
    # Chuẩn hoá theo nửa đường chéo để bốn góc vừa chạm màu rìa.
    longest = (2 * center**2) ** 0.5
    for y in range(small):
        for x in range(small):
            d = min(1.0, ((x - center) ** 2 + (y - center) ** 2) ** 0.5 / longest)
            t = d * d * (3 - 2 * d)          # smoothstep, tắt dần mềm hơn tuyến tính
            pixels[x, y] = tuple(
                round(a + (b - a) * t) for a, b in zip(BG_INNER, BG_OUTER)
            )
    return grad.resize((size, size), Image.BICUBIC)


def vertical_gradient(size: int, top, bottom) -> Image.Image:
    """Dải màu dọc dùng để tô chữ."""
    strip = Image.new("RGB", (1, size))
    pixels = strip.load()
    for y in range(size):
        t = y / max(1, size - 1)
        pixels[0, y] = tuple(round(a + (b - a) * t) for a, b in zip(top, bottom))
    return strip.resize((size, size), Image.BICUBIC)


def layout(text: str, canvas: int, cap_h: float):
    """Chọn cỡ font và toạ độ từng chữ sao cho khối chữ canh giữa khung."""
    probe = ImageFont.truetype(FONT, 100)
    # Đo trên chính glyph, không tin metric của font.
    boxes = [probe.getbbox(c) for c in text]
    cap = max(b[3] for b in boxes) - min(b[1] for b in boxes)
    px = round(canvas * cap_h * 100 / cap)
    font = ImageFont.truetype(FONT, px)

    boxes = [font.getbbox(c) for c in text]
    widths = [b[2] - b[0] for b in boxes]
    ink = sum(widths)
    gaps = len(text) - 1
    # Giãn cho kín bề ngang; chữ tự nhiên đã rộng hơn thì thôi, không ép.
    tracking = max(0.0, (canvas * FILL_W - ink) / gaps) if gaps else 0.0

    total = ink + tracking * gaps
    top = min(b[1] for b in boxes)
    height = max(b[3] for b in boxes) - top
    x = (canvas - total) / 2
    y = (canvas - height) / 2 - top

    spots = []
    for char, box, width in zip(text, boxes, widths):
        spots.append((char, x - box[0], y))
        x += width + tracking
    return font, spots


def render(size: int, text: str) -> Image.Image:
    canvas = size * SS
    image = radial_background(canvas)
    font, spots = layout(text, canvas, CAP_H_MARK if len(text) == 1 else CAP_H)

    mask = Image.new("L", (canvas, canvas), 0)
    draw = ImageDraw.Draw(mask)
    for char, x, y in spots:
        draw.text((x, y), char, font=font, fill=255)

    # Quầng đỏ nhoè sau chữ: kéo tương phản lên mà không làm chữ bị viền cứng.
    bloom = mask.filter(ImageFilter.GaussianBlur(canvas * 0.055)).point(
        lambda v: round(v * 0.55)
    )
    image = Image.composite(Image.new("RGB", image.size, BLOOM), image, bloom)
    image = Image.composite(vertical_gradient(canvas, INK_TOP, INK_BOTTOM), image, mask)

    return image.resize((size, size), Image.LANCZOS)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--text", default="MKT")
    parser.add_argument("--out", type=Path, default=ROOT / "images")
    args = parser.parse_args()

    args.out.mkdir(parents=True, exist_ok=True)
    slug = args.text.lower()

    # Tên file phải khớp đúng đường dẫn index.html và manifest đang trỏ tới.
    pngs = {
        f"{slug}-icon-512.png": 512,
        f"{slug}-icon-192.png": 192,
        f"{slug}-apple-touch-icon.png": 180,
        f"{slug}-favicon.png": 512,
        f"{slug}-share.png": 1200,          # og:image / twitter:image
    }
    for name, size in pngs.items():
        path = args.out / name
        render(size, args.text).save(path, "PNG", optimize=True)
        print(f"  {path.relative_to(ROOT)}  {size}x{size}  {path.stat().st_size:,} byte")

    # .ico gộp nhiều cỡ; cỡ nhỏ chỉ vẽ chữ đầu cho khỏi bết.
    frames = [render(s, args.text if s >= 48 else args.text[0]) for s in (16, 32, 48, 64)]
    ico = ROOT / "favicon.ico"
    frames[-1].save(ico, "ICO", sizes=[(16, 16), (32, 32), (48, 48), (64, 64)],
                    append_images=frames[:-1])
    print(f"  {ico.relative_to(ROOT)}  16/32/48/64  {ico.stat().st_size:,} byte")

    # Bản clone tĩnh còn giữ nguyên tên file có dấu ? do Next.js sinh ra.
    quirk = ROOT / "favicon.ico?favicon.09dat5z11heb6.ico"
    quirk.write_bytes(ico.read_bytes())
    print(f"  {quirk.name}  (bản sao của favicon.ico)")


if __name__ == "__main__":
    main()
