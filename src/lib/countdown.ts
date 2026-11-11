// Countdown to New Year's Day, when Khánh Truyền flies home and they finally meet.
export const meetDate = new Date(2027, 0, 1, 0, 0, 0, 0);

// Every photo of the two of them already in the app (memory archive, video frames, portraits).
export const countdownPhotos = [
  "/memory-media/IMG_3244-poster.jpg",
  "/memory-media/IMG_3248-poster.jpg",
  "/memory-media/IMG_3259.jpg",
  "/memory-media/IMG_3265.jpg",
  "/memory-media/IMG_3274.jpg",
  "/memory-media/IMG_3367.jpg",
  "/memory-media/IMG_3372.jpg",
  "/memory-media/IMG_7388.jpg",
  "/memory-media/IMG_7391.jpg",
  "/memory-media/IMG_7407.jpg",
  "/memory-media/IMG_7411.jpg",
  "/memory-media/IMG_7414.jpg",
  "/memory-media/IMG_7420-poster.jpg",
  "/memory-media/IMG_7565.jpg",
  "/memory-media/IMG_7568.jpg",
  "/memory-media/IMG_7569.jpg",
  "/memory-media/IMG_7576.jpg",
  "/memory-media/IMG_7584-poster.jpg",
  "/memory-media/IMG_7587.jpg",
  "/memory-media/IMG_7588-poster.jpg",
  "/memory-media/IMG_7592-poster.jpg",
  "/memory-media/IMG_7610-poster.jpg",
  "/memory-media/IMG_7611.jpg",
  "/memory-media/IMG_7630.jpg",
  "/memory-media/IMG_7633.jpg",
  "/memory-media/IMG_7636.jpg",
  "/memory-media/IMG_7637.jpg",
  "/memory-media/IMG_7642.jpg",
  "/memory-media/IMG_7643.jpg",
  "/memory-media/IMG_7644-poster.jpg",
  "/memory-media/IMG_7649.jpg",
  "/memory-media/IMG_7655.jpg",
  "/images/inlove/bac.png",
  "/images/inlove/truyen.jpg",
] as const;

export type CountdownSlot = {
  /** 1-based number of days remaining represented by this tile; 1 = the last day before meeting. */
  daysLeft: number;
  /** Photo path (without base path; wrap with sitePath). */
  src: string;
  /** true once that day has passed. */
  passed: boolean;
  /** true for today's tile. */
  isToday: boolean;
};

const DAY = 86_400_000;

export function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/** Whole calendar days from now until meetDate (0 once the day has arrived). */
export function daysUntilMeet(now: Date = new Date()) {
  return Math.max(0, Math.round((meetDate.getTime() - startOfDay(now)) / DAY));
}

/**
 * One tile per day, ordered from the first day of the countdown to the last.
 * total = days between countdownStart and meetDate. Photos repeat if there are fewer photos than days.
 */
export const countdownStart = new Date(2026, 10, 11); // 11/11/2026

export function buildSlots(now: Date = new Date()): CountdownSlot[] {
  const total = Math.round((meetDate.getTime() - startOfDay(countdownStart)) / DAY);
  const left = daysUntilMeet(now);
  return Array.from({ length: total }, (_, i) => {
    const daysLeft = total - i;
    return {
      daysLeft,
      src: countdownPhotos[i % countdownPhotos.length],
      passed: daysLeft > left,
      isToday: daysLeft === left,
    };
  });
}

export type TimeParts = { days: number; hours: number; minutes: number; seconds: number; arrived: boolean };

export function timeParts(now: Date = new Date()): TimeParts {
  const ms = Math.max(0, meetDate.getTime() - now.getTime());
  return {
    days: Math.floor(ms / DAY),
    hours: Math.floor(ms / 3_600_000) % 24,
    minutes: Math.floor(ms / 60_000) % 60,
    seconds: Math.floor(ms / 1000) % 60,
    arrived: ms === 0,
  };
}
