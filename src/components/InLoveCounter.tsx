"use client";

import NextImage from "next/image";
import { useMemo, useSyncExternalStore } from "react";
import { loveStartDate } from "../lib/love-date";
import { LoveTree } from "./LoveTree";
import { sitePath } from "../lib/site-path";

const msPerSecond = 1000;
const msPerMinute = msPerSecond * 60;
const msPerHour = msPerMinute * 60;
const msPerDay = msPerHour * 24;

const partners = [
  {
    key: "bac",
    name: "Bắc",
    role: "ANH",
    imageUrl: "/images/inlove/bac.png",
    // Each source frames its subject differently, so the crop is tuned per photo
    // to land both faces at the same size inside the circle.
    objectPosition: "50% 42%",
    scale: 1,
  },
  {
    key: "truyen",
    name: "Truyền",
    role: "EM",
    imageUrl: "/images/inlove/truyen.jpg",
    objectPosition: "45% 5%",
    scale: 1.62,
  },
] as const;

const dayMilestones = [1, 30, 50, 100, 150, 200, 250, 300, 365, 500, 600, 700, 800, 900, 1000, 1500, 2000] as const;

type LoveElapsed = {
  totalDays: number;
  dayNumber: number;
  hours: number;
  minutes: number;
  seconds: number;
  totalHours: number;
  totalMinutes: number;
  totalWeeks: number;
  years: number;
  months: number;
  days: number;
};

type Milestone = {
  key: string;
  label: string;
  targetDate: Date;
  daysLeft: number;
  progress: number;
};

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function addYears(date: Date, years: number) {
  const next = new Date(date);
  next.setFullYear(next.getFullYear() + years);
  return next;
}

function formatDate(date: Date) {
  const day = date.getDate().toString().padStart(2, "0");
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  return `${day}.${month}.${date.getFullYear()}`;
}

function formatNumber(value: number) {
  return value.toLocaleString("vi-VN");
}

function padTime(value: number) {
  return Math.max(0, value).toString().padStart(2, "0");
}

function getElapsed(now: Date): LoveElapsed {
  const elapsedMs = Math.max(0, now.getTime() - loveStartDate.getTime());
  const totalDays = Math.max(0, Math.floor((startOfDay(now) - startOfDay(loveStartDate)) / msPerDay));

  let years = now.getFullYear() - loveStartDate.getFullYear();
  let months = now.getMonth() - loveStartDate.getMonth();
  let days = now.getDate() - loveStartDate.getDate();

  if (days < 0) {
    months -= 1;
    const previousMonth = new Date(now.getFullYear(), now.getMonth(), 0).getDate();
    days += previousMonth;
  }
  if (months < 0) {
    years -= 1;
    months += 12;
  }

  return {
    totalDays,
    dayNumber: totalDays + 1,
    hours: now.getHours(),
    minutes: now.getMinutes(),
    seconds: now.getSeconds(),
    totalHours: Math.floor(elapsedMs / msPerHour),
    totalMinutes: Math.floor(elapsedMs / msPerMinute),
    totalWeeks: Math.floor(totalDays / 7),
    years: Math.max(0, years),
    months: Math.max(0, months),
    days: Math.max(0, days),
  };
}

function getMilestones(totalDays: number): Milestone[] {
  const upcoming: Milestone[] = [];

  dayMilestones.forEach((target) => {
    if (target <= totalDays) return;
    const targetDate = addDays(loveStartDate, target);
    const daysLeft = target - totalDays;
    upcoming.push({
      key: `day-${target}`,
      label: `${formatNumber(target)} NGÀY`,
      targetDate,
      daysLeft,
      progress: totalDays / target,
    });
  });

  for (let year = 1; year <= 10; year += 1) {
    const targetDate = addYears(loveStartDate, year);
    const target = Math.round((startOfDay(targetDate) - startOfDay(loveStartDate)) / msPerDay);
    if (target <= totalDays) continue;
    upcoming.push({
      key: `year-${year}`,
      label: `${year} NĂM`,
      targetDate,
      daysLeft: target - totalDays,
      progress: totalDays / target,
    });
  }

  return upcoming.sort((a, b) => a.daysLeft - b.daysLeft).slice(0, 3);
}

// The page is exported statically, so the clock has to stay out of the server
// render and only start ticking once the browser has taken over.
const clockStore = (() => {
  const listeners = new Set<() => void>();
  let snapshot = 0;
  let timer: number | null = null;

  return {
    subscribe(listener: () => void) {
      listeners.add(listener);
      if (timer == null) {
        snapshot = Date.now();
        timer = window.setInterval(() => {
          snapshot = Date.now();
          listeners.forEach((notify) => notify());
        }, 1000);
      }

      return () => {
        listeners.delete(listener);
        if (listeners.size === 0 && timer != null) {
          window.clearInterval(timer);
          timer = null;
        }
      };
    },
    getSnapshot: () => snapshot,
    getServerSnapshot: () => 0,
  };
})();

function HeartIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 20.5S3.5 15 3.5 9.2A4.7 4.7 0 0 1 12 6.4a4.7 4.7 0 0 1 8.5 2.8c0 5.8-8.5 11.3-8.5 11.3Z" />
    </svg>
  );
}

const floatingHearts = Array.from({ length: 14 }, (_, index) => ({
  left: (index * 7.3 + 4) % 96,
  delay: (index * 1.37) % 12,
  duration: 14 + ((index * 2.1) % 9),
  scale: 0.45 + ((index * 0.17) % 0.65),
}));

export function InLoveCounter() {
  const nowMs = useSyncExternalStore(
    clockStore.subscribe,
    clockStore.getSnapshot,
    clockStore.getServerSnapshot,
  );

  const now = useMemo(() => (nowMs > 0 ? new Date(nowMs) : null), [nowMs]);
  const elapsed = useMemo(() => (now ? getElapsed(now) : null), [now]);
  const milestones = useMemo(() => (elapsed ? getMilestones(elapsed.totalDays) : []), [elapsed]);

  const hasStarted = now ? now.getTime() >= loveStartDate.getTime() : false;
  const daysUntilStart = now
    ? Math.max(0, Math.ceil((startOfDay(loveStartDate) - startOfDay(now)) / msPerDay))
    : 0;

  return (
    <div className="inlove-page">
      <div className="inlove-page__ambient" aria-hidden="true">
        <NextImage
          src={sitePath("/images/inlove/background.jpg")}
          alt=""
          fill
          sizes="100vw"
          priority
        />
      </div>

      <div className="inlove-hearts" aria-hidden="true">
        {floatingHearts.map((heart, index) => (
          <span
            key={index}
            style={{
              left: `${heart.left}%`,
              animationDelay: `${heart.delay}s`,
              animationDuration: `${heart.duration}s`,
              transform: `scale(${heart.scale})`,
            }}
          >
            <HeartIcon />
          </span>
        ))}
      </div>

      <header className="inlove-page__header">
        <div className="inlove-page__heading">
          <span className="inlove-page__eyebrow">MKT / CHUYỆN CHÚNG MÌNH</span>
          <h1>In Love</h1>
        </div>
        <div className="inlove-page__summary">
          <span>BẮT ĐẦU {formatDate(loveStartDate)}</span>
          <span>BẮC &amp; TRUYỀN</span>
        </div>
      </header>

      <main className="inlove-stage">
        <section className="inlove-couple" aria-label="Bắc và Truyền">
          <figure className="inlove-avatar">
            <div className="inlove-avatar__frame">
              <NextImage
                src={sitePath(partners[0].imageUrl)}
                alt={partners[0].name}
                fill
                sizes="(max-width: 760px) 34vw, 220px"
                style={{
                  objectPosition: partners[0].objectPosition,
                  transform: `scale(${partners[0].scale})`,
                }}
                priority
              />
            </div>
            <figcaption>
              <span className="inlove-avatar__role">{partners[0].role}</span>
              <span className="inlove-avatar__name">{partners[0].name}</span>
            </figcaption>
          </figure>

          <div className="inlove-couple__link" aria-hidden="true">
            <span className="inlove-couple__line" />
            <span className="inlove-couple__heart">
              <HeartIcon />
            </span>
            <span className="inlove-couple__line" />
          </div>

          <figure className="inlove-avatar">
            <div className="inlove-avatar__frame">
              <NextImage
                src={sitePath(partners[1].imageUrl)}
                alt={partners[1].name}
                fill
                sizes="(max-width: 760px) 34vw, 220px"
                style={{
                  objectPosition: partners[1].objectPosition,
                  transform: `scale(${partners[1].scale})`,
                }}
                priority
              />
            </div>
            <figcaption>
              <span className="inlove-avatar__role">{partners[1].role}</span>
              <span className="inlove-avatar__name">{partners[1].name}</span>
            </figcaption>
          </figure>
        </section>

        <section className="inlove-counter" aria-live="polite">
          <span className="inlove-counter__label">
            {!now ? "ĐANG ĐẾM" : hasStarted ? "CHÚNG MÌNH ĐÃ YÊU NHAU" : "NGÀY BẮT ĐẦU CÒN"}
          </span>
          <p className="inlove-counter__value">
            <strong>{elapsed ? formatNumber(hasStarted ? elapsed.totalDays : daysUntilStart) : "—"}</strong>
            <span>NGÀY</span>
          </p>
          <div className="inlove-counter__clock">
            <span>{elapsed ? padTime(elapsed.hours) : "--"}</span>
            <i>:</i>
            <span>{elapsed ? padTime(elapsed.minutes) : "--"}</span>
            <i>:</i>
            <span>{elapsed ? padTime(elapsed.seconds) : "--"}</span>
          </div>
          <span className="inlove-counter__note">
            {!now
              ? `TỪ NGÀY ${formatDate(loveStartDate)}`
              : hasStarted
                ? `HÔM NAY LÀ NGÀY THỨ ${elapsed ? formatNumber(elapsed.dayNumber) : "—"} CỦA CHÚNG MÌNH`
                : `HẸN NHAU NGÀY ${formatDate(loveStartDate)}`}
          </span>
        </section>

        <section className="inlove-breakdown" aria-label="Thống kê">
          <div className="inlove-breakdown__cell">
            <span className="inlove-breakdown__label">CHÍNH XÁC</span>
            <span className="inlove-breakdown__value">
              {elapsed ? `${elapsed.years} NĂM ${elapsed.months} THÁNG ${elapsed.days} NGÀY` : "—"}
            </span>
          </div>
          <div className="inlove-breakdown__cell">
            <span className="inlove-breakdown__label">TUẦN</span>
            <span className="inlove-breakdown__value">{elapsed ? formatNumber(elapsed.totalWeeks) : "—"}</span>
          </div>
          <div className="inlove-breakdown__cell">
            <span className="inlove-breakdown__label">GIỜ</span>
            <span className="inlove-breakdown__value">{elapsed ? formatNumber(elapsed.totalHours) : "—"}</span>
          </div>
          <div className="inlove-breakdown__cell">
            <span className="inlove-breakdown__label">PHÚT</span>
            <span className="inlove-breakdown__value">{elapsed ? formatNumber(elapsed.totalMinutes) : "—"}</span>
          </div>
        </section>

        <LoveTree now={now} />

        <section className="inlove-milestones" aria-label="Cột mốc sắp tới">
          <header className="inlove-milestones__header">
            <span>CỘT MỐC SẮP TỚI</span>
            <span>{elapsed ? `NGÀY ${formatNumber(elapsed.totalDays)}` : ""}</span>
          </header>
          <ol className="inlove-milestones__list">
            {milestones.map((milestone) => (
              <li key={milestone.key} className="inlove-milestone">
                <div className="inlove-milestone__top">
                  <span className="inlove-milestone__label">{milestone.label}</span>
                  <span className="inlove-milestone__left">CÒN {formatNumber(milestone.daysLeft)} NGÀY</span>
                </div>
                <div className="inlove-milestone__bar">
                  <i style={{ width: `${Math.min(100, Math.max(0, milestone.progress * 100))}%` }} />
                </div>
                <span className="inlove-milestone__date">{formatDate(milestone.targetDate)}</span>
              </li>
            ))}
          </ol>
        </section>

        <footer className="inlove-footer">
          <span>Mỗi ngày trôi qua vẫn là em.</span>
          <span>B &amp; T</span>
        </footer>
      </main>
    </div>
  );
}
