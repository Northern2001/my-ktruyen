"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { loveStartDate } from "../lib/love-date";
import { loveTree } from "./loveTreeContent";
import styles from "./LoveTree.module.css";

const storageKey = "mkt-gift-tree";
const msPerDay = 24 * 60 * 60 * 1000;
const rainMs = 3400;

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

// Canopy slots as [x, y, radius] in tree space, centred above the trunk.
const slots = [
  [150, 70, 10], [118, 82, 9], [182, 82, 9], [92, 104, 10], [208, 104, 10],
  [136, 108, 9], [164, 108, 9], [72, 132, 9], [228, 132, 9], [112, 134, 10],
  [188, 134, 10], [150, 136, 9], [90, 160, 9], [210, 160, 9], [130, 160, 10],
  [170, 160, 10], [64, 156, 8], [236, 156, 8], [150, 100, 8], [108, 110, 8],
  [192, 110, 8], [150, 182, 8], [112, 184, 8], [188, 184, 8],
] as const;

// Flowers growing in the grass: [x, y, stem height, colour].
const groundFlowers = [
  [34, 346, 16, "#f4a6b8"], [78, 350, 20, "#fff1c9"], [102, 344, 14, "#b9a7ff"],
  [150, 352, 18, "#ff9a86"], [172, 346, 22, "#f4a6b8"], [232, 348, 16, "#fff1c9"],
  [300, 352, 20, "#b9a7ff"], [326, 344, 14, "#ff9a86"], [364, 350, 18, "#f4a6b8"],
  [208, 354, 12, "#b9a7ff"],
] as const;

const birds = [
  { x: 150, y: 54, flip: false, body: "#6ab0e0", wing: "#3f86bd" },
  { x: 96, y: 70, flip: false, body: "#f5c542", wing: "#d99a1a" },
  { x: 206, y: 70, flip: true, body: "#e8788f", wing: "#b94437" },
] as const;

const rainDrops = Array.from({ length: 48 }, (_, index) => ({
  left: 4 + ((index * 37) % 92),
  delay: ((index * 53) % 130) / 100,
  height: 14 + ((index * 7) % 10),
}));

const ripples = [
  [110, 336], [150, 340], [200, 334], [250, 340], [290, 336], [60, 340], [340, 340],
] as const;

const slotCount = [0, 0, 0, 14, 22, 24] as const;
const treeScale = [0, 0.32, 0.6, 0.82, 0.94, 1] as const;
const nestScale = [0, 0, 0.7, 0.85, 1, 1.1] as const;
const houseScale = [0, 0, 0.7, 0.85, 1, 1] as const;
const animalScale = [0, 0.7, 0.8, 0.9, 1, 1] as const;
const birdCount = [0, 0, 0, 1, 2, 3] as const;

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

function GroundFlower({ x, y, h, color }: { x: number; y: number; h: number; color: string }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <path d={`M0 0 V${-h}`} stroke="#5f9a7e" strokeWidth="2" strokeLinecap="round" />
      <path d={`M0 ${-h * 0.4} q-6 -3 -7 -8 q6 0 7 8`} fill="#6fae8f" />
      <g transform={`translate(0 ${-h})`}>
        {[0, 72, 144, 216, 288].map((angle) => (
          <ellipse key={angle} cx="0" cy="-4" rx="2.6" ry="4" fill={color} transform={`rotate(${angle})`} />
        ))}
        <circle r="2" fill="#fff1c9" />
      </g>
    </g>
  );
}

function Bird({ body, wing, flip }: { body: string; wing: string; flip: boolean }) {
  return (
    <g transform={flip ? "scale(-1 1)" : undefined}>
      <path d="M-9 -9 L-21 -5 L-11 -3 Z" fill={wing} />
      <ellipse cx="0" cy="-9" rx="11" ry="8" fill={body} />
      <ellipse cx="-2" cy="-9" rx="6" ry="4" fill={wing} />
      <circle cx="9" cy="-16" r="5.5" fill={body} />
      <path d="M14 -16.5 L20 -14.5 L14 -12.5 Z" fill="#f2a33a" />
      <circle cx="10.5" cy="-17" r="1.1" fill="#2a1318" />
      <path d="M-2 -2 V0 M3 -2 V0" stroke="#f2a33a" strokeWidth="1.4" strokeLinecap="round" />
    </g>
  );
}

function Chick({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <circle r="6" fill="#ffd966" />
      <path d="M-2.4 -5.4 L2.4 -5.4 L0 -10 Z" fill="#f2a33a" />
      <circle cx="-2.2" cy="-1" r="0.9" fill="#2a1318" />
      <circle cx="2.2" cy="-1" r="0.9" fill="#2a1318" />
    </g>
  );
}

function Egg({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <ellipse rx="4.6" ry="6" fill="#f6efe2" />
      <circle cx="-1.2" cy="-1" r="0.9" fill="#d9c7a8" />
      <circle cx="1.4" cy="1.6" r="0.8" fill="#d9c7a8" />
    </g>
  );
}

function Nest({ stage }: { stage: number }) {
  return (
    <g transform="translate(186 196)">
      <g className={styles.grow} style={{ transform: `scale(${nestScale[stage]})` }}>
        <ellipse cx="0" cy="-2" rx="18" ry="8" fill="#6f4429" />
        {stage === 3 && (
          <>
            <Egg x={-6} y={-6} />
            <Egg x={5} y={-6} />
          </>
        )}
        {stage === 4 && (
          <>
            <Chick x={-6} y={-8} />
            <Chick x={6} y={-8} />
          </>
        )}
        {stage >= 5 && (
          <>
            <Chick x={-10} y={-8} />
            <Chick x={0} y={-11} />
            <Chick x={10} y={-8} />
          </>
        )}
        <path d="M-19 -3 Q0 14 19 -3 Q0 3 -19 -3 Z" fill="#9b6b3f" />
        <path
          d="M-20 -2 L-27 -6 M18 -4 L26 -9 M-8 5 L-11 11 M9 5 L12 10"
          stroke="#8a5a30"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </g>
    </g>
  );
}

function Monkey() {
  return (
    <g className={styles.bob}>
      <path d="M12 -10 C34 -8 38 -32 28 -42" stroke="#8b5a3c" strokeWidth="5" strokeLinecap="round" fill="none" />
      <ellipse cx="0" cy="-18" rx="14" ry="16" fill="#8b5a3c" />
      <ellipse cx="0" cy="-14" rx="8" ry="10" fill="#e8c9a0" />
      <ellipse cx="-9" cy="-2" rx="7" ry="3.5" fill="#6f4429" />
      <ellipse cx="9" cy="-2" rx="7" ry="3.5" fill="#6f4429" />
      <path d="M-12 -26 C-19 -20 -15 -12 -8 -12" stroke="#8b5a3c" strokeWidth="5" strokeLinecap="round" fill="none" />
      <path d="M-22 -14 Q-12 -3 -1 -12" stroke="#f4d35e" strokeWidth="4" strokeLinecap="round" fill="none" />
      <circle cx="-11" cy="-46" r="4.5" fill="#8b5a3c" />
      <circle cx="11" cy="-46" r="4.5" fill="#8b5a3c" />
      <circle cx="-11" cy="-46" r="2.4" fill="#e8c9a0" />
      <circle cx="11" cy="-46" r="2.4" fill="#e8c9a0" />
      <circle cx="0" cy="-44" r="11" fill="#8b5a3c" />
      <ellipse cx="0" cy="-42" rx="7.5" ry="6.5" fill="#e8c9a0" />
      <circle cx="-3" cy="-44" r="1.3" fill="#2a1318" />
      <circle cx="3" cy="-44" r="1.3" fill="#2a1318" />
      <path d="M-3 -39 Q0 -37 3 -39" stroke="#6f4429" strokeWidth="1.2" strokeLinecap="round" fill="none" />
    </g>
  );
}

function Snake() {
  return (
    <g className={styles.sway}>
      <path
        d="M-30 -4 C-30 -14 -12 -14 -12 -5 C-12 5 8 5 8 -5 C8 -16 24 -16 24 -28"
        stroke="#5fae6e"
        strokeWidth="9"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M-30 -4 C-30 -14 -12 -14 -12 -5 C-12 5 8 5 8 -5 C8 -16 24 -16 24 -28"
        stroke="#a8dcae"
        strokeWidth="3"
        strokeDasharray="2 7"
        fill="none"
      />
      <ellipse cx="26" cy="-33" rx="9" ry="7" fill="#5fae6e" />
      <circle cx="23" cy="-35" r="1.7" fill="#2a1318" />
      <circle cx="29" cy="-35" r="1.7" fill="#2a1318" />
      <path d="M35 -33 H41 M41 -33 L44 -35 M41 -33 L44 -31" stroke="#e0475b" strokeWidth="1.2" strokeLinecap="round" />
    </g>
  );
}

function MonkeyHouse() {
  return (
    <g>
      <rect x="-24" y="-30" width="48" height="30" fill="#8a5a3a" />
      <path d="M-24 -20H24M-24 -10H24" stroke="#6f4429" strokeWidth="1" />
      <path d="M-31 -30 L0 -53 L31 -30 Z" fill="#a8453a" />
      <path d="M-7 0 V-14 a7 7 0 0 1 14 0 V0 Z" fill="#2a1318" />
      <rect x="12" y="-25" width="8" height="8" fill="#f4d98a" />
    </g>
  );
}

function SnakeHouse() {
  return (
    <g>
      <path d="M-27 0 A27 27 0 0 1 27 0 Z" fill="#b5835f" />
      <path d="M-20 -8 H20 M-14 -17 H14" stroke="#8d6244" strokeWidth="1" />
      <path d="M-8 0 V-8 a8 8 0 0 1 16 0 V0 Z" fill="#2a1318" />
      <path d="M-20 -16 q5 -7 11 -3 M10 -22 q5 -5 9 0" stroke="#6fae8f" strokeWidth="3" strokeLinecap="round" fill="none" />
    </g>
  );
}

export function LoveTree({ now }: { now: Date | null }) {
  const raw = useSyncExternalStore(
    treeStore.subscribe,
    treeStore.getSnapshot,
    treeStore.getServerSnapshot,
  );
  const save = useMemo(() => parseSave(raw), [raw]);
  const [raining, setRaining] = useState(false);
  const timerRef = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timerRef.current), []);

  // The static export has no clock, so the scene waits for the browser's.
  if (!now) {
    return (
      <section className={styles.box} aria-label="Cây tình yêu">
        <header className={styles.header}>
          <span>{loveTree.eyebrow}</span>
        </header>
        <div className={styles.placeholder} />
      </section>
    );
  }

  const days = Math.max(
    0,
    Math.floor((startOfDay(now) - startOfDay(loveStartDate)) / msPerDay),
  );

  const stage = loveTree.stages.reduce(
    (found, entry, index) => (days >= entry.from ? index : found),
    0,
  );
  const nextStage = loveTree.stages[stage + 1];

  const total = slotCount[stage];
  const base = stage === 4 ? 8 : stage === 5 ? total : 0;
  const bloomed = Math.min(total, base + save.count);
  const flowerCount = Math.min(groundFlowers.length, stage * 2 + save.count);

  const wateredToday = save.last === dayKey(now);
  const note =
    save.count > 0 ? loveTree.notes[(save.count - 1) % loveTree.notes.length] : null;

  const water = () => {
    if (wateredToday) return;
    treeStore.save({ count: save.count + 1, last: dayKey(new Date()) });
    setRaining(true);
    window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setRaining(false), rainMs);
  };

  return (
    <section className={styles.box} aria-label="Cây tình yêu">
      <header className={styles.header}>
        <span>{loveTree.eyebrow}</span>
        <span>
          NGÀY {days + 1} · {loveTree.stages[stage].name.toUpperCase()}
        </span>
      </header>

      <div className={styles.body}>
        <p className={styles.hint}>{loveTree.hint}</p>

        <div className={styles.stage}>
          <svg
            className={styles.svg}
            viewBox="0 0 400 372"
            role="img"
            aria-label={`Cây tình yêu ở giai đoạn ${loveTree.stages[stage].name}`}
          >
            <ellipse cx="200" cy="332" rx="190" ry="17" fill="#26110f" />
            <ellipse cx="200" cy="328" rx="150" ry="11" fill="#3a1a22" />
            {raining && <ellipse className={styles.puddle} cx="200" cy="334" rx="120" ry="8" fill="#6bb6e6" />}

            {stage >= 2 && (
              <g transform="translate(52 326)">
                <g className={styles.grow} style={{ transform: `scale(${houseScale[stage]})` }}>
                  <MonkeyHouse />
                </g>
              </g>
            )}
            {stage >= 2 && (
              <g transform="translate(348 326)">
                <g className={styles.grow} style={{ transform: `scale(${houseScale[stage]})` }}>
                  <SnakeHouse />
                </g>
              </g>
            )}

            <g transform="translate(50 12)">
              {stage === 0 && <ellipse cx="150" cy="306" rx="9" ry="6" fill="#c98d8d" />}

              {stage >= 1 && (
                <g
                  className={styles.treeGrow}
                  style={{ transform: `scale(${treeScale[stage]})` }}
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
                  {stage === 1 ? (
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
                  {stage >= 2 && <Nest stage={stage} />}
                  {birds.slice(0, birdCount[stage]).map((bird, index) => (
                    <g key={index} transform={`translate(${bird.x} ${bird.y})`}>
                      <g className={styles.hop} style={{ animationDelay: `${index * 0.7}s` }}>
                        <Bird body={bird.body} wing={bird.wing} flip={bird.flip} />
                      </g>
                    </g>
                  ))}
                </g>
              )}
            </g>

            {stage >= 1 && (
              <g transform="translate(130 328)">
                <g className={styles.grow} style={{ transform: `scale(${animalScale[stage]})` }}>
                  <Monkey />
                </g>
              </g>
            )}
            {stage >= 1 && (
              <g transform="translate(272 328)">
                <g className={styles.grow} style={{ transform: `scale(${animalScale[stage]})` }}>
                  <Snake />
                </g>
              </g>
            )}

            {groundFlowers.slice(0, flowerCount).map(([x, y, h, color], index) => (
              <GroundFlower key={index} x={x} y={y} h={h} color={color} />
            ))}

            {raining &&
              ripples.map(([x, y], index) => (
                <ellipse
                  key={index}
                  className={styles.ripple}
                  cx={x}
                  cy={y}
                  rx="14"
                  ry="3.5"
                  fill="none"
                  stroke="#bfe6fa"
                  strokeWidth="1.5"
                  style={{ animationDelay: `${0.4 + index * 0.35}s` }}
                />
              ))}
          </svg>

          {raining && (
            <div className={styles.rain} aria-hidden="true">
              {rainDrops.map((drop, index) => (
                <span
                  key={index}
                  style={{
                    left: `${drop.left}%`,
                    height: drop.height,
                    animationDelay: `${drop.delay}s`,
                  }}
                />
              ))}
            </div>
          )}
        </div>

        <div className={styles.info}>
          <span className={styles.count}>
            Đã tưới {save.count} lần
            {total > 0 ? ` · ${bloomed}/${total} hoa đã nở` : ""}
          </span>
          {nextStage && (
            <span className={styles.next}>
              {nextStage.name} sau {nextStage.from - days} ngày nữa
            </span>
          )}
          <button
            type="button"
            className={styles.water}
            onClick={water}
            disabled={wateredToday}
          >
            {wateredToday ? loveTree.wateredLabel : loveTree.waterLabel}
          </button>
          {note && wateredToday && (
            <p className={styles.note} role="status">
              {note}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
