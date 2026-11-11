"use client";

import { useEffect, useRef, useState } from "react";
import { loveStartDate } from "../lib/love-date";
import {
  readWeatherOverride,
  useWeather,
  weatherLabels,
  type WeatherKind,
} from "../lib/weather";
import {
  Butterflies,
  Cottage,
  Couple,
  FlyingLeaves,
  GroundCover,
  Pine,
  Puddle,
  Sky,
  Snowman,
  Tree,
  isWet,
  palette,
  type CoupleAction,
} from "./LoveTreeArt";
import { loveTree } from "./loveTreeContent";
import styles from "./LoveTree.module.css";

const msPerDay = 24 * 60 * 60 * 1000;
const rainMs = 3400;
const actionMs = 10_000;
const idleActions = ["hug", "kiss", "play"] as const;

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

const rainDrops = Array.from({ length: 48 }, (_, index) => ({
  left: 4 + ((index * 37) % 92),
  delay: ((index * 53) % 130) / 100,
  height: 14 + ((index * 7) % 10),
}));

const snowflakes = Array.from({ length: 44 }, (_, index) => ({
  left: 2 + ((index * 41) % 96),
  delay: -((index * 59) % 90) / 10,
  size: 3 + ((index * 5) % 4),
  duration: 6 + ((index * 3) % 5),
}));

const ripples = [
  [110, 336], [150, 340], [200, 334], [250, 340], [290, 336], [60, 340], [340, 340],
] as const;

// The tree, animals and nest change once every few days: `step` counts how
// many of those intervals have passed since the day the two of them got together.
const daysPerStep = 3;

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

// A size that starts at `min` and grows to 1 over `span` steps after `from`.
const growth = (step: number, from: number, span: number, min: number) =>
  min + (1 - min) * clamp((step - from) / span, 0, 1);

const actionLabels = { hug: "Ôm", kiss: "Hôn", play: "Chơi đùa" } as const;

const previewKinds: readonly WeatherKind[] = ["clear", "wind", "rain", "snow"];

export function LoveTree({ now }: { now: Date | null }) {
  const [watering, setWatering] = useState(false);
  const [waterings, setWaterings] = useState(0);
  const [preview, setPreview] = useState<WeatherKind | null>(readWeatherOverride);
  const [idleAction, setIdleAction] = useState<(typeof idleActions)[number]>("hug");
  const [round, setRound] = useState(0);
  const [manual, setManual] = useState<(typeof idleActions)[number] | null>(null);
  const manualRef = useRef<number | undefined>(undefined);
  const timerRef = useRef<number | undefined>(undefined);
  const weather = useWeather();

  useEffect(
    () => () => {
      window.clearTimeout(timerRef.current);
      window.clearTimeout(manualRef.current);
    },
    [],
  );

  // Hugging, kissing and playing take turns every ten seconds.
  useEffect(() => {
    const interval = window.setInterval(() => {
      setIdleAction((current) => {
        const others = idleActions.filter((action) => action !== current);
        return others[Math.floor(Math.random() * others.length)];
      });
      setRound((value) => value + 1);
    }, actionMs);
    return () => window.clearInterval(interval);
  }, []);

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

  // Growth depends only on the days in love, never on the device, so the tree
  // is the same for everyone. Only the weather differs from place to place.
  const step = Math.floor(days / daysPerStep);
  const daysToChange = daysPerStep - (days % daysPerStep);

  const stage = loveTree.stages.reduce(
    (found, entry, index) => (days >= entry.from ? index : found),
    0,
  );

  const kind = preview ?? weather.kind;
  const colors = palette[kind];
  const wet = isWet(kind);
  const snowing = kind === "snow";
  const raining = wet || watering;

  const action: CoupleAction = manual ?? (wet ? "umbrella" : snowing ? "cold" : idleAction);

  const flowerCount = clamp(step - 2, 0, 16);
  const animalSize = growth(step, 3, 60, 0.8);
  const houseSize = growth(step, 3, 60, 0.7);
  const budTotal = clamp(Math.floor((step - 30) * 1.2), 0, 999);

  const note = waterings > 0 ? loveTree.notes[(waterings - 1) % loveTree.notes.length] : null;

  // A tap holds the chosen pose for ten seconds, even in rain or snow.
  const perform = (next: (typeof idleActions)[number]) => {
    setManual(next);
    setRound((value) => value + 1);
    window.clearTimeout(manualRef.current);
    manualRef.current = window.setTimeout(() => setManual(null), actionMs);
  };

  const water = () => {
    setWaterings((value) => value + 1);
    setWatering(true);
    window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setWatering(false), rainMs);
  };

  const weatherText = preview
    ? `Đang xem thử: ${weatherLabels[preview]}`
    : weather.status === "loading"
      ? "Đang xem thời tiết nơi em..."
      : weather.status === "error"
        ? "Chưa lấy được thời tiết, tạm hiển thị trời nắng"
        : `Nơi em đang: ${weatherLabels[weather.kind]}${weather.temperature === null ? "" : ` · ${weather.temperature}°C`}${weather.place === "default" ? " (chưa có vị trí, tạm lấy Hà Nội)" : ""}`;

  const flowersText = budTotal === 0
    ? "Cây còn đang lớn, chưa có nụ hoa"
    : wet || snowing
      ? "Hoa đang khép cánh, chờ trời quang"
      : "Hoa nở khi trời quang, khép lại khi mưa hay lạnh";

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
            aria-label={`Cây tình yêu ở giai đoạn ${loveTree.stages[stage].name}, trời ${weatherLabels[kind].toLowerCase()}`}
          >
            <Sky kind={kind} />
            <path
              d="M0 334 Q70 316 150 326 T290 322 T400 330 V372 H0 Z"
              fill={colors.ground}
            />
            <g style={{ filter: colors.dim < 1 ? `brightness(${colors.dim})` : undefined }}>
              {raining && <Puddle steady={wet} />}

              {snowing && (
                <>
                  <Pine x={34} scale={0.95} />
                  <Pine x={78} scale={0.72} />
                  <Snowman x={132} />
                </>
              )}

              {step >= 3 && (
                <g transform="translate(360 328)">
                  <g className={styles.grow} style={{ transform: `scale(${houseSize})` }}>
                    <Cottage snow={snowing} />
                  </g>
                </g>
              )}

              <g transform="translate(50 12)">
                <Tree step={step} kind={kind} />
              </g>

              {step >= 3 && (
                <g transform="translate(262 328)">
                  <Couple action={action} kind={kind} round={round} scale={animalSize} />
                </g>
              )}
            </g>

            <GroundCover kind={kind} count={flowerCount} />
            {kind === "clear" && <Butterflies />}
            {kind === "wind" && <FlyingLeaves />}

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

          {snowing && (
            <div className={styles.snow} aria-hidden="true">
              {snowflakes.map((flake, index) => (
                <span
                  key={index}
                  style={{
                    left: `${flake.left}%`,
                    width: flake.size,
                    height: flake.size,
                    animationDelay: `${flake.delay}s`,
                    animationDuration: `${flake.duration}s`,
                  }}
                />
              ))}
            </div>
          )}

          {kind === "storm" && <div className={styles.flash} aria-hidden="true" />}
        </div>

        <div className={styles.info}>
          <span className={styles.weather} role="status">
            {weatherText}
          </span>
          <span className={styles.count}>{flowersText}</span>
          <span className={styles.next}>
            Cây sẽ thay đổi sau {daysToChange} ngày nữa
          </span>
          <button type="button" className={styles.water} onClick={water}>
            {loveTree.waterLabel}
          </button>
          {note && (
            <p className={styles.note} role="status">
              {note}
            </p>
          )}

          <div className={styles.previews} role="group" aria-label="Khỉ và rắn">
            {idleActions.map((option) => (
              <button
                key={option}
                type="button"
                className={manual === option ? styles.previewOn : styles.previewBtn}
                onClick={() => perform(option)}
              >
                {actionLabels[option]}
              </button>
            ))}
          </div>

          <div className={styles.previews} role="group" aria-label="Xem thử thời tiết">
            <button
              type="button"
              className={preview === null ? styles.previewOn : styles.previewBtn}
              onClick={() => setPreview(null)}
            >
              Thực tế
            </button>
            {previewKinds.map((option) => (
              <button
                key={option}
                type="button"
                className={preview === option ? styles.previewOn : styles.previewBtn}
                onClick={() => setPreview(option)}
              >
                {weatherLabels[option]}
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
