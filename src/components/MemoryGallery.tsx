"use client";

import Image from "next/image";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent,
} from "react";
import { sitePath } from "../lib/site-path";
import { useMediaPlayback } from "./MediaPlaybackCoordinator";

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

type TablePoint = {
  x: number;
  y: number;
};

type TablePlacement = TablePoint & {
  rotation: number;
  width: number;
  zIndex: number;
};

function MemoryVideo({ item }: { item: MemoryItem }) {
  const { beginMediaPlayback, endMediaPlayback } = useMediaPlayback();

  useEffect(() => () => {
    endMediaPlayback("memory-video");
  }, [endMediaPlayback]);

  return (
    <video
      src={item.mediaUrl}
      controls
      autoPlay
      playsInline
      preload="metadata"
      onPlay={() => beginMediaPlayback("memory-video")}
      onPause={() => endMediaPlayback("memory-video")}
      onEnded={() => endMediaPlayback("memory-video")}
    />
  );
}

const manifestUrl = sitePath("/memory-media/manifest.json");
const tableCellWidth = 330;
const tableCellHeight = 390;
const placementVariation = [
  { x: -8, y: 16, rotation: -4.2, width: 1.02 },
  { x: 18, y: -6, rotation: 2.7, width: 0.94 },
  { x: -14, y: 4, rotation: -1.4, width: 1.08 },
  { x: 10, y: 22, rotation: 4.6, width: 0.98 },
  { x: -20, y: -12, rotation: 1.8, width: 1.04 },
  { x: 6, y: 10, rotation: -3.1, width: 0.92 },
  { x: 20, y: 0, rotation: 3.5, width: 1.06 },
  { x: -4, y: 20, rotation: -2.2, width: 1 },
] as const;

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

function getTableDimensions(itemCount: number) {
  const columns = Math.min(8, Math.max(4, Math.ceil(Math.sqrt(Math.max(itemCount, 1) * 1.7))));
  const rows = Math.max(1, Math.ceil(itemCount / columns));

  return {
    columns,
    width: 180 + columns * tableCellWidth,
    height: 190 + rows * tableCellHeight,
  };
}

function getTablePlacement(item: MemoryItem, index: number, columns: number): TablePlacement {
  const column = index % columns;
  const row = Math.floor(index / columns);
  const variation = placementVariation[index % placementVariation.length];
  const isPortrait = Boolean(item.width && item.height && item.height > item.width);
  const baseWidth = isPortrait ? 214 : 278;

  return {
    x: 92 + column * tableCellWidth + variation.x,
    y: 86 + row * tableCellHeight + variation.y,
    rotation: variation.rotation,
    width: Math.round(baseWidth * variation.width),
    zIndex: 2 + ((index * 7) % 9),
  };
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
  const [liftingId, setLiftingId] = useState<string | null>(null);
  const [pan, setPan] = useState<TablePoint>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const tableViewportRef = useRef<HTMLElement>(null);
  const dragRef = useRef<{
    pointerId: number;
    originX: number;
    originY: number;
    panX: number;
    panY: number;
    moved: boolean;
  } | null>(null);
  const suppressClickRef = useRef(false);
  const liftTimerRef = useRef<number | null>(null);

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
  const tableDimensions = useMemo(
    () => getTableDimensions(filteredItems.length),
    [filteredItems.length],
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

  const clampPan = useCallback((point: TablePoint) => {
    const viewport = tableViewportRef.current;
    if (!viewport) return point;

    return {
      x: Math.min(0, Math.max(viewport.clientWidth - tableDimensions.width, point.x)),
      y: Math.min(0, Math.max(viewport.clientHeight - tableDimensions.height, point.y)),
    };
  }, [tableDimensions.height, tableDimensions.width]);

  const resetTable = useCallback(() => {
    setPan({ x: 0, y: 0 });
    tableViewportRef.current?.scrollTo({ top: 0, left: 0 });
  }, []);

  useEffect(() => {
    const handleResize = () => setPan((currentPan) => clampPan(currentPan));
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [clampPan]);

  useEffect(() => () => {
    if (liftTimerRef.current !== null) window.clearTimeout(liftTimerRef.current);
  }, []);

  const canPanTable = () => !window.matchMedia("(pointer: coarse), (max-width: 700px)").matches;

  const handleTablePointerDown = (event: ReactPointerEvent<HTMLElement>) => {
    if (event.button !== 0 || !canPanTable()) return;

    dragRef.current = {
      pointerId: event.pointerId,
      originX: event.clientX,
      originY: event.clientY,
      panX: pan.x,
      panY: pan.y,
      moved: false,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    setIsPanning(true);
  };

  const handleTablePointerMove = (event: ReactPointerEvent<HTMLElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    const deltaX = event.clientX - drag.originX;
    const deltaY = event.clientY - drag.originY;
    if (Math.hypot(deltaX, deltaY) > 5) drag.moved = true;
    setPan(clampPan({ x: drag.panX + deltaX, y: drag.panY + deltaY }));
  };

  const finishTablePointer = (event: ReactPointerEvent<HTMLElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    suppressClickRef.current = drag.moved;
    if (drag.moved) {
      window.setTimeout(() => {
        suppressClickRef.current = false;
      }, 0);
    }
    dragRef.current = null;
    setIsPanning(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const handleTableWheel = (event: ReactWheelEvent<HTMLElement>) => {
    if (!canPanTable()) return;
    event.preventDefault();
    setPan((currentPan) => clampPan({
      x: currentPan.x - (event.shiftKey ? event.deltaY : event.deltaX),
      y: currentPan.y - (event.shiftKey ? event.deltaX : event.deltaY),
    }));
  };

  const openItem = (item: MemoryItem) => {
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      return;
    }

    if (liftTimerRef.current !== null) window.clearTimeout(liftTimerRef.current);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setSelectedId(item.id);
      return;
    }

    setLiftingId(item.id);
    liftTimerRef.current = window.setTimeout(() => {
      setSelectedId(item.id);
      setLiftingId(null);
      liftTimerRef.current = null;
    }, 240);
  };

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
          <span className="memory-page__eyebrow">MKT / MEMORY TABLE</span>
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
                onClick={() => {
                  setFilter(value);
                  resetTable();
                }}
                aria-pressed={filter === value}
              >
                <span>{label}</span>
                <span>{count.toString().padStart(2, "0")}</span>
              </button>
            ))}
          </div>
          <button
            className="memory-page__reset"
            type="button"
            onClick={resetTable}
            aria-label="Đưa mặt bàn về vị trí đầu"
            title="Về vị trí đầu"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M9 4H4v5M15 4h5v5M20 15v5h-5M9 20H4v-5" />
              <circle cx="12" cy="12" r="2.5" />
            </svg>
          </button>
        </div>
      </header>

      {isLoading ? (
        <section className="memory-table__viewport memory-table__viewport--loading" aria-label="Đang tải kỷ niệm" aria-busy="true">
          <div className="memory-table__loading-group">
            {Array.from({ length: 6 }, (_, index) => (
              <span className="memory-table__loading-card" key={index} />
            ))}
          </div>
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
        <section
          ref={tableViewportRef}
          className={`memory-table__viewport ${isPanning ? "is-panning" : ""}`}
          aria-label="Mặt bàn ký ức"
          tabIndex={0}
          onPointerDown={handleTablePointerDown}
          onPointerMove={handleTablePointerMove}
          onPointerUp={finishTablePointer}
          onPointerCancel={finishTablePointer}
          onWheel={handleTableWheel}
          onKeyDown={(event) => {
            if (event.target !== event.currentTarget) return;
            const movement: Record<string, TablePoint> = {
              ArrowLeft: { x: 90, y: 0 },
              ArrowRight: { x: -90, y: 0 },
              ArrowUp: { x: 0, y: 90 },
              ArrowDown: { x: 0, y: -90 },
            };
            if (event.key === "Home") {
              event.preventDefault();
              resetTable();
            } else if (movement[event.key]) {
              event.preventDefault();
              const delta = movement[event.key];
              setPan((currentPan) => clampPan({
                x: currentPan.x + delta.x,
                y: currentPan.y + delta.y,
              }));
            }
          }}
        >
          <div
            className="memory-table__world"
            style={{
              width: tableDimensions.width,
              height: tableDimensions.height,
              transform: `translate3d(${pan.x}px, ${pan.y}px, 0)`,
            }}
          >
            <span className="memory-table__folio" aria-hidden="true">AUG / 2026</span>
            <span className="memory-table__count" aria-hidden="true">
              {String(filteredItems.length).padStart(2, "0")} MOMENTS
            </span>

            {filteredItems.map((item, index) => {
              const duration = formatDuration(item.durationMs);
              const aspectRatio = item.width && item.height
                ? `${Math.max(item.width, 1)} / ${Math.max(item.height, 1)}`
                : "4 / 3";
              const placement = getTablePlacement(item, index, tableDimensions.columns);
              const itemStyle = {
                "--memory-x": `${placement.x}px`,
                "--memory-y": `${placement.y}px`,
                "--memory-rotation": `${placement.rotation}deg`,
                "--memory-width": `${placement.width}px`,
                "--memory-z": placement.zIndex,
              } as CSSProperties;

              return (
                <button
                  className={`memory-table__item ${liftingId === item.id ? "is-lifting" : ""}`}
                  style={itemStyle}
                  key={item.id}
                  type="button"
                  onClick={() => openItem(item)}
                  aria-label={`Mở ${item.type === "video" ? "video" : "ảnh"} Memory ${String(index + 1).padStart(2, "0")}, ${formatDate(item.createdTime)}`}
                >
                  <span className="memory-table__media" style={{ aspectRatio }}>
                    {item.thumbnailUrl ? (
                      <Image
                        src={item.thumbnailUrl}
                        alt=""
                        fill
                        sizes="(max-width: 700px) 50vw, 300px"
                        loading={index < 6 ? "eager" : "lazy"}
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
                    {duration && <span className="memory-table__duration">{duration}</span>}
                  </span>
                  <span className="memory-table__caption">
                    <span>Memory {String(index + 1).padStart(2, "0")}</span>
                    <time dateTime={item.createdTime ?? undefined}>{formatDate(item.createdTime)}</time>
                  </span>
                </button>
              );
            })}
          </div>
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
              <strong>Memory {String(selectedIndex + 1).padStart(2, "0")}</strong>
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
              <MemoryVideo
                key={selectedItem.id}
                item={selectedItem}
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
