// Chuyển các bản FLAC hi-res của album HVL thành MP3 cho web.
//
// Chỉ xử lý những bài mà `public/music/` mới chỉ có đoạn clip ngắn — 19 bài còn
// lại đã có sẵn bản MP3 đầy đủ nên không đụng tới.
//
//   node scripts/convert-hvl.mjs [thư-mục-flac] [--force]
//
// Kết quả ghi vào `public/music/hvl/` chứ không ghi đè `public/music/`, vì
// `mot-cai-om.mp3` đang được nhạc của Truyền dùng chung ở dạng đoạn ngắn.

import { spawnSync } from "node:child_process";
import { access, mkdir, readdir, stat } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const outputDirectory = join(projectRoot, "public", "music", "hvl");
const defaultSourceDirectory = join(homedir(), "Downloads", "Hvl");

// Số track trên bìa album -> tên file đích. Track nào không có ở đây nghĩa là
// bản MP3 đầy đủ đã nằm sẵn trong `public/music/`.
const clipOnlyTracks = new Map([
  [1, "elegie.mp3"],
  [5, "baby.mp3"],
  [7, "mat-moi-tay-chan.mp3"],
  [8, "dao-cua-anh-vua.mp3"],
  [10, "night-in-prague.mp3"],
  [11, "mot-cai-om.mp3"],
  [13, "neu-nhu-ta-chang-con.mp3"],
  [14, "ai-moi-la-ke-xau-xa.mp3"],
  [27, "khong-can-lo-cho-tao.mp3"],
  [28, "huh.mp3"],
  [29, "nguyen-van-muoi.mp3"],
]);

function run(command, args) {
  const result = spawnSync(command, args, { encoding: "utf8" });

  if (result.error?.code === "ENOENT") {
    throw new Error(`Không tìm thấy \`${command}\`. Cài bằng: brew install ffmpeg`);
  }
  if (result.error || result.status !== 0) {
    const detail = result.stderr?.trim() || result.stdout?.trim() || result.error?.message;
    throw new Error(`${command} lỗi${detail ? `: ${detail}` : ""}`);
  }

  return result.stdout;
}

function readDuration(filePath) {
  const output = run("ffprobe", [
    "-v", "error",
    "-show_entries", "format=duration",
    "-of", "csv=p=0",
    filePath,
  ]);

  return Number(output.trim());
}

function formatSize(bytes) {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDuration(seconds) {
  const minutes = Math.floor(seconds / 60).toString().padStart(2, "0");
  const rest = Math.floor(seconds % 60).toString().padStart(2, "0");
  return `${minutes}:${rest}`;
}

// Tên file trong thư mục nguồn mở đầu bằng số thứ tự, ví dụ
// "05. RPT MCK_marzuz – Baby (feat. marzuz).flac".
async function mapSourcesByTrackNumber(sourceDirectory) {
  const entries = await readdir(sourceDirectory);
  const byTrack = new Map();

  for (const entry of entries) {
    if (!entry.toLowerCase().endsWith(".flac")) continue;

    const trackNumber = Number(entry.match(/^(\d+)\./)?.[1]);
    if (!Number.isInteger(trackNumber)) continue;

    byTrack.set(trackNumber, join(sourceDirectory, entry));
  }

  return byTrack;
}

async function exists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const args = process.argv.slice(2);
  const force = args.includes("--force");
  const sourceDirectory = args.find((arg) => !arg.startsWith("--")) ?? defaultSourceDirectory;

  if (!(await exists(sourceDirectory))) {
    throw new Error(`Không thấy thư mục nguồn: ${sourceDirectory}`);
  }

  const sources = await mapSourcesByTrackNumber(sourceDirectory);
  const missing = [...clipOnlyTracks.keys()].filter((track) => !sources.has(track));
  if (missing.length > 0) {
    throw new Error(`Thiếu file FLAC cho track: ${missing.join(", ")}`);
  }

  await mkdir(outputDirectory, { recursive: true });

  const durations = [];

  for (const [trackNumber, fileName] of clipOnlyTracks) {
    const sourcePath = sources.get(trackNumber);
    const outputPath = join(outputDirectory, fileName);

    if (!force && (await exists(outputPath))) {
      const seconds = readDuration(outputPath);
      durations.push([trackNumber, fileName, seconds]);
      console.log(`bỏ qua  track ${trackNumber} · ${fileName} (đã có)`);
      continue;
    }

    run("ffmpeg", [
      "-y",
      "-i", sourcePath,
      "-vn", // bỏ ảnh bìa nhúng trong FLAC
      "-c:a", "libmp3lame",
      "-b:a", "192k",
      "-ar", "44100", // hạ từ hi-res xuống chuẩn CD
      outputPath,
    ]);

    const [{ size }, seconds] = [await stat(outputPath), readDuration(outputPath)];
    durations.push([trackNumber, fileName, seconds]);
    console.log(
      `xong    track ${trackNumber} · ${fileName} · ${formatDuration(seconds)} · ${formatSize(size)}`,
    );
  }

  // In ra để điền vào `durationSeconds` của từng bài trong MKTScreen.tsx.
  console.log("\ndurationSeconds:");
  for (const [trackNumber, fileName, seconds] of durations) {
    console.log(`  track ${trackNumber.toString().padStart(2, "0")} (${fileName}): ${seconds}`);
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
