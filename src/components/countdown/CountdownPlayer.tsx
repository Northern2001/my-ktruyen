"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { sitePath } from "@/lib/site-path";
import { waitingSongs } from "@/lib/countdownPlaylist";
import { useMediaPlayback } from "../MediaPlaybackCoordinator";
import styles from "./CountdownPlayer.module.css";

const STORAGE_KEY = "countdown-song";
const DEFAULT_TITLE = "ĐỢI";

const fmt = (s: number) => {
  if (!Number.isFinite(s) || s < 0) return "0:00";
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
};

const audioSrc = (url: string) => encodeURI(sitePath(url));

export function CountdownPlayer() {
  const { beginMediaPlayback, endMediaPlayback } = useMediaPlayback();
  const audioRef = useRef<HTMLAudioElement>(null);
  const [index, setIndex] = useState(() => Math.max(0, waitingSongs.findIndex((s) => s.title === DEFAULT_TITLE)));
  const [playing, setPlaying] = useState(false);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [shuffle, setShuffle] = useState(false);
  const [loop, setLoop] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [bars] = useState(() => Array.from({ length: 5 }, (_, i) => i));

  const song = waitingSongs[index];

  // Restore the song chosen last time.
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      const i = waitingSongs.findIndex((s) => s.url === saved);
      if (i >= 0) window.setTimeout(() => setIndex(i), 0);
    } catch {
      /* storage unavailable */
    }
  }, []);

  useEffect(() => () => endMediaPlayback("countdown-music"), [endMediaPlayback]);

  const choose = useCallback((i: number, autoplay = true) => {
    setIndex(i);
    setTime(0);
    try {
      window.localStorage.setItem(STORAGE_KEY, waitingSongs[i].url);
    } catch {
      /* ignore */
    }
    if (autoplay) {
      window.setTimeout(() => {
        const a = audioRef.current;
        if (!a) return;
        beginMediaPlayback("countdown-music");
        void a.play().catch(() => setPlaying(false));
      }, 0);
    }
  }, [beginMediaPlayback]);

  const toggle = () => {
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) {
      beginMediaPlayback("countdown-music");
      void a.play().catch(() => setPlaying(false));
    } else {
      a.pause();
    }
  };

  const step = useCallback((dir: 1 | -1) => {
    const n = waitingSongs.length;
    const next = shuffle ? Math.floor(Math.random() * n) : (index + dir + n) % n;
    choose(next);
  }, [choose, index, shuffle]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return waitingSongs
      .map((s, i) => ({ s, i }))
      .filter(({ s }) => !q || `${s.title} ${s.artist}`.toLowerCase().includes(q));
  }, [query]);

  return (
    <>
      <audio
        ref={audioRef}
        src={audioSrc(song.url)}
        preload="metadata"
        loop={loop}
        onPlay={() => setPlaying(true)}
        onPause={() => {
          setPlaying(false);
          endMediaPlayback("countdown-music");
        }}
        onEnded={() => step(1)}
        onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
      />

      <div className={`${styles.bar} ${playing ? styles.playing : ""}`}>
        <button type="button" className={styles.disc} onClick={() => setOpen(true)} aria-label="Chọn bài nhạc chờ">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={sitePath(song.cover)} alt="" />
          <i />
        </button>

        <div className={styles.meta} onClick={() => setOpen(true)}>
          <b>{song.title}</b>
          <span>{song.artist}</span>
          <div className={styles.eq} aria-hidden>
            {bars.map((b) => <u key={b} style={{ animationDelay: `${b * -0.25}s` }} />)}
          </div>
        </div>

        <button type="button" className={styles.ctl} onClick={() => step(-1)} aria-label="Bài trước">⏮</button>
        <button type="button" className={`${styles.ctl} ${styles.main}`} onClick={toggle} aria-label={playing ? "Tạm dừng" : "Phát"}>
          {playing ? "❚❚" : "▶"}
        </button>
        <button type="button" className={styles.ctl} onClick={() => step(1)} aria-label="Bài sau">⏭</button>

        <div
          className={styles.progress}
          style={{ ["--p" as string]: duration ? `${(time / duration) * 100}%` : "0%" }}
        />
      </div>

      {open && (
        <div className={styles.sheetWrap} role="dialog" aria-modal="true" aria-label="Chọn bài nhạc chờ">
          <button type="button" className={styles.backdrop} onClick={() => setOpen(false)} aria-label="Đóng" />
          <div className={styles.sheet}>
            <header>
              <h2>🎧 Chọn bài đợi nhau</h2>
              <button type="button" onClick={() => setOpen(false)} aria-label="Đóng">✕</button>
            </header>

            <div className={styles.now}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={sitePath(song.cover)} alt="" className={playing ? styles.spin : ""} />
              <div>
                <b>{song.title}</b>
                <span>{song.artist}</span>
                <input
                  type="range"
                  min={0}
                  max={duration || 0}
                  step={0.5}
                  value={Math.min(time, duration || 0)}
                  onChange={(e) => {
                    const a = audioRef.current;
                    if (a) a.currentTime = Number(e.target.value);
                  }}
                  aria-label="Tua bài"
                />
                <small>{fmt(time)} / {fmt(duration)}</small>
              </div>
            </div>

            <div className={styles.modes}>
              <button type="button" aria-pressed={shuffle} onClick={() => setShuffle((v) => !v)}>🔀 Ngẫu nhiên</button>
              <button type="button" aria-pressed={loop} onClick={() => setLoop((v) => !v)}>🔁 Lặp bài</button>
            </div>

            <input
              className={styles.search}
              placeholder="Tìm bài hát…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />

            <ul>
              {filtered.map(({ s, i }) => (
                <li key={s.url}>
                  <button type="button" className={i === index ? styles.active : ""} onClick={() => choose(i)}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={sitePath(s.cover)} alt="" loading="lazy" />
                    <span><b>{s.title}</b><em>{s.artist}</em></span>
                    {i === index && playing ? <span className={styles.mini}>♪</span> : null}
                  </button>
                </li>
              ))}
              {filtered.length === 0 && <li className={styles.empty}>Không tìm thấy bài nào</li>}
            </ul>
          </div>
        </div>
      )}
    </>
  );
}
