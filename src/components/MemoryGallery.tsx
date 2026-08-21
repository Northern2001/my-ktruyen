"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { sitePath } from "../lib/site-path";

type MemoryMediaType = "image" | "video";

type MemoryItem = {
  id: string;
  name: string;
  type: MemoryMediaType;
  mimeType: string;
  createdTime: string | null;
  modifiedTime: string | null;
  width: number | null;
  height: number | null;
  durationMs: number | null;
  thumbnailUrl: string | null;
  mediaUrl: string;
};

type MemoryManifest = {
  items?: MemoryItem[];
};

type MemoryFilter = "all" | MemoryMediaType;

const manifestUrl = sitePath("/memory-media/manifest.json");

const dateFormatter = new Intl.DateTimeFormat("vi-VN", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "Asia/Ho_Chi_Minh",
});

function formatDate(value: string | null) {
  if (!value) return "Không rõ ngày";
  return dateFormatter.format(new Date(value));
}

function formatDuration(durationMs: number | null) {
  if (!durationMs || durationMs < 0) return null;
  const totalSeconds = Math.floor(durationMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

async function readMemoryItems(signal?: AbortSignal) {
  const response = await fetch(manifestUrl, { cache: "no-store", signal });
  if (!response.ok) throw new Error(`Không thể đọc danh sách Memory (${response.status}).`);
  const manifest = (await response.json()) as MemoryManifest;
  return Array.isArray(manifest.items)
    ? manifest.items.map((item) => ({
        ...item,
        thumbnailUrl: item.thumbnailUrl ? sitePath(item.thumbnailUrl) : null,
        mediaUrl: sitePath(item.mediaUrl),
      }))
    : [];
}

export function MemoryGallery() {
  const [items, setItems] = useState<MemoryItem[]>([]);
  const [filter, setFilter] = useState<MemoryFilter>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const loadItems = useCallback(async (signal?: AbortSignal) => {
    try {
      setItems(await readMemoryItems(signal));
      setError(null);
    } catch (loadError) {
      if (loadError instanceof DOMException && loadError.name === "AbortError") return;
      setError(loadError instanceof Error ? loadError.message : "Không thể đọc thư mục Memory.");
    } finally {
      if (!signal?.aborted) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void readMemoryItems(controller.signal)
      .then((nextItems) => {
        setItems(nextItems);
        setError(null);
      })
      .catch((loadError: unknown) => {
        if (loadError instanceof DOMException && loadError.name === "AbortError") return;
        setError(loadError instanceof Error ? loadError.message : "Không thể đọc thư mục Memory.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });
    return () => controller.abort();
  }, []);

  const filteredItems = useMemo(
    () => filter === "all" ? items : items.filter((item) => item.type === filter),
    [filter, items],
  );
  const selectedIndex = filteredItems.findIndex((item) => item.id === selectedId);
  const selectedItem = selectedIndex >= 0 ? filteredItems[selectedIndex] : null;
  const imageCount = items.filter((item) => item.type === "image").length;
  const videoCount = items.length - imageCount;

  const selectRelativeItem = useCallback((offset: number) => {
    if (selectedIndex < 0 || filteredItems.length < 2) return;
    const nextIndex = (selectedIndex + offset + filteredItems.length) % filteredItems.length;
    setSelectedId(filteredItems[nextIndex].id);
  }, [filteredItems, selectedIndex]);

  useEffect(() => {
    if (!selectedItem) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelectedId(null);
      if (event.key === "ArrowLeft") selectRelativeItem(-1);
      if (event.key === "ArrowRight") selectRelativeItem(1);
    };

    closeButtonRef.current?.focus();
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectRelativeItem, selectedItem]);

  const handleRetry = () => {
    setIsLoading(true);
    setError(null);
    void loadItems();
  };

  return (
    <main className="memory-page">
      <header className="memory-page__header">
        <div className="memory-page__heading">
          <span className="memory-page__eyebrow">MKT / LOCAL ARCHIVE</span>
          <h1>Memory</h1>
        </div>

        <div className="memory-page__toolbar">
          <div className="memory-page__filters" role="group" aria-label="Lọc kỷ niệm">
            {([
              ["all", "Tất cả", items.length],
              ["image", "Ảnh", imageCount],
              ["video", "Video", videoCount],
            ] as const).map(([value, label, count]) => (
              <button
                key={value}
                className={filter === value ? "is-active" : ""}
                type="button"
                onClick={() => setFilter(value)}
                aria-pressed={filter === value}
              >
                <span>{label}</span>
                <span>{count.toString().padStart(2, "0")}</span>
              </button>
            ))}
          </div>
        </div>
      </header>

      {isLoading ? (
        <section className="memory-grid" aria-label="Đang tải kỷ niệm" aria-busy="true">
          {Array.from({ length: 10 }, (_, index) => (
            <span className="memory-card memory-card--loading" key={index} />
          ))}
        </section>
      ) : error ? (
        <section className="memory-page__status" role="alert">
          <span className="memory-page__status-index">!</span>
          <h2>Không thể mở Memory</h2>
          <p>{error}</p>
          <button type="button" onClick={handleRetry}>Thử lại</button>
        </section>
      ) : filteredItems.length === 0 ? (
        <section className="memory-page__status">
          <span className="memory-page__status-index">00</span>
          <h2>Chưa có nội dung</h2>
          <p>Không tìm thấy {filter === "image" ? "ảnh" : filter === "video" ? "video" : "ảnh hoặc video"} trong thư mục.</p>
        </section>
      ) : (
        <section className="memory-grid" aria-label="Danh sách kỷ niệm">
          {filteredItems.map((item, index) => {
            const duration = formatDuration(item.durationMs);
            const aspectRatio = item.width && item.height
              ? `${Math.max(item.width, 1)} / ${Math.max(item.height, 1)}`
              : "4 / 3";

            return (
              <button
                className="memory-card"
                key={item.id}
                type="button"
                onClick={() => setSelectedId(item.id)}
                aria-label={`Mở ${item.type === "video" ? "video" : "ảnh"} ${item.name}`}
              >
                <span className="memory-card__media" style={{ aspectRatio }}>
                  {item.thumbnailUrl ? (
                    <Image
                      src={item.thumbnailUrl}
                      alt=""
                      fill
                      sizes="(max-width: 640px) 50vw, (max-width: 1200px) 33vw, 25vw"
                      loading={index < 4 ? "eager" : "lazy"}
                      unoptimized
                    />
                  ) : item.type === "video" ? (
                    <video src={item.mediaUrl} muted playsInline preload="metadata" aria-hidden="true" />
                  ) : null}
                  {item.type === "video" && (
                    <span className="memory-card__play" aria-hidden="true">
                      <svg viewBox="0 0 24 24"><path d="m9 7 8 5-8 5z" /></svg>
                    </span>
                  )}
                  <span className="memory-card__number">{String(index + 1).padStart(2, "0")}</span>
                  {duration && <span className="memory-card__duration">{duration}</span>}
                </span>
                <span className="memory-card__caption">
                  <span className="memory-card__name">{item.name}</span>
                  <time dateTime={item.createdTime ?? undefined}>{formatDate(item.createdTime)}</time>
                </span>
              </button>
            );
          })}
        </section>
      )}

      {selectedItem && (
        <div
          className="memory-viewer"
          role="dialog"
          aria-modal="true"
          aria-label={selectedItem.name}
          onPointerDown={(event) => {
            if (event.target === event.currentTarget) setSelectedId(null);
          }}
        >
          <header className="memory-viewer__header">
            <div>
              <strong>{selectedItem.name}</strong>
              <span>{formatDate(selectedItem.createdTime)} / {selectedItem.type === "video" ? "VIDEO" : "IMAGE"}</span>
            </div>
            <button
              ref={closeButtonRef}
              className="memory-viewer__close"
              type="button"
              onClick={() => setSelectedId(null)}
              aria-label="Đóng trình xem"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg>
            </button>
          </header>

          <div className="memory-viewer__media">
            {selectedItem.type === "video" ? (
              <video
                key={selectedItem.id}
                src={selectedItem.mediaUrl}
                controls
                autoPlay
                playsInline
                preload="metadata"
              />
            ) : (
              <Image
                src={selectedItem.mediaUrl}
                alt={selectedItem.name}
                fill
                sizes="100vw"
                unoptimized
              />
            )}
          </div>

          {filteredItems.length > 1 && (
            <>
              <button
                className="memory-viewer__nav memory-viewer__nav--previous"
                type="button"
                onClick={() => selectRelativeItem(-1)}
                aria-label="Kỷ niệm trước"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 5-7 7 7 7" /></svg>
              </button>
              <button
                className="memory-viewer__nav memory-viewer__nav--next"
                type="button"
                onClick={() => selectRelativeItem(1)}
                aria-label="Kỷ niệm tiếp theo"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 7 7-7 7" /></svg>
              </button>
            </>
          )}
        </div>
      )}
    </main>
  );
}
