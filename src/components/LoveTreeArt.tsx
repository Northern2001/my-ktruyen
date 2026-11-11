"use client";

import type { CSSProperties } from "react";
import type { WeatherKind } from "../lib/weather";
import {
  baseX,
  baseY,
  buildBranches,
  depthForStep,
  leafTips,
  perch,
  trunkWidth,
  treeScale,
} from "./loveTreeGrowth";
import styles from "./LoveTree.module.css";

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const vars = (values: Record<string, string>) => values as CSSProperties;

export type CoupleAction = "hug" | "kiss" | "play" | "umbrella" | "cold";

export const isWet = (kind: WeatherKind) => kind === "rain" || kind === "storm";

// ---------------------------------------------------------------- palette

export const palette: Record<
  WeatherKind,
  { top: string; bottom: string; ground: string; grass: [string, string]; dim: number }
> = {
  clear: { top: "#5fb4ea", bottom: "#d4eefa", ground: "#4f8f63", grass: ["#6fb36f", "#4f9a5a"], dim: 1 },
  cloudy: { top: "#8fa3b5", bottom: "#dde4ea", ground: "#4a8060", grass: ["#5f9a6a", "#4a8560"], dim: 0.95 },
  wind: { top: "#6fb0d8", bottom: "#dbeaf2", ground: "#4f8f63", grass: ["#76b86f", "#58a05a"], dim: 1 },
  rain: { top: "#52647a", bottom: "#93a4b3", ground: "#3b6f53", grass: ["#4d8660", "#3b7050"], dim: 0.88 },
  storm: { top: "#2d374a", bottom: "#5c6879", ground: "#335f48", grass: ["#437a58", "#33664a"], dim: 0.78 },
  snow: { top: "#a9bccd", bottom: "#edf3f8", ground: "#eef4fa", grass: ["#dfe9f1", "#cfdce8"], dim: 1 },
};

const cloudSets: Record<WeatherKind, ReadonlyArray<readonly [number, number, number]>> = {
  clear: [[90, 70, 1], [300, 118, 1.1]],
  cloudy: [[60, 50, 1.5], [170, 84, 1.7], [290, 52, 1.6], [350, 110, 1.3], [110, 124, 1.2]],
  wind: [[70, 60, 1.2], [200, 96, 1.4], [320, 58, 1.1], [380, 120, 1]],
  rain: [[50, 46, 1.7], [160, 74, 1.9], [280, 44, 1.8], [350, 90, 1.6], [110, 112, 1.4]],
  storm: [[40, 44, 2], [150, 66, 2.1], [270, 40, 2], [350, 80, 1.8], [100, 104, 1.6], [230, 100, 1.7]],
  snow: [[70, 56, 1.4], [200, 80, 1.6], [320, 54, 1.4], [370, 108, 1.1]],
};

const cloudFill: Record<WeatherKind, string> = {
  clear: "#ffffff",
  cloudy: "#f2f5f8",
  wind: "#ffffff",
  rain: "#7f8d9c",
  storm: "#414b5c",
  snow: "#f7f9fb",
};

// ---------------------------------------------------------------- sky

export function Sky({ kind }: { kind: WeatherKind }) {
  const colors = palette[kind];
  const sunny = kind === "clear" || kind === "wind";

  return (
    <g>
      <defs>
        <linearGradient id="love-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={colors.top} />
          <stop offset="1" stopColor={colors.bottom} />
        </linearGradient>
        <radialGradient id="love-glow">
          <stop offset="0" stopColor="#fff3b0" stopOpacity="0.85" />
          <stop offset="1" stopColor="#fff3b0" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="400" height="372" fill="url(#love-sky)" />

      {sunny && (
        <g transform="translate(325 66)">
          <circle r="56" fill="url(#love-glow)" />
          {kind === "clear" && (
            <g className={styles.sunRays} stroke="#ffd84a" strokeWidth="3" strokeLinecap="round">
              {Array.from({ length: 12 }, (_, index) => (
                <path key={index} d="M0 -29 V-37" transform={`rotate(${index * 30})`} />
              ))}
            </g>
          )}
          <circle r="21" fill="#ffd84a" />
        </g>
      )}

      {cloudSets[kind].map(([x, y, s], index) => (
        <g
          key={index}
          className={kind === "wind" ? styles.cloudFast : styles.cloud}
          style={{ animationDelay: `${-index * 5}s` }}
        >
          <g transform={`translate(${x} ${y}) scale(${s})`} fill={cloudFill[kind]} opacity={kind === "clear" ? 0.9 : 0.94}>
            <ellipse cx="0" cy="0" rx="30" ry="10" />
            <ellipse cx="17" cy="-8" rx="18" ry="9" />
            <ellipse cx="-15" cy="-6" rx="15" ry="8" />
          </g>
        </g>
      ))}

      {kind === "wind" && (
        <g stroke="#ffffff" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.7">
          {[120, 180, 236, 290].map((y, index) => (
            <g key={y} className={styles.gust} style={{ animationDelay: `${-index * 0.9}s` }}>
              <path d={`M0 ${y} H70 q14 0 14 -8 q0 -7 -9 -7`} />
              <path d={`M20 ${y + 10} H90`} />
            </g>
          ))}
        </g>
      )}
    </g>
  );
}

// ---------------------------------------------------------------- tree

const leafColors = ["#5f9a7e", "#6fae8f", "#7fbf9e"] as const;

function Blossom({ x, y, r, open }: { x: number; y: number; r: number; open: boolean }) {
  if (!open) return <circle cx={x} cy={y} r={r * 0.42} fill="#b8506b" />;
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

const birds = [
  { body: "#6ab0e0", wing: "#3f86bd", flip: false },
  { body: "#f5c542", wing: "#d99a1a", flip: true },
  { body: "#e8788f", wing: "#b94437", flip: false },
] as const;

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

const nestEggs = [[-10, -7], [0, -10], [10, -7]] as const;

function Nest({ step, snow }: { step: number; snow: boolean }) {
  const eggs = clamp(step - 24, 0, 3);
  const chicks = clamp(step - 39, 0, 3);

  return (
    <g className={styles.grow} style={{ transform: `scale(${0.7 + 0.4 * clamp((step - 16) / 100, 0, 1)})` }}>
      <ellipse cx="0" cy="-2" rx="18" ry="8" fill="#6f4429" />
      {nestEggs.map(([x, y], index) =>
        index < chicks ? (
          <Chick key={index} x={x} y={y - 1} />
        ) : index < eggs ? (
          <Egg key={index} x={x * 0.7} y={y + 1} />
        ) : null,
      )}
      <path d="M-19 -3 Q0 14 19 -3 Q0 3 -19 -3 Z" fill="#9b6b3f" />
      <path
        d="M-20 -2 L-27 -6 M18 -4 L26 -9 M-8 5 L-11 11 M9 5 L12 10"
        stroke="#8a5a30"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      {snow && <ellipse cx="0" cy="-9" rx="15" ry="3.4" fill="#fff" />}
    </g>
  );
}

// A tree that adds levels of branches, thickens its trunk and fills with
// leaves as the days pass. Blossoms follow the weather: they close in the
// rain and the cold, and open again when it is dry.
export function Tree({ step, kind }: { step: number; kind: WeatherKind }) {
  if (step < 1) return <ellipse cx="150" cy="306" rx="9" ry="6" fill="#c98d8d" />;

  const snow = kind === "snow";
  const depth = depthForStep(step);
  const branches = buildBranches(step);
  const tips = leafTips(branches, step);
  const leafScale = 0.7 + 0.3 * clamp(step / 60, 0, 1);

  const ranked = [...tips].sort((a, b) => a.rank - b.rank);
  const budCount = clamp(Math.floor((step - 30) * 1.2), 0, ranked.length);
  const bloomCount = clamp(budCount - 3, 0, budCount);
  const blossomsOpen = !isWet(kind) && !snow;

  const nestBranch = depth >= 4 && step >= 16 ? perch(branches, 2, 1) : null;
  const birdTotal = (step >= 30 ? 1 : 0) + (step >= 45 ? 1 : 0) + (step >= 60 ? 1 : 0);
  const trunk = trunkWidth(step);
  const windy = kind === "wind" || kind === "storm";

  return (
    <g className={styles.treeGrow} style={{ transform: `scale(${treeScale(step)})` }}>
      <g
        className={windy ? styles.treeSway : undefined}
        style={windy ? vars({ "--amp": kind === "storm" ? "2.2deg" : "1.6deg", "--dur": "2.2s" }) : undefined}
      >
        <path
          d={`M${baseX - trunk * 0.95} ${baseY + 2} Q${baseX - trunk * 0.5} ${baseY - 8} ${baseX - trunk * 0.5} ${baseY - 16} H${baseX + trunk * 0.5} Q${baseX + trunk * 0.5} ${baseY - 8} ${baseX + trunk * 0.95} ${baseY + 2} Z`}
          fill="#7a4a3a"
        />
        {branches.map((branch) => (
          <path
            key={branch.id}
            d={`M${branch.x1.toFixed(1)} ${branch.y1.toFixed(1)} L${branch.x2.toFixed(1)} ${branch.y2.toFixed(1)}`}
            stroke={branch.level === 0 ? "#6f4233" : "#7a4a3a"}
            strokeWidth={branch.width}
            strokeLinecap="round"
          />
        ))}

        {depth === 1 ? (
          <g>
            <ellipse cx={branches[0].x2 - 14} cy={branches[0].y2 + 4} rx="14" ry="7" fill="#7fae95" transform={`rotate(-24 ${branches[0].x2 - 14} ${branches[0].y2 + 4})`} />
            <ellipse cx={branches[0].x2 + 14} cy={branches[0].y2 + 2} rx="14" ry="7" fill="#9cc7ae" transform={`rotate(24 ${branches[0].x2 + 14} ${branches[0].y2 + 2})`} />
          </g>
        ) : (
          <g>
            {tips.map((tip, index) => (
              <g key={index}>
                <circle cx={tip.x} cy={tip.y} r={tip.r * leafScale} fill={leafColors[Math.floor(tip.tone * 3) % 3]} />
                <circle
                  cx={tip.x + (tip.tone - 0.5) * tip.r}
                  cy={tip.y - tip.r * 0.35}
                  r={tip.r * leafScale * 0.75}
                  fill={leafColors[(Math.floor(tip.tone * 3) + 1) % 3]}
                />
              </g>
            ))}
            {snow &&
              tips.map((tip, index) => (
                <ellipse
                  key={index}
                  cx={tip.x}
                  cy={tip.y - tip.r * 0.62 * leafScale}
                  rx={tip.r * leafScale * 0.8}
                  ry={tip.r * leafScale * 0.4}
                  fill="#fff"
                  opacity="0.95"
                />
              ))}
          </g>
        )}

        {ranked.slice(0, budCount).map((tip, index) => (
          <Blossom
            key={index}
            x={tip.x}
            y={tip.y}
            r={clamp(tip.r * 0.7, 5, 10)}
            open={blossomsOpen && index < bloomCount}
          />
        ))}

        {nestBranch && (
          <g transform={`translate(${nestBranch.x2} ${nestBranch.y2 + 8})`}>
            <Nest step={step} snow={snow} />
          </g>
        )}
        {birds.slice(0, birdTotal).map((bird, index) => {
          const branch = perch(branches, 3, index === 0 ? 0 : index * 2);
          if (!branch) return null;
          return (
            <g key={index} transform={`translate(${branch.x2} ${branch.y2 - 2})`}>
              <g className={styles.hop} style={{ animationDelay: `${index * 0.7}s` }}>
                <Bird body={bird.body} wing={bird.wing} flip={bird.flip} />
              </g>
            </g>
          );
        })}
      </g>
    </g>
  );
}

// ---------------------------------------------------------------- ground

export const groundFlowers = [
  [34, 346, 16, "#f4a6b8"], [78, 350, 20, "#fff1c9"], [102, 344, 14, "#b9a7ff"],
  [150, 352, 18, "#ff9a86"], [172, 346, 22, "#f4a6b8"], [232, 348, 16, "#fff1c9"],
  [300, 352, 20, "#b9a7ff"], [326, 344, 14, "#ff9a86"], [364, 350, 18, "#f4a6b8"],
  [208, 354, 12, "#b9a7ff"], [18, 352, 14, "#fff1c9"], [126, 356, 13, "#f4a6b8"],
  [190, 358, 11, "#ff9a86"], [256, 356, 15, "#f4a6b8"], [344, 356, 12, "#fff1c9"],
  [386, 346, 16, "#b9a7ff"],
] as const;

// How a flower holds itself: open and upright in the sun, half shut under a
// grey sky, closed and drooping in the rain, tossed about in the wind.
const flowerMood: Record<WeatherKind, { open: number; droop: number; amp: string; dur: string }> = {
  clear: { open: 1, droop: 0, amp: "2.5deg", dur: "4.2s" },
  cloudy: { open: 0.5, droop: 0, amp: "1.5deg", dur: "5s" },
  wind: { open: 1, droop: 0, amp: "13deg", dur: "1.1s" },
  rain: { open: 0.1, droop: 22, amp: "1deg", dur: "3s" },
  storm: { open: 0.05, droop: 28, amp: "10deg", dur: "0.9s" },
  snow: { open: 0, droop: 0, amp: "0deg", dur: "1s" },
};

function GroundFlower({
  x,
  y,
  h,
  color,
  kind,
  index,
}: {
  x: number;
  y: number;
  h: number;
  color: string;
  kind: WeatherKind;
  index: number;
}) {
  const mood = flowerMood[kind];
  const spread = mood.open;
  return (
    <g transform={`translate(${x} ${y})`}>
      <g
        className={styles.sway}
        style={vars({ "--amp": mood.amp, "--dur": mood.dur, animationDelay: `${-(index % 7) * 0.4}s` })}
      >
        <g transform={`rotate(${mood.droop * (index % 2 ? 1 : -1)})`}>
          <path d={`M0 0 V${-h}`} stroke="#5f9a7e" strokeWidth="2" strokeLinecap="round" />
          <path d={`M0 ${-h * 0.4} q-6 -3 -7 -8 q6 0 7 8`} fill="#6fae8f" />
          <g transform={`translate(0 ${-h})`}>
            {[0, 72, 144, 216, 288].map((angle) => (
              <ellipse
                key={angle}
                cx="0"
                cy={-2 - 2 * spread}
                rx={1.6 + 1 * spread}
                ry={2.6 + 1.4 * spread}
                fill={color}
                transform={`rotate(${angle * spread})`}
              />
            ))}
            <circle r={0.8 + 1.2 * spread} fill={spread > 0.3 ? "#fff1c9" : color} />
          </g>
        </g>
      </g>
    </g>
  );
}

const grassBlades = Array.from({ length: 80 }, (_, index) => ({
  x: (index * 29.7 + 7) % 400,
  y: 338 + ((index * 17) % 24),
  h: 7 + ((index * 13) % 9),
  lean: ((index * 7) % 9) - 4,
}));

function Grass({ kind }: { kind: WeatherKind }) {
  const colors = palette[kind].grass;
  const mood = flowerMood[kind];
  return (
    <g>
      {grassBlades.map((blade, index) => (
        <g key={index} transform={`translate(${blade.x.toFixed(1)} ${blade.y})`}>
          <g
            className={styles.sway}
            style={vars({ "--amp": mood.amp, "--dur": mood.dur, animationDelay: `${-(index % 9) * 0.3}s` })}
          >
            <path
              d={`M0 0 Q${blade.lean * 0.3} ${-blade.h * 0.6} ${blade.lean} ${-blade.h}`}
              stroke={colors[index % 2]}
              strokeWidth="1.8"
              strokeLinecap="round"
              fill="none"
            />
          </g>
        </g>
      ))}
    </g>
  );
}

export function GroundCover({ kind, count }: { kind: WeatherKind; count: number }) {
  if (kind === "snow") {
    return (
      <g fill="#ffffff">
        {groundFlowers.slice(0, count).map(([x, y], index) => (
          <ellipse key={index} cx={x} cy={y + 2} rx={9 + (index % 3) * 2} ry="3.6" />
        ))}
      </g>
    );
  }
  return (
    <g>
      <Grass kind={kind} />
      {groundFlowers.slice(0, count).map(([x, y, h, color], index) => (
        <GroundFlower key={index} x={x} y={y} h={h} color={color} kind={kind} index={index} />
      ))}
    </g>
  );
}

export function Butterflies() {
  return (
    <g>
      {[
        { x: 120, y: 300, color: "#f4a6b8", delay: 0 },
        { x: 330, y: 290, color: "#ffd166", delay: -3 },
      ].map((fly) => (
        <g key={fly.x} transform={`translate(${fly.x} ${fly.y})`}>
          <g className={styles.flutter} style={{ animationDelay: `${fly.delay}s` }}>
            <g className={styles.wings}>
              <ellipse cx="-3.5" cy="-2" rx="4" ry="3" fill={fly.color} />
              <ellipse cx="3.5" cy="-2" rx="4" ry="3" fill={fly.color} />
            </g>
            <ellipse cx="0" cy="0" rx="0.9" ry="3" fill="#4a3030" />
          </g>
        </g>
      ))}
    </g>
  );
}

export function FlyingLeaves() {
  return (
    <g>
      {[
        [40, 120, "#7fbf9e"], [20, 210, "#6fae8f"], [60, 280, "#f4a6b8"],
        [10, 160, "#f4a6b8"], [30, 250, "#7fbf9e"], [50, 90, "#6fae8f"],
      ].map(([y1, y2, color], index) => (
        <g key={index} transform={`translate(0 ${y1})`}>
          <g
            className={styles.leafFly}
            style={vars({ "--drop": `${(y2 as number) - 120}px`, animationDelay: `${-index * 0.8}s` })}
          >
            <ellipse rx="4.5" ry="2.4" fill={color as string} />
          </g>
        </g>
      ))}
    </g>
  );
}

// ---------------------------------------------------------------- winter

export function Pine({ x, scale }: { x: number; scale: number }) {
  return (
    <g transform={`translate(${x} 330) scale(${scale})`}>
      <rect x="-4" y="-12" width="8" height="14" fill="#6f4429" />
      <path d="M-26 -10 L0 -50 L26 -10 Z" fill="#2f6b4c" />
      <path d="M-22 -34 L0 -72 L22 -34 Z" fill="#3a7d58" />
      <path d="M-17 -56 L0 -92 L17 -56 Z" fill="#46906a" />
      <path d="M-26 -10 Q-14 -20 0 -14 Q14 -20 26 -10 L22 -16 L0 -50 L-22 -16 Z" fill="#fff" opacity="0.9" />
      <path d="M-22 -34 Q-10 -42 0 -38 Q10 -42 22 -34 L16 -44 L0 -72 L-16 -44 Z" fill="#fff" opacity="0.9" />
      <path d="M-17 -56 Q-8 -62 0 -58 Q8 -62 17 -56 L10 -68 L0 -92 L-10 -68 Z" fill="#fff" opacity="0.92" />
    </g>
  );
}

export function Snowman({ x }: { x: number }) {
  return (
    <g transform={`translate(${x} 330)`}>
      <circle cy="-14" r="15" fill="#fff" />
      <circle cy="-38" r="11" fill="#fff" />
      <circle cy="-56" r="8.5" fill="#fff" />
      <path d="M-12 -40 L-28 -52 M12 -40 L28 -50" stroke="#6f4429" strokeWidth="2" strokeLinecap="round" />
      <path d="M-8 -46 Q0 -41 8 -46" stroke="#e0475b" strokeWidth="4" strokeLinecap="round" fill="none" />
      <path d="M-4 -45 l-1 9" stroke="#e0475b" strokeWidth="3.4" strokeLinecap="round" />
      <circle cx="-3" cy="-58" r="1.1" fill="#2a1318" />
      <circle cx="3" cy="-58" r="1.1" fill="#2a1318" />
      <path d="M0 -55 L8 -53.5 L0 -52 Z" fill="#f2882e" />
      <circle cy="-36" r="1.2" fill="#2a1318" />
      <circle cy="-30" r="1.2" fill="#2a1318" />
      <rect x="-8" y="-72" width="16" height="9" fill="#2a2a38" />
      <rect x="-12" y="-64" width="24" height="3" fill="#2a2a38" />
    </g>
  );
}

// ---------------------------------------------------------------- house

export function Cottage({ snow }: { snow: boolean }) {
  return (
    <g>
      <rect x="18" y="-58" width="9" height="20" fill="#8a4a3a" />
      <rect x="-34" y="-36" width="68" height="36" fill="#d9a066" />
      <path d="M-34 -24H34M-34 -12H34" stroke="#c08850" strokeWidth="1" />
      <path d="M-42 -35 L0 -68 L42 -35 Z" fill="#c4473d" />
      {snow && <path d="M-42 -35 L0 -68 L42 -35 Q30 -41 20 -37 Q10 -45 0 -39 Q-10 -45 -20 -37 Q-30 -41 -42 -35 Z" fill="#fff" />}
      <path d="M0 -41 C-9 -48 -6 -55 0 -50 C6 -55 9 -48 0 -41 Z" fill="#fff1c9" />
      <path d="M-9 0 V-16 a9 9 0 0 1 18 0 V0 Z" fill="#5a3322" />
      <circle cx="5" cy="-8" r="1.1" fill="#f4d98a" />
      <rect x="-30" y="-28" width="14" height="13" fill="#ffe9a8" />
      <path d="M-23 -28 V-15 M-30 -21.5 H-16" stroke="#8a5a3a" strokeWidth="1.2" />
      <rect x="16" y="-28" width="14" height="13" fill="#ffe9a8" />
      <path d="M23 -28 V-15 M16 -21.5 H30" stroke="#8a5a3a" strokeWidth="1.2" />
      {snow && <path d="M-36 0 Q0 -6 36 0 Q36 5 0 4 Q-36 5 -36 0 Z" fill="#fff" />}
    </g>
  );
}

// ---------------------------------------------------------------- couple

type Mood = "happy" | "love" | "kiss";

function Monkey({ mood, reach, cold }: { mood: Mood; reach: boolean; cold: boolean }) {
  const closed = mood !== "happy";
  return (
    <g className={styles.bob}>
      <path d="M-12 -10 C-34 -8 -38 -32 -28 -42" stroke="#8b5a3c" strokeWidth="5" strokeLinecap="round" fill="none" />
      <ellipse cx="0" cy="-18" rx="14" ry="16" fill="#8b5a3c" />
      <ellipse cx="0" cy="-14" rx="8" ry="10" fill="#e8c9a0" />
      <ellipse cx="-9" cy="-2" rx="7" ry="3.5" fill="#6f4429" />
      <ellipse cx="9" cy="-2" rx="7" ry="3.5" fill="#6f4429" />
      <path d="M-11 -24 C-18 -18 -17 -10 -11 -8" stroke="#8b5a3c" strokeWidth="5" strokeLinecap="round" fill="none" />
      <path
        d={
          reach
            ? "M10 -26 C18 -30 24 -28 28 -24"
            : mood === "love"
              ? "M10 -26 C22 -30 32 -26 38 -20"
              : "M11 -24 C18 -18 17 -10 11 -8"
        }
        stroke="#8b5a3c"
        strokeWidth="5"
        strokeLinecap="round"
        fill="none"
      />
      <circle cx="-11" cy="-46" r="4.5" fill="#8b5a3c" />
      <circle cx="11" cy="-46" r="4.5" fill="#8b5a3c" />
      <circle cx="-11" cy="-46" r="2.4" fill="#e8c9a0" />
      <circle cx="11" cy="-46" r="2.4" fill="#e8c9a0" />
      <circle cx="0" cy="-44" r="11" fill="#8b5a3c" />
      <ellipse cx="0" cy="-42" rx="7.5" ry="6.5" fill="#e8c9a0" />
      {closed ? (
        <path d="M-5 -44 q2 -2.4 4 0 M1 -44 q2 -2.4 4 0" stroke="#2a1318" strokeWidth="1.2" strokeLinecap="round" fill="none" />
      ) : (
        <>
          <circle cx="-3" cy="-44" r="1.3" fill="#2a1318" />
          <circle cx="3" cy="-44" r="1.3" fill="#2a1318" />
        </>
      )}
      {mood === "kiss" ? (
        <ellipse cx="0" cy="-39" rx="1.6" ry="1.9" fill="#c4473d" />
      ) : (
        <path d="M-3 -39 Q0 -37 3 -39" stroke="#6f4429" strokeWidth="1.2" strokeLinecap="round" fill="none" />
      )}
      {closed && (
        <>
          <circle cx="-7" cy="-40" r="2" fill="#ff8fa3" opacity="0.6" />
          <circle cx="7" cy="-40" r="2" fill="#ff8fa3" opacity="0.6" />
        </>
      )}
      {!cold && (
        <>
          <path d="M-3 -54 L-11 -60 L-11 -50 Z M3 -54 L11 -60 L11 -50 Z" fill="#ff7fa0" transform="translate(-4 -1)" />
          <circle cx="-4" cy="-55" r="2.2" fill="#e8527a" />
          <path d="M-6 -45.5 l-1.6 -1.4 M6 -45.5 l1.6 -1.4" stroke="#2a1318" strokeWidth="1" strokeLinecap="round" />
        </>
      )}
      {cold && (
        <>
          <path d="M-10 -33 Q0 -28 10 -33" stroke="#e0475b" strokeWidth="5" strokeLinecap="round" fill="none" />
          <path d="M5 -31 l2 11" stroke="#e0475b" strokeWidth="4.4" strokeLinecap="round" />
          <path d="M-12 -49 Q-12 -63 0 -63 Q12 -63 12 -49 Z" fill="#e0475b" />
          <rect x="-13" y="-51" width="26" height="4.5" rx="2" fill="#fff1c9" />
          <circle cx="0" cy="-64.5" r="3.4" fill="#fff" />
        </>
      )}
    </g>
  );
}

// Drawn facing right; the caller mirrors it so it looks at the monkey.
function Snake({ mood, cold }: { mood: Mood; cold: boolean }) {
  const closed = mood !== "happy";
  return (
    <g className={styles.sway} style={vars({ "--amp": "-2.5deg", "--dur": "3.4s" })}>
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
      {closed ? (
        <path d="M20.5 -35 q2.5 -2.6 5 0 M26.5 -35 q2.5 -2.6 5 0" stroke="#2a1318" strokeWidth="1.2" strokeLinecap="round" fill="none" />
      ) : (
        <>
          <circle cx="23" cy="-35" r="1.7" fill="#2a1318" />
          <circle cx="29" cy="-35" r="1.7" fill="#2a1318" />
        </>
      )}
      {closed && <circle cx="30" cy="-30" r="2" fill="#ff8fa3" opacity="0.65" />}
      {mood !== "kiss" && (
        <path d="M35 -33 H41 M41 -33 L44 -35 M41 -33 L44 -31" stroke="#e0475b" strokeWidth="1.2" strokeLinecap="round" />
      )}
      {!cold && (
        <path d="M21 -25 L27 -22 L21 -19 Z M33 -25 L27 -22 L33 -19 Z" fill="#2f5fa8" transform="translate(-2 -1)" />
      )}
      {cold && (
        <>
          <path d="M17 -26 Q24 -21 31 -27" stroke="#4a78c2" strokeWidth="4.6" strokeLinecap="round" fill="none" />
          <path d="M20 -24 l-2 10" stroke="#4a78c2" strokeWidth="4" strokeLinecap="round" />
          <path d="M17 -36 Q17 -47 26 -47 Q35 -47 35 -36 Z" fill="#4a78c2" />
          <rect x="16" y="-38" width="20" height="4" rx="2" fill="#fff1c9" />
          <circle cx="26" cy="-48.5" r="3" fill="#fff" />
        </>
      )}
    </g>
  );
}

function Umbrella() {
  return (
    <g>
      <path d="M0 -62 V-24 q0 6 -5 6" stroke="#6f4429" strokeWidth="2" strokeLinecap="round" fill="none" />
      <path
        d="M-50 -62 Q0 -112 50 -62 Q36 -68 25 -62 Q12 -68 0 -62 Q-12 -68 -25 -62 Q-36 -68 -50 -62 Z"
        fill="#e8788f"
      />
      <path d="M0 -62 Q-14 -92 -4 -96 M0 -62 Q14 -92 4 -96" stroke="#fff1c9" strokeWidth="2" fill="none" />
      <path d="M0 -62 Q-30 -84 -38 -66 M0 -62 Q30 -84 38 -66" stroke="#c45573" strokeWidth="1.2" fill="none" />
    </g>
  );
}

function Hearts({ round }: { round: number }) {
  return (
    <g key={round}>
      {[0, 1, 2].map((index) => (
        <g key={index} transform={`translate(${(index - 1) * 12} -66)`}>
          <g className={styles.heart} style={{ animationDelay: `${index * 0.9}s` }}>
            <path d="M0 4 C-8 -3 -6 -9 0 -5 C6 -9 8 -3 0 4Z" fill="#ef5b7b" />
          </g>
        </g>
      ))}
    </g>
  );
}

function Ball() {
  return (
    <g transform="translate(-12 -4)">
      <g className={styles.ballX}>
        <g className={styles.ballY}>
          <circle r="4.5" fill="#f4b942" />
          <path d="M-4 0 H4 M0 -4 V4" stroke="#d98a1a" strokeWidth="1" />
        </g>
      </g>
    </g>
  );
}

export function Couple({
  action,
  kind,
  round,
  scale,
}: {
  action: CoupleAction;
  kind: WeatherKind;
  round: number;
  scale: number;
}) {
  const mood: Mood = action === "kiss" ? "kiss" : action === "hug" ? "love" : "happy";
  const cold = kind === "snow";
  const umbrella = isWet(kind);

  return (
    <g className={styles.grow} style={{ transform: `scale(${scale})` }}>
      <g transform="translate(-28 0)">
        <g className={styles[`monkey_${action}`]}>
          <Monkey mood={mood} reach={umbrella && action === "umbrella"} cold={cold} />
        </g>
      </g>
      <g transform="translate(27 0)">
        <g className={styles[`snake_${action}`]}>
          <g transform="scale(-1 1)">
            <Snake mood={mood} cold={cold} />
          </g>
        </g>
      </g>
      {umbrella && <Umbrella />}
      {(action === "hug" || action === "kiss") && <Hearts round={round} />}
      {action === "play" && <Ball />}
    </g>
  );
}

// `steady` stays while the real weather is wet; otherwise it fades after a watering.
export function Puddle({ steady }: { steady: boolean }) {
  return (
    <ellipse
      className={steady ? undefined : styles.puddle}
      cx="200"
      cy="334"
      rx="120"
      ry="8"
      fill="#6bb6e6"
      opacity={steady ? 0.35 : undefined}
    />
  );
}
