"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { buildSlots, countdownStart, daysUntilMeet, meetDate, timeParts, type CountdownSlot } from "@/lib/countdown";
import { sitePath } from "@/lib/site-path";
import { CountdownPlayer } from "./CountdownPlayer";
import styles from "./Countdown.module.css";

const pad = (n: number) => String(n).padStart(2, "0");
const DAY = 86_400_000;

const notes = [
  "Mỗi ngày trôi qua là một ngày gần em hơn.",
  "Anh đếm từng ngày, không phải vì chờ đợi, mà vì háo hức.",
  "Chờ thêm chút nữa thôi, rồi mình gặp nhau.",
  "Cách nhau một múi giờ, chung nhau một nhịp tim.",
  "Tết Dương này, mình sẽ ôm nhau thật chặt.",
  "Nhớ em nhiều hơn hôm qua, ít hơn ngày mai.",
  "Đợi em về, anh sẽ không buông tay nữa.",
  "Mỗi tấm ảnh là một ngày, mỗi ngày là một nỗi nhớ.",
];

const milestones = [
  { label: "Giáng sinh", month: 11, day: 25, icon: "✦" },
  { label: "Giao thừa", month: 11, day: 31, icon: "✦" },
  { label: "Gặp nhau", month: 0, day: 1, icon: "♥" },
];

function slotDate(s: CountdownSlot) {
  return new Date(meetDate.getFullYear(), meetDate.getMonth(), meetDate.getDate() - s.daysLeft);
}
const fmtDate = (d: Date) => `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;

function FlipDigit({ value, label }: { value: string; label: string }) {
  return (
    <div className={styles.flip}>
      <div className={styles.flipCard} key={value}>{value}</div>
      <span>{label}</span>
    </div>
  );
}

// Deterministic "random" so server and client render the same sky.
const rnd = (i: number, k: number) => ((Math.sin(i * 12.9898 + k * 78.233) * 43758.5453) % 1 + 1) % 1;
const stars = Array.from({ length: 70 }, (_, i) => ({
  x: rnd(i, 1) * 100, y: rnd(i, 2) * 100, s: 1 + rnd(i, 3) * 2.2, d: rnd(i, 4) * 5, t: 2 + rnd(i, 5) * 4,
}));
const hearts = Array.from({ length: 14 }, (_, i) => ({
  x: rnd(i, 7) * 100, s: 12 + rnd(i, 8) * 20, d: rnd(i, 9) * -18, t: 14 + rnd(i, 10) * 14,
}));

type Burst = { id: number; x: number; y: number };

export function Countdown() {
  const [now, setNow] = useState<Date | null>(null);
  const [open, setOpen] = useState<number | null>(null);
  const [bursts, setBursts] = useState<Burst[]>([]);
  const [seen, setSeen] = useState<Set<number>>(new Set());
  const gridRef = useRef<HTMLElement>(null);
  const burstId = useRef(0);

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
  const note = notes[dayKey % notes.length];

  // Reveal tiles as they scroll into view.
  useEffect(() => {
    const root = gridRef.current;
    if (!root || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver((entries) => {
      setSeen((prev) => {
        const next = new Set(prev);
        entries.forEach((e) => {
          if (e.isIntersecting) next.add(Number((e.target as HTMLElement).dataset.i));
        });
        return next.size === prev.size ? prev : next;
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.1 });
    root.querySelectorAll("[data-i]").forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [slots]);

  useEffect(() => {
    if (open === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(null);
      if (e.key === "ArrowRight") setOpen((v) => (v === null ? v : Math.min(total - 1, v + 1)));
      if (e.key === "ArrowLeft") setOpen((v) => (v === null ? v : Math.max(0, v - 1)));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, total]);

  const burst = useCallback((x: number, y: number) => {
    const id = ++burstId.current;
    setBursts((b) => [...b, { id, x, y }]);
    window.setTimeout(() => setBursts((b) => b.filter((v) => v.id !== id)), 1400);
  }, []);

  // Journey path.
  const [x0, y0, cx, cy, x1, y1] = [28, 96, 180, -6, 332, 96];
  const u = progress;
  const px = (1 - u) * (1 - u) * x0 + 2 * (1 - u) * u * cx + u * u * x1;
  const py = (1 - u) * (1 - u) * y0 + 2 * (1 - u) * u * cy + u * u * y1;
  const angle = (Math.atan2(2 * (1 - u) * (cy - y0) + 2 * u * (y1 - cy), 2 * (1 - u) * (cx - x0) + 2 * u * (x1 - cx)) * 180) / Math.PI;
  const path = `M${x0} ${y0} Q${cx} ${cy} ${x1} ${y1}`;

  const ring = 2 * Math.PI * 92;
  const todayIndex = slots.findIndex((s) => s.isToday);
  const openSlot = open === null ? null : slots[open];

  return (
    <main className={styles.root}>
      {/* ambient layers */}
      <div className={styles.aurora} aria-hidden><i /><i /><i /></div>
      <div className={styles.sky} aria-hidden>
        {stars.map((s, i) => (
          <span key={i} style={{ left: `${s.x}%`, top: `${s.y}%`, width: s.s, height: s.s, animationDelay: `${s.d}s`, animationDuration: `${s.t}s` }} />
        ))}
      </div>
      <div className={styles.hearts} aria-hidden>
        {hearts.map((h, i) => (
          <span key={i} style={{ left: `${h.x}%`, fontSize: h.s, animationDelay: `${h.d}s`, animationDuration: `${h.t}s` }}>
            {i % 2 ? "✦" : "·"}
          </span>
        ))}
      </div>
      {arrived && Array.from({ length: 30 }, (_, i) => (
        <span key={i} className={styles.fall} aria-hidden style={{ left: `${(i * 37) % 100}%`, fontSize: 16 + (i % 4) * 6, animationDuration: `${4 + (i % 5)}s`, animationDelay: `${(i % 6) * -1}s` }}>
          {["♥", "✦", "♡", "✧"][i % 4]}
        </span>
      ))}

      <div className={styles.page}>
        <header className={styles.hero}>
          <div className={styles.kicker}>Ngày gặp em còn</div>
          {arrived ? (
            <div className={styles.met}>
              <h1 className={styles.metTitle}>Đã gặp nhau ♥</h1>
              <p>Chào năm mới 2027, Bắc &amp; Truyền cuối cùng đã ở bên nhau!</p>
            </div>
          ) : (
            <>
              <button
                type="button"
                className={styles.orb}
                onClick={(e) => { const r = e.currentTarget.getBoundingClientRect(); burst(r.left + r.width / 2, r.top + r.height / 2); }}
                aria-label={`Còn ${dayKey} ngày`}
              >
                <svg viewBox="0 0 200 200" aria-hidden>
                  <defs>
                    <linearGradient id="cdg" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0" stopColor="#ffb3d1" /><stop offset=".5" stopColor="#ff5c9a" /><stop offset="1" stopColor="#b0215f" />
                    </linearGradient>
                  </defs>
                  <circle cx="100" cy="100" r="92" className={styles.ringBg} />
                  <circle cx="100" cy="100" r="92" className={styles.ringFg} strokeDasharray={`${ring * progress} ${ring}`} />
                  <circle cx="100" cy="100" r="80" className={styles.ringDash} />
                </svg>
                <span className={styles.big}>{dayKey}</span>
                <span className={styles.unit}>ngày · 01/01/2027</span>
              </button>

              <div className={styles.clock} aria-hidden>
                <FlipDigit value={pad(t.hours)} label="giờ" />
                <b>:</b>
                <FlipDigit value={pad(t.minutes)} label="phút" />
                <b>:</b>
                <FlipDigit value={pad(t.seconds)} label="giây" />
              </div>
            </>
          )}
          <p className={styles.note} key={note}>“{note}”</p>
        </header>

        <section className={styles.journey} aria-label="Hành trình">
          <svg viewBox="0 0 360 130" role="img" aria-label={`Hành trình: đã đi ${Math.round(progress * 100)}%`}>
            <defs>
              <linearGradient id="trail" x1="0" x2="1"><stop offset="0" stopColor="#ffb3d1" /><stop offset="1" stopColor="#ff5c9a" /></linearGradient>
              <filter id="glow"><feGaussianBlur stdDeviation="3" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
            </defs>
            <path d={path} className={styles.pathBg} />
            <path d={path} className={styles.pathFg} pathLength={1} strokeDasharray={`${progress} 1`} filter="url(#glow)" />
            <g>
              <circle cx={x0} cy={y0} r="7" fill="#fbeef2" /><circle cx={x0} cy={y0} r="12" className={styles.pulseRing} />
              <circle cx={x1} cy={y1} r="7" fill="#ff5c9a" /><circle cx={x1} cy={y1} r="12" className={styles.pulseRing} />
            </g>
            <text x={x0} y={y0 + 24} textAnchor="start" className={styles.label}>Khánh Truyền</text>
            <text x={x1} y={y1 + 24} textAnchor="end" className={styles.label}>Bắc · Việt Nam</text>
            <g transform={`translate(${px} ${py}) rotate(${arrived ? 0 : angle})`}>
              <text className={styles.bob} textAnchor="middle" fontSize="24" y="8">{arrived ? "♥" : "✈︎"}</text>
            </g>
          </svg>
          <div className={styles.stats}>
            <div><b>{total - dayKey}</b><span>ngày đã qua</span></div>
            <div><b>{Math.round(progress * 100)}%</b><span>hành trình</span></div>
            <div><b>{dayKey}</b><span>ngày còn lại</span></div>
          </div>
          <div className={styles.chips}>
            {milestones.map((m) => {
              const d = new Date(meetDate.getFullYear() - (m.month === 0 ? 0 : 1), m.month, m.day);
              const left = Math.max(0, Math.round((d.getTime() - new Date(current.getFullYear(), current.getMonth(), current.getDate()).getTime()) / DAY));
              return <span key={m.label} className={styles.chip}>{m.icon} {m.label} · {left === 0 ? "hôm nay" : `${left} ngày`}</span>;
            })}
          </div>
        </section>

        <div className={styles.gridHead}>
          <h2><span>Bộ sưu tập</span> Ngày chờ em</h2>
          {todayIndex >= 0 && (
            <button type="button" onClick={() => gridRef.current?.querySelector(`[data-i="${todayIndex}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" })}>
              Tới hôm nay ↓
            </button>
          )}
        </div>

        <section ref={gridRef} className={styles.grid} aria-label="Bức tranh ký ức">
          {slots.map((s, i) => {
            const state = s.passed ? styles.passed : s.isToday && !arrived ? styles.today : styles.locked;
            return (
              <button
                key={s.daysLeft}
                type="button"
                data-i={i}
                className={`${styles.tile} ${state} ${seen.has(i) ? styles.in : ""}`}
                style={{ ["--r" as string]: `${((i * 7) % 9) - 4}deg`, ["--d" as string]: `${(i % 6) * 60}ms` }}
                onClick={() => setOpen(i)}
                aria-label={`Ngày ${fmtDate(slotDate(s))}, còn ${s.daysLeft} ngày`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={sitePath(s.src)} alt="" loading="lazy" decoding="async" />
                {s.isToday && !arrived && <em className={styles.badge}>HÔM NAY</em>}
                <span className={styles.cap}>{pad(slotDate(s).getDate())}.{pad(slotDate(s).getMonth() + 1)}</span>
                {!s.passed && !s.isToday && <span className={styles.num}><small>{s.daysLeft}</small><b>ngày</b></span>}
                <i className={styles.shine} />
              </button>
            );
          })}
        </section>
      </div>

      {bursts.map((b) => (
        <div key={b.id} className={styles.burst} style={{ left: b.x, top: b.y }} aria-hidden>
          {Array.from({ length: 14 }, (_, i) => (
            <span key={i} style={{ ["--a" as string]: `${(360 / 14) * i}deg`, ["--k" as string]: `${60 + (i % 3) * 28}px` }}>{i % 2 ? "♥" : "✦"}</span>
          ))}
        </div>
      ))}

      {openSlot && open !== null && (
        <div className={styles.lightbox} role="dialog" aria-modal="true">
          <button type="button" className={styles.lbBack} onClick={() => setOpen(null)} aria-label="Đóng" />
          <figure className={`${styles.lbCard} ${!openSlot.passed && !openSlot.isToday ? styles.lbLocked : ""}`} key={open}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={sitePath(openSlot.src)} alt="" />
            <figcaption>
              <b>{fmtDate(slotDate(openSlot))}</b>
              <span>
                {openSlot.isToday ? "Hôm nay · " : openSlot.passed ? "Đã qua · " : "Sắp tới · "}
                {openSlot.daysLeft === 0 ? "Ngày gặp nhau" : `còn ${openSlot.daysLeft} ngày`}
              </span>
            </figcaption>
          </figure>
          <button type="button" className={`${styles.lbNav} ${styles.lbPrev}`} onClick={() => setOpen(Math.max(0, open - 1))} aria-label="Trước">‹</button>
          <button type="button" className={`${styles.lbNav} ${styles.lbNext}`} onClick={() => setOpen(Math.min(total - 1, open + 1))} aria-label="Sau">›</button>
          <button type="button" className={styles.lbClose} onClick={() => setOpen(null)} aria-label="Đóng">✕</button>
        </div>
      )}

      <CountdownPlayer />
    </main>
  );
}
