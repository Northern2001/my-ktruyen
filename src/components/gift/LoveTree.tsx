"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { loveStartDate } from "../../lib/love-date";
import { giftTree } from "./giftContent";
import styles from "./GiftPage.module.css";

const storageKey = "mkt-gift-tree";
const msPerDay = 24 * 60 * 60 * 1000;

type TreeSave = { count: number; last: string };

const listeners = new Set<() => void>();

// Watering progress is a per-device convenience, so it lives in localStorage.
const treeStore = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  getSnapshot() {
    try {
      return window.localStorage.getItem(storageKey) ?? "";
    } catch {
      return "";
    }
  },
  getServerSnapshot: () => "",
  save(value: TreeSave) {
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(value));
    } catch {
      // Storage can be blocked (private mode); the tree just won't remember.
    }
    listeners.forEach((notify) => notify());
  },
};

function parseSave(raw: string): TreeSave {
  try {
    const value = JSON.parse(raw) as Partial<TreeSave>;
    return {
      count: Math.max(0, Math.floor(Number(value.count) || 0)),
      last: typeof value.last === "string" ? value.last : "",
    };
  } catch {
    return { count: 0, last: "" };
  }
}

function dayKey(date: Date) {
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

// Canopy slots as [x, y, radius] on a 300x340 canvas, centred above the trunk.
const slots = [
  [150, 70, 10], [118, 82, 9], [182, 82, 9], [92, 104, 10], [208, 104, 10],
  [136, 108, 9], [164, 108, 9], [72, 132, 9], [228, 132, 9], [112, 134, 10],
  [188, 134, 10], [150, 136, 9], [90, 160, 9], [210, 160, 9], [130, 160, 10],
  [170, 160, 10], [64, 156, 8], [236, 156, 8], [150, 100, 8], [108, 110, 8],
  [192, 110, 8], [150, 182, 8], [112, 184, 8], [188, 184, 8],
] as const;

const slotCount = [0, 0, 0, 12, 20, 24] as const;
const treeScale = [0, 0.32, 0.6, 0.82, 0.94, 1] as const;

function Blossom({ x, y, r, bloomed }: { x: number; y: number; r: number; bloomed: boolean }) {
  if (!bloomed) return <circle cx={x} cy={y} r={r * 0.4} fill="#b8506b" />;
  return (
    <g transform={`translate(${x} ${y})`}>
      {[0, 72, 144, 216, 288].map((angle) => (
        <ellipse
          key={angle}
          cx="0"
          cy={-r * 0.62}
          rx={r * 0.46}
          ry={r * 0.66}
          fill="#f4a6b8"
          transform={`rotate(${angle})`}
        />
      ))}
      <circle r={r * 0.3} fill="#fff1c9" />
    </g>
  );
}

export function LoveTree() {
  const raw = useSyncExternalStore(
    treeStore.subscribe,
    treeStore.getSnapshot,
    treeStore.getServerSnapshot,
  );
  const save = useMemo(() => parseSave(raw), [raw]);
  const [dropping, setDropping] = useState(false);

  const now = new Date();
  const days = Math.max(
    0,
    Math.floor((startOfDay(now) - startOfDay(loveStartDate)) / msPerDay),
  );

  const stageIndex = giftTree.stages.reduce(
    (found, stage, index) => (days >= stage.from ? index : found),
    0,
  );
  const nextStage = giftTree.stages[stageIndex + 1];

  const total = slotCount[stageIndex];
  const base = stageIndex === 4 ? 8 : stageIndex === 5 ? total : 0;
  const bloomed = Math.min(total, base + save.count);

  const wateredToday = save.last === dayKey(now);
  const note =
    save.count > 0 ? giftTree.notes[(save.count - 1) % giftTree.notes.length] : null;

  const water = () => {
    if (wateredToday) return;
    treeStore.save({ count: save.count + 1, last: dayKey(new Date()) });
    setDropping(true);
    window.setTimeout(() => setDropping(false), 1800);
  };

  const scale = treeScale[stageIndex];

  return (
    <div className={styles.tree}>
      <div className={styles.treeStage}>
        <svg
          className={styles.treeSvg}
          viewBox="0 0 300 340"
          role="img"
          aria-label={`Cây tình yêu ở giai đoạn ${giftTree.stages[stageIndex].name}`}
        >
          <ellipse cx="150" cy="316" rx="110" ry="14" fill="#2a1318" />
          <ellipse cx="150" cy="312" rx="70" ry="9" fill="#3a1a22" />

          {stageIndex === 0 && (
            <ellipse cx="150" cy="306" rx="9" ry="6" fill="#c98d8d" />
          )}

          {stageIndex >= 1 && (
            <g
              className={styles.treeGrow}
              style={{ transform: `scale(${scale})` }}
            >
              <path
                d="M144 312 C146 270 142 240 150 200 C156 240 154 272 156 312 Z"
                fill="#7a4a3a"
              />
              <path
                d="M150 236 C128 218 112 206 96 176 M150 224 C174 206 190 194 206 166 M150 250 C140 238 128 230 116 214"
                stroke="#7a4a3a"
                strokeWidth="5"
                strokeLinecap="round"
                fill="none"
              />
              {stageIndex === 1 ? (
                <>
                  <ellipse cx="124" cy="196" rx="22" ry="11" fill="#7fae95" transform="rotate(-24 124 196)" />
                  <ellipse cx="178" cy="190" rx="22" ry="11" fill="#9cc7ae" transform="rotate(24 178 190)" />
                </>
              ) : (
                <>
                  <ellipse cx="150" cy="130" rx="92" ry="78" fill="#5f9a7e" />
                  <ellipse cx="100" cy="150" rx="52" ry="44" fill="#6fae8f" />
                  <ellipse cx="202" cy="150" rx="52" ry="44" fill="#6fae8f" />
                  <ellipse cx="150" cy="98" rx="56" ry="44" fill="#7fbf9e" />
                </>
              )}
              {slots.slice(0, total).map(([x, y, r], index) => (
                <Blossom key={index} x={x} y={y} r={r} bloomed={index < bloomed} />
              ))}
            </g>
          )}
        </svg>

        {dropping && (
          <div className={styles.treeRain} aria-hidden="true">
            {Array.from({ length: 12 }, (_, index) => (
              <span
                key={index}
                style={{
                  left: `${14 + index * 6.5}%`,
                  animationDelay: `${(index % 6) * 0.12}s`,
                }}
              />
            ))}
          </div>
        )}
      </div>

      <div className={styles.treeInfo}>
        <span className={styles.sectionLabel}>
          NGÀY {days + 1} · {giftTree.stages[stageIndex].name.toUpperCase()}
        </span>
        <span className={styles.treeCount}>
          Đã tưới {save.count} lần
          {total > 0 ? ` · ${bloomed}/${total} hoa đã nở` : ""}
        </span>
        {nextStage && (
          <span className={styles.treeNext}>
            {nextStage.name} sau {nextStage.from - days} ngày nữa
          </span>
        )}
        <button
          type="button"
          className={styles.primaryButton}
          onClick={water}
          disabled={wateredToday}
        >
          {wateredToday ? giftTree.wateredLabel : giftTree.waterLabel}
        </button>
        {note && wateredToday && (
          <p className={styles.treeNote} role="status">
            {note}
          </p>
        )}
      </div>
    </div>
  );
}
