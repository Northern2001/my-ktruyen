#!/usr/bin/env python3
"""Xuất images/mkt-logo.svg ra PNG để xem thử.

Máy này không có renderer SVG nào (cairosvg/rsvg/inkscape đều thiếu), còn
qlmanage thì bỏ qua viewBox nên cắt mất chữ — kể cả với logo gốc. Script này
tự tô các path trong SVG bằng PIL để xem đúng tỷ lệ. Chỉ dùng được cho SVG do
make-logo.py sinh ra: path phẳng, không có lỗ bên trong chữ.

    python3 tools/preview-logo.py [--out /tmp/logo.png] [--scale 0.4]
"""

import argparse
import re
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
ARGS = {"M": 2, "L": 2, "H": 1, "V": 1, "Q": 4, "C": 6, "Z": 0}


def flatten(p0, pts, steps=24):
    """Chia nhỏ đường bezier bậc 2/3 thành các đoạn thẳng."""
    out = []
    for i in range(1, steps + 1):
        t = i / steps
        u = 1 - t
        if len(pts) == 2:
            (x1, y1), (x2, y2) = pts
            out.append((u * u * p0[0] + 2 * u * t * x1 + t * t * x2,
                        u * u * p0[1] + 2 * u * t * y1 + t * t * y2))
        else:
            (x1, y1), (x2, y2), (x3, y3) = pts
            out.append((u**3 * p0[0] + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t**3 * x3,
                        u**3 * p0[1] + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t**3 * y3))
    return out


def parse_path(d):
    tokens = re.findall(r"[MLHVQCZmlhvqcz]|-?\d*\.?\d+", d)
    contours, current, point, cmd, i = [], [], (0.0, 0.0), "M", 0
    while i < len(tokens):
        if tokens[i].isalpha():
            cmd = tokens[i].upper()
            i += 1
            if cmd == "Z" and current:
                contours.append(current)
                current = []
            continue
        if cmd == "M" and current:
            cmd = "L"  # toạ độ lặp ngay sau M được hiểu là lineto
        count = ARGS[cmd]
        values = [float(v) for v in tokens[i:i + count]]
        i += count
        if cmd == "M":
            if current:
                contours.append(current)
            point = (values[0], values[1])
            current = [point]
        elif cmd == "L":
            point = (values[0], values[1])
            current.append(point)
        elif cmd == "H":
            point = (values[0], point[1])
            current.append(point)
        elif cmd == "V":
            point = (point[0], values[0])
            current.append(point)
        else:
            pts = [(values[k], values[k + 1]) for k in range(0, count, 2)]
            current.extend(flatten(point, pts))
            point = pts[-1]
    if current:
        contours.append(current)
    return contours


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--svg", type=Path, default=ROOT / "images" / "mkt-logo.svg")
    parser.add_argument("--out", type=Path, default=Path("/tmp/logo-preview.png"))
    parser.add_argument("--scale", type=float, default=0.4)
    args = parser.parse_args()

    svg = args.svg.read_text(encoding="utf-8")
    vx, vy, vw, vh = (float(v) for v in re.search(r'viewBox="([\d.\- ]+)"', svg).group(1).split())

    scale = args.scale
    image = Image.new("RGB", (round(vw * scale), round(vh * scale)), "white")
    draw = ImageDraw.Draw(image)

    box = [1e9, 1e9, -1e9, -1e9]
    pattern = (r'<path transform="translate\(([\d.\-]+) ([\d.\-]+)\) '
               r'scale\(([\d.\-]+) ([\d.\-]+)\)" d="([^"]+)" fill="([^"]+)"')
    for match in re.finditer(pattern, svg):
        tx, ty, sx, sy = (float(match.group(k)) for k in range(1, 5))
        colour = match.group(6)
        for contour in parse_path(match.group(5)):
            pts = [((tx + x * sx - vx) * scale, (ty + y * sy - vy) * scale) for x, y in contour]
            for px, py in pts:
                box = [min(box[0], px), min(box[1], py), max(box[2], px), max(box[3], py)]
            if len(pts) > 2:
                draw.polygon(pts, fill=colour)

    image.save(args.out)
    print(f"{args.out}  {image.width}x{image.height}px  (tỷ lệ {vw / vh:.2f}:1)")
    print(f"chữ: x {box[0]:.0f}..{box[2]:.0f}, y {box[1]:.0f}..{box[3]:.0f}")
    print(f"lề ngang {box[0]:.0f}/{image.width - box[2]:.0f}  •  lề dọc {box[1]:.0f}/{image.height - box[3]:.0f}")


if __name__ == "__main__":
    main()
