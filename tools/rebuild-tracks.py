#!/usr/bin/env python3
"""Nạp bộ ảnh mới vào album và nới danh sách bài hát cho vừa số ảnh.

App là bản Next.js đã build; danh sách bài nằm trong mảng `d3` của
_next/static/chunks/2d-j8ddp5r21q.js. Album gốc có 31 track, bộ ảnh mới nhiều
hơn thế, nên script:

  1. chép ảnh nguồn thành images/cover-001.jpg... theo thứ tự tên file;
  2. đổi imageUrl của 31 track sẵn có sang ảnh mới (giữ nguyên tên bài,
     lời, chú thích, file nhạc);
  3. thêm track mới cho số ảnh dôi ra, mỗi track mượn ngẫu nhiên nhạc của
     một bài sẵn có — chọn theo seed cố định để chạy lại ra đúng kết quả cũ.

Track mượn nhạc nào thì lấy luôn tên và thời lượng của bài đó, tên trùng thì
thêm số phía sau, để thứ hiện trên trình phát khớp với thứ đang phát.

Bố cục lưới 3D tự tính theo d3.length (d4=Math.min(7,d3.length)) nên thêm
track không phải sửa gì thêm.

    python3 tools/rebuild-tracks.py /duong/dan/thu-muc-anh [--apply]
"""

import argparse
import json
import random
import re
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CHUNK = ROOT / "_next" / "static" / "chunks" / "2d-j8ddp5r21q.js"
BACKUP = CHUNK.with_suffix(".js.bak")
IMAGES = ROOT / "images"
IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".webp", ".avif"}
SEED = 20260819


def load_source():
    """Luôn dựng lại từ bản gốc để chạy nhiều lần không cộng dồn track."""
    if not BACKUP.exists():
        shutil.copy2(CHUNK, BACKUP)
    return BACKUP.read_text(encoding="utf-8")


def find_array(src):
    """Trả về (đầu, cuối) của mảng d3, cuối là chỉ số của dấu ] đóng."""
    anchor = src.find("let d3=[{numberTrack:0")
    if anchor < 0:
        sys.exit("Không tìm thấy mảng d3 — file có thể đã đổi sau khi build lại.")
    start = src.index("[", anchor)
    depth, quote, escaped = 0, None, False
    for i in range(start, len(src)):
        c = src[i]
        if escaped:
            escaped = False
            continue
        if quote:
            if c == "\\":
                escaped = True
            elif c == quote:
                quote = None
            continue
        if c in "\"'`":
            quote = c
        elif c in "[{(":
            depth += 1
        elif c in "]})":
            depth -= 1
            if depth == 0:
                return start, i
    sys.exit("Mảng d3 không đóng ngoặc — file hỏng?")


def split_objects(body):
    """Cắt phần trong mảng thành từng object track, giữ nguyên chuỗi gốc."""
    spans, depth, quote, escaped, start = [], 0, None, False, None
    for i, c in enumerate(body):
        if escaped:
            escaped = False
            continue
        if quote:
            if c == "\\":
                escaped = True
            elif c == quote:
                quote = None
            continue
        if c in "\"'`":
            quote = c
        elif c == "{":
            if depth == 0:
                start = i
            depth += 1
        elif c == "}":
            depth -= 1
            if depth == 0:
                spans.append((start, i + 1))
    return spans


def field(text, name):
    m = re.search(name + r':"((?:[^"\\]|\\.)*)"', text)
    return m.group(1) if m else None


def collect_images(src_dir):
    files = sorted(
        p for p in src_dir.iterdir()
        if p.is_file() and not p.name.startswith(".") and p.suffix.lower() in IMAGE_EXTS
    )
    if not files:
        sys.exit(f"Không có ảnh nào trong {src_dir}")
    return files


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("source", type=Path, help="Thư mục ảnh mới")
    parser.add_argument("--apply", action="store_true", help="Ghi thật (mặc định chỉ xem trước)")
    parser.add_argument("--seed", type=int, default=SEED)
    args = parser.parse_args()

    if not args.source.is_dir():
        sys.exit(f"Không phải thư mục: {args.source}")

    src = load_source()
    start, end = find_array(src)
    body = src[start + 1:end]
    spans = split_objects(body)
    tracks = [body[a:b] for a, b in spans]

    images = collect_images(args.source)
    names = [f"cover-{i:03d}{p.suffix.lower()}" for i, p in enumerate(images, 1)]

    # Nguồn nhạc để mượn: chỉ các bài thật, bỏ track trailer dạng "stream".
    songs = []
    for text in tracks:
        if field(text, "type") != "pulled":
            continue
        duration = re.search(r"durationSeconds:([\d.]+|null)", text)
        songs.append({
            "title": field(text, "title"),
            "subtitle": field(text, "subtitle"),
            "audio": field(text, "audioUrl"),
            "duration": duration.group(1) if duration else "null",
        })

    keep = min(len(tracks), len(images))
    extra = len(images) - keep

    # Đổi ảnh cho các track sẵn có.
    rebuilt, cursor, out = [], 0, []
    for index, (span, text) in enumerate(zip(spans, tracks)):
        if index < keep:
            text = re.sub(r'imageUrl:"(?:[^"\\]|\\.)*"',
                          f'imageUrl:"/images/{names[index]}"', text, count=1)
        rebuilt.append(text)
    out = []
    for (a, b), text in zip(spans, rebuilt):
        out.append(body[cursor:a])
        out.append(text)
        cursor = b
    out.append(body[cursor:])
    new_body = "".join(out)

    # Thêm track cho ảnh dôi ra.
    rng = random.Random(args.seed)
    used, added = {}, []
    for offset in range(extra):
        number = len(tracks) + offset
        song = rng.choice(songs)
        used[song["title"]] = used.get(song["title"], 1) + 1
        title = song["title"] if used[song["title"]] == 1 else f"{song['title']} {used[song['title']]}"
        added.append(
            "{numberTrack:%d,durationSeconds:%s,title:%s,subtitle:%s,imageUrl:%s,audioUrl:%s,type:\"pulled\"}"
            % (
                number,
                song["duration"],
                json.dumps(title, ensure_ascii=False),
                json.dumps(song["subtitle"] or "RPT MCK", ensure_ascii=False),
                json.dumps(f"/images/{names[number]}", ensure_ascii=False),
                json.dumps(song["audio"], ensure_ascii=False),
            )
        )
    if added:
        new_body = new_body + "," + ",".join(added)

    # Bản .bak nguồn đã mang thương hiệu MKT sẵn nên không cần vá alt logo nữa.
    result = src[:start] + "[" + new_body + "]" + src[end + 1:]

    print(f"ảnh nguồn      : {len(images)}")
    print(f"track sẵn có   : {len(tracks)} (đổi ảnh {keep})")
    print(f"track thêm mới : {extra}")
    print(f"tổng sau khi sửa: {len(tracks) + extra}")
    if len(images) < len(tracks):
        print(f"CẢNH BÁO: thiếu {len(tracks) - len(images)} ảnh, các track cuối giữ ảnh cũ")

    if not args.apply:
        print("\nXem trước. Thêm --apply để ghi.")
        return

    IMAGES.mkdir(exist_ok=True)
    for source, name in zip(images, names):
        shutil.copy2(source, IMAGES / name)
    CHUNK.write_text(result, encoding="utf-8")

    check = subprocess.run(["node", "--check", str(CHUNK)], capture_output=True, text=True)
    if check.returncode != 0:
        shutil.copy2(BACKUP, CHUNK)
        sys.exit(f"JS lỗi cú pháp sau khi sửa, đã khôi phục bản gốc:\n{check.stderr}")

    print(f"\nĐã chép {len(images)} ảnh vào images/ và cập nhật chunk (node --check đạt).")


if __name__ == "__main__":
    main()
