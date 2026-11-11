"use client";

import { useEffect, useMemo, useState } from "react";
import { buildSlots, countdownStart, daysUntilMeet, meetDate, timeParts } from "@/lib/countdown";
import { sitePath } from "@/lib/site-path";
import styles from "./Countdown.module.css";

const pad = (n: number) => String(n).padStart(2, "0");
const DAY = 86_400_000;

export function Countdown() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    const tick = () => setNow(new Date());
    const first = window.setTimeout(tick, 0);
    const id = window.setInterval(tick, 1000);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(id);
    };
  }, []);

  const current = now ?? new Date(countdownStart);
  const dayKey = daysUntilMeet(current);
  const slots = useMemo(() => buildSlots(new Date(meetDate.getTime() - dayKey * DAY)), [dayKey]);
  const t = timeParts(current);
  const arrived = now !== null && t.arrived;

  const total = slots.length;
  const progress = Math.min(1, Math.max(0, (total - dayKey) / total));

  // Journey path: quadratic curve from A (left) to B (right).
  const [x0, y0, cx, cy, x1, y1] = [24, 70, 160, 0, 296, 70];
  const u = progress;
  const px = (1 - u) * (1 - u) * x0 + 2 * (1 - u) * u * cx + u * u * x1;
  const py = (1 - u) * (1 - u) * y0 + 2 * (1 - u) * u * cy + u * u * y1;
  const path = `M${x0} ${y0} Q${cx} ${cy} ${x1} ${y1}`;

  return (
    <main className={styles.root}>
      {arrived &&
        Array.from({ length: 18 }, (_, i) => (
          <span
            key={i}
            className={styles.fall}
            aria-hidden
            style={{ left: `${(i * 37) % 100}%`, fontSize: 16 + (i % 4) * 6, animationDuration: `${4 + (i % 5)}s`, animationDelay: `${(i % 6) * -1}s` }}
          >
            {i % 2 ? "💖" : "🎉"}
          </span>
        ))}

      <header className={styles.head}>
        {arrived ? (
          <div className={styles.met}>
            <h1 className={styles.metTitle}>ĐÃ GẶP NHAU 💞</h1>
            <p>Chào năm mới 2027, Bắc &amp; Truyền cuối cùng đã ở bên nhau!</p>
          </div>
        ) : (
          <>
            <div className={styles.kicker}>Còn lại đến 01/01/2027</div>
            <div className={styles.big} aria-label={`${dayKey} ngày`}>{dayKey}</div>
            <div className={styles.unit}>ngày nữa là gặp nhau</div>
            <div className={styles.clock} aria-hidden>{pad(t.hours)}:{pad(t.minutes)}:{pad(t.seconds)}</div>
          </>
        )}
      </header>

      <div className={styles.journey}>
        <svg viewBox="0 0 320 100" role="img" aria-label={`Hành trình: đã đi ${Math.round(progress * 100)}%`}>
          <path d={path} fill="none" stroke="rgba(255,255,255,.3)" strokeWidth="2" strokeDasharray="4 6" />
          <path d={path} fill="none" stroke="#ff6b9a" strokeWidth="2.5" pathLength={1} strokeDasharray={`${progress} 1`} />
          <circle cx={x0} cy={y0} r="6" fill="#ffd6e4" />
          <circle cx={x1} cy={y1} r="6" fill="#ff6b9a" />
          <text x={x0} y={y0 + 22} textAnchor="start" className={styles.label}>Khánh Truyền</text>
          <text x={x1} y={y1 + 22} textAnchor="end" className={styles.label}>Bắc · 01/01/2027</text>
          <g transform={`translate(${px} ${py})`}>
            <text className={styles.bob} textAnchor="middle" fontSize="22" y="6">{arrived ? "💞" : "✈️"}</text>
          </g>
        </svg>
      </div>
      <div className={styles.pct}>Đã qua {total - dayKey}/{total} ngày · {Math.round(progress * 100)}%</div>

      <section className={styles.grid} aria-label="Bức tranh ký ức">
        {slots.map((s, i) => {
          const cls = s.passed
            ? `${styles.tile} ${styles.passed}`
            : `${styles.tile} ${styles.locked} ${s.isToday && !arrived ? styles.today : ""}`;
          return (
            <div key={s.daysLeft} className={cls} style={{ ["--r" as string]: `${((i * 7) % 9) - 4}deg` }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={sitePath(s.src)} alt="" loading="lazy" decoding="async" />
              {!s.passed && <span className={styles.num}>{s.daysLeft}</span>}
            </div>
          );
        })}
      </section>
    </main>
  );
}
