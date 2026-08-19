#!/usr/bin/env python3
"""Dựng lại images/mkt-logo.svg thành chữ MKT.

Logo gốc (MKT) là wordmark vẽ tay: viewBox "253 58 3790 654", 3 path màu
#762326, bọc trong clipPath. Bản MKT giữ nguyên khung và màu đó để không
lệch tỷ lệ — logo được dùng ở hai chỗ với tỷ lệ cố định 3790:654 (thẻ <img>
trong main-title và mặt phẳng 3D scale [4.4, .76]), lệch khung là méo chữ.

Chữ lấy từ GeistMono-Bold.ttf trong repo, chuyển thành path để không phụ
thuộc font khi SVG được nạp làm texture WebGL.

    python3 tools/make-logo.py [--text MKT] [--out images/mkt-logo.svg]
"""

import argparse
from pathlib import Path

from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.ttLib import TTFont

ROOT = Path(__file__).resolve().parent.parent
FONT = ROOT / "fonts" / "GeistMono-Bold.ttf"
COLOR = "#762326"

# Khung của logo gốc — giữ nguyên để tỷ lệ không đổi.
VIEW_X, VIEW_Y, VIEW_W, VIEW_H = 253, 58, 3790, 654
# Chữ chiếm bao nhiêu phần khung; phần còn lại là lề, canh giữa.
FILL_H, FILL_W = 0.88, 0.80


def build(text: str) -> str:
    font = TTFont(FONT)
    glyphs = font.getGlyphSet()
    cmap = font.getBestCmap()

    names = []
    for ch in text:
        if ord(ch) not in cmap:
            raise SystemExit(f"Font không có ký tự {ch!r}")
        names.append(cmap[ord(ch)])

    # Chiều cao chữ hoa đo từ chính các glyph, không tin sCapHeight.
    tops, advances = [], []
    for name in names:
        pen = BoundsPen(glyphs)
        glyphs[name].draw(pen)
        if pen.bounds:
            tops.append(pen.bounds[3])
        advances.append(glyphs[name].width)
    cap = max(tops)

    target_h = VIEW_H * FILL_H
    scale = target_h / cap

    ink = sum(a * scale for a in advances)
    target_w = VIEW_W * FILL_W
    gaps = len(names) - 1
    # Giãn chữ cho kín bề ngang; nếu tự nhiên đã rộng hơn thì thôi, không ép.
    tracking = max(0.0, (target_w - ink) / gaps) if gaps else 0.0

    total_w = ink + tracking * gaps
    x = VIEW_X + (VIEW_W - total_w) / 2
    baseline = VIEW_Y + (VIEW_H + target_h) / 2

    paths = []
    for name, advance in zip(names, advances):
        pen = SVGPathPen(glyphs)
        glyphs[name].draw(pen)
        d = pen.getCommands()
        if d:
            # Trục y của font ngược với SVG nên scale âm theo y.
            transform = f"translate({x:.2f} {baseline:.2f}) scale({scale:.5f} {-scale:.5f})"
            paths.append(f'<path transform="{transform}" d="{d}" fill="{COLOR}"/>')
        x += advance * scale + tracking

    body = "\n".join(paths)
    return (
        f'<svg width="{VIEW_W}" height="{VIEW_H}" '
        f'viewBox="{VIEW_X} {VIEW_Y} {VIEW_W} {VIEW_H}" fill="none" '
        f'xmlns="http://www.w3.org/2000/svg">\n'
        f'<g clip-path="url(#clip0_mkt)">\n{body}\n</g>\n'
        f"<defs>\n<clipPath id=\"clip0_mkt\">\n"
        f'<rect width="{VIEW_W}" height="{VIEW_H}" fill="white" '
        f'transform="translate({VIEW_X} {VIEW_Y})"/>\n'
        f"</clipPath>\n</defs>\n</svg>\n"
    )


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--text", default="MKT")
    parser.add_argument("--out", type=Path, default=ROOT / "images" / "mkt-logo.svg")
    args = parser.parse_args()

    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(build(args.text), encoding="utf-8")
    print(f"Đã ghi {args.out.relative_to(ROOT)} — chữ {args.text!r}, {args.out.stat().st_size} byte")


if __name__ == "__main__":
    main()
