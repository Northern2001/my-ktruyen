import { spawnSync } from "node:child_process";
import {
  access,
  copyFile,
  mkdir,
  mkdtemp,
  readdir,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, extname, join, parse, relative } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const sourceDirectory = join(projectRoot, "memory");
const outputDirectory = join(projectRoot, "public", "memory-media");
const manifestPath = join(outputDirectory, "manifest.json");
const imageExtensions = new Set([".avif", ".gif", ".jpeg", ".jpg", ".png", ".webp"]);
const videoExtensions = new Set([".m4v", ".mp4", ".webm"]);
const sourceExtensions = new Set([".heic", ".heif", ".mov", ...imageExtensions, ...videoExtensions]);

function run(command, args, { optional = false } = {}) {
  const result = spawnSync(command, args, { encoding: "utf8" });

  if (optional && (result.error?.code === "ENOENT" || result.status !== 0)) return null;
  if (result.error || result.status !== 0) {
    const detail = result.stderr?.trim() || result.stdout?.trim() || result.error?.message;
    throw new Error(`${command} failed${detail ? `: ${detail}` : ""}`);
  }

  return result.stdout;
}

async function isCurrent(sourcePath, outputPath) {
  try {
    const [sourceStats, outputStats] = await Promise.all([stat(sourcePath), stat(outputPath)]);
    return outputStats.mtimeMs >= sourceStats.mtimeMs;
  } catch {
    return false;
  }
}

function readSipsMetadata(filePath) {
  const output = run("sips", ["-g", "pixelWidth", "-g", "pixelHeight", "-g", "creation", filePath]);
  const width = Number(output.match(/pixelWidth:\s*(\d+)/)?.[1]) || null;
  const height = Number(output.match(/pixelHeight:\s*(\d+)/)?.[1]) || null;
  const creation = output.match(/creation:\s*(\d{4}):(\d{2}):(\d{2}) (\d{2}:\d{2}:\d{2})/)?.slice(1);
  const createdTime = creation
    ? `${creation[0]}-${creation[1]}-${creation[2]}T${creation[3]}+07:00`
    : null;

  return { width, height, createdTime };
}

function readMdlsValue(filePath, property) {
  const output = run("mdls", ["-raw", "-name", property, filePath], { optional: true });
  const value = output?.trim();
  return value && value !== "(null)" ? value : null;
}

function readVideoMetadata(filePath) {
  const width = Number(readMdlsValue(filePath, "kMDItemPixelWidth")) || null;
  const height = Number(readMdlsValue(filePath, "kMDItemPixelHeight")) || null;
  const durationSeconds = Number(readMdlsValue(filePath, "kMDItemDurationSeconds"));
  const creation = readMdlsValue(filePath, "kMDItemContentCreationDate");
  const createdTime = creation
    ? creation.replace(" +0000", "Z").replace(" ", "T")
    : null;

  return {
    width,
    height,
    durationMs: Number.isFinite(durationSeconds) ? Math.round(durationSeconds * 1000) : null,
    createdTime,
  };
}

async function convertImage(sourcePath, outputPath) {
  if (await isCurrent(sourcePath, outputPath)) return;
  run("sips", [
    "-s", "format", "jpeg",
    "-s", "formatOptions", "84",
    "--resampleWidth", "2000",
    sourcePath,
    "--out", outputPath,
  ]);
}

async function convertVideo(sourcePath, outputPath) {
  if (await isCurrent(sourcePath, outputPath)) return;
  run("avconvert", [
    "--source", sourcePath,
    "--preset", "Preset1280x720",
    "--output", outputPath,
    "--replace",
  ]);
}

async function makeVideoPoster(sourcePath, posterPath, temporaryDirectory) {
  if (await isCurrent(sourcePath, posterPath)) return true;

  const previewOutput = run("qlmanage", [
    "-t", "-s", "1200",
    "-o", temporaryDirectory,
    sourcePath,
  ], { optional: true });
  if (previewOutput === null) return false;

  const previewPath = join(temporaryDirectory, `${basename(sourcePath)}.png`);
  try {
    run("sips", [
      "-s", "format", "jpeg",
      "-s", "formatOptions", "82",
      previewPath,
      "--out", posterPath,
    ]);
    return true;
  } finally {
    await rm(previewPath, { force: true });
  }
}

function publicUrl(fileName) {
  return `/memory-media/${encodeURIComponent(fileName)}`;
}

function imageMimeType(extension) {
  const mimeTypes = {
    ".avif": "image/avif",
    ".gif": "image/gif",
    ".png": "image/png",
    ".webp": "image/webp",
  };
  return mimeTypes[extension] ?? "image/jpeg";
}

async function main() {
  try {
    await access(sourceDirectory);
  } catch {
    console.warn("Memory source folder not found; keeping existing generated media.");
    return;
  }

  await mkdir(outputDirectory, { recursive: true });
  const temporaryDirectory = await mkdtemp(join(tmpdir(), "mkt-memory-"));

  try {
    const sourceEntries = await readdir(sourceDirectory, { withFileTypes: true });
    const sourceNames = sourceEntries
      .filter((entry) => entry.isFile() && sourceExtensions.has(extname(entry.name).toLowerCase()))
      .map((entry) => entry.name)
      .sort((left, right) => right.localeCompare(left, undefined, { numeric: true }));
    const expectedOutputs = new Set([basename(manifestPath)]);
    const items = [];

    for (const sourceName of sourceNames) {
      const sourcePath = join(sourceDirectory, sourceName);
      const sourceStats = await stat(sourcePath);
      const extension = extname(sourceName).toLowerCase();
      const stem = parse(sourceName).name;
      const isImage = extension === ".heic" || extension === ".heif" || imageExtensions.has(extension);

      if (isImage) {
        const outputName = extension === ".heic" || extension === ".heif"
          ? `${stem}.jpg`
          : `${stem}${extension}`;
        const outputPath = join(outputDirectory, outputName);
        expectedOutputs.add(outputName);

        if (extension === ".heic" || extension === ".heif") {
          console.log(`Image  ${sourceName} -> ${outputName}`);
          await convertImage(sourcePath, outputPath);
        } else if (!(await isCurrent(sourcePath, outputPath))) {
          await copyFile(sourcePath, outputPath);
        }

        const metadata = readSipsMetadata(sourcePath);
        items.push({
          id: stem,
          name: sourceName,
          type: "image",
          mimeType: imageMimeType(extension),
          createdTime: metadata.createdTime ?? sourceStats.birthtime.toISOString(),
          modifiedTime: sourceStats.mtime.toISOString(),
          width: metadata.width,
          height: metadata.height,
          durationMs: null,
          thumbnailUrl: publicUrl(outputName),
          mediaUrl: publicUrl(outputName),
        });
        continue;
      }

      const outputName = extension === ".mov" ? `${stem}.mp4` : `${stem}${extension}`;
      const posterName = `${stem}-poster.jpg`;
      const outputPath = join(outputDirectory, outputName);
      const posterPath = join(outputDirectory, posterName);
      expectedOutputs.add(outputName);

      if (extension === ".mov") {
        console.log(`Video  ${sourceName} -> ${outputName}`);
        await convertVideo(sourcePath, outputPath);
      } else if (!(await isCurrent(sourcePath, outputPath))) {
        await copyFile(sourcePath, outputPath);
      }

      const hasPoster = await makeVideoPoster(sourcePath, posterPath, temporaryDirectory);
      if (hasPoster) expectedOutputs.add(posterName);
      const metadata = readVideoMetadata(sourcePath);
      items.push({
        id: stem,
        name: sourceName,
        type: "video",
        mimeType: extension === ".webm" ? "video/webm" : "video/mp4",
        createdTime: metadata.createdTime ?? sourceStats.birthtime.toISOString(),
        modifiedTime: sourceStats.mtime.toISOString(),
        width: metadata.width,
        height: metadata.height,
        durationMs: metadata.durationMs,
        thumbnailUrl: hasPoster ? publicUrl(posterName) : null,
        mediaUrl: publicUrl(outputName),
      });
    }

    for (const outputEntry of await readdir(outputDirectory, { withFileTypes: true })) {
      if (outputEntry.isFile() && !expectedOutputs.has(outputEntry.name)) {
        await rm(join(outputDirectory, outputEntry.name));
      }
    }

    await writeFile(manifestPath, `${JSON.stringify({ items }, null, 2)}\n`, "utf8");
    console.log(`Synced ${items.length} files from ${relative(projectRoot, sourceDirectory)}.`);
  } finally {
    await rm(temporaryDirectory, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
