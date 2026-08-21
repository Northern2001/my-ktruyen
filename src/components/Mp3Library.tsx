"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

export type Mp3Track = {
  fileName: string;
  url: string;
  sizeBytes: number;
  title: string;
  artist: string;
  imageUrl: string;
  order: number;
  mood?: string;
  note?: string;
  recordedAt?: string;
};

const PLAYBACK_RATES = [1, 1.25, 1.5, 0.75] as const;

function formatFileSize(sizeBytes: number) {
  const sizeMb = sizeBytes / 1024 / 1024;
  return sizeMb >= 10 ? `${sizeMb.toFixed(0)} MB` : `${sizeMb.toFixed(1)} MB`;
}

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return "00:00";
  const minutes = Math.floor(seconds / 60).toString().padStart(2, "0");
  const remainingSeconds = Math.floor(seconds % 60).toString().padStart(2, "0");
  return `${minutes}:${remainingSeconds}`;
}

function PlayIcon({ isPlaying }: { isPlaying: boolean }) {
  return isPlaying ? (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M8 6v12M16 6v12" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m9 6 9 6-9 6z" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 3v12m-5-5 5 5 5-5M5 20h14" />
    </svg>
  );
}

function SkipIcon({ direction }: { direction: "back" | "forward" }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d={direction === "back" ? "M5 8V4m0 0h4M5 4l3 3" : "M19 8V4m0 0h-4m4 0-3 3"} />
      <path d="M7.1 17.2A7.5 7.5 0 1 0 6 8.6" />
      <text x="12" y="16" textAnchor="middle">10</text>
    </svg>
  );
}

function ArrowIcon({ direction }: { direction: "previous" | "next" }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      {direction === "previous" ? (
        <path d="M6 5v14m12-13-9 6 9 6z" />
      ) : (
        <path d="M18 5v14M6 6l9 6-9 6z" />
      )}
    </svg>
  );
}

export function Mp3Library({ tracks }: { tracks: readonly Mp3Track[] }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const waveformRef = useRef<HTMLCanvasElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const [playbackError, setPlaybackError] = useState<string | null>(null);

  const activeTrack = activeIndex == null ? null : tracks[activeIndex];
  const totalSize = tracks.reduce((total, track) => total + track.sizeBytes, 0);

  useEffect(() => () => {
    void audioContextRef.current?.close();
  }, []);

  useEffect(() => {
    const canvas = waveformRef.current;
    if (!canvas || !activeTrack || activeIndex == null) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    let animationFrame = 0;
    let frequencyData: Uint8Array<ArrayBuffer> | null = null;
    if (analyserRef.current) {
      frequencyData = new Uint8Array(new ArrayBuffer(analyserRef.current.frequencyBinCount));
    }

    const draw = () => {
      const bounds = canvas.getBoundingClientRect();
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      const width = Math.max(1, Math.floor(bounds.width));
      const height = Math.max(1, Math.floor(bounds.height));

      if (canvas.width !== width * pixelRatio || canvas.height !== height * pixelRatio) {
        canvas.width = width * pixelRatio;
        canvas.height = height * pixelRatio;
      }

      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      context.clearRect(0, 0, width, height);

      const analyser = analyserRef.current;
      if (isPlaying && analyser && frequencyData) analyser.getByteFrequencyData(frequencyData);

      const barGap = width < 540 ? 3 : 4;
      const barWidth = width < 540 ? 2 : 3;
      const barCount = Math.max(24, Math.floor(width / (barWidth + barGap)));
      const elapsed = audioRef.current?.currentTime ?? currentTime;
      const progress = duration > 0 ? Math.min(1, elapsed / duration) : 0;

      for (let index = 0; index < barCount; index += 1) {
        const seed = Math.abs(Math.sin((index + 1) * 12.9898 + activeIndex * 3.17));
        const idleAmplitude = 0.2 + seed * 0.62;
        const frequencyIndex = frequencyData
          ? Math.min(frequencyData.length - 1, Math.floor((index / barCount) * frequencyData.length * 0.55))
          : 0;
        const liveAmplitude = frequencyData && isPlaying
          ? Math.max(0.16, frequencyData[frequencyIndex] / 255)
          : idleAmplitude;
        const barHeight = Math.max(3, liveAmplitude * height * 0.88);
        const x = index * (barWidth + barGap);
        const y = (height - barHeight) / 2;

        context.fillStyle = index / barCount <= progress
          ? "rgba(185, 68, 73, 0.98)"
          : "rgba(255, 255, 255, 0.2)";
        context.fillRect(x, y, barWidth, barHeight);
      }

      if (isPlaying) animationFrame = window.requestAnimationFrame(draw);
    };

    draw();
    const resizeObserver = new ResizeObserver(draw);
    resizeObserver.observe(canvas);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      resizeObserver.disconnect();
    };
  }, [activeIndex, activeTrack, currentTime, duration, isPlaying]);

  const prepareVisualizer = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (!audioContextRef.current) {
      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaElementSource(audio);

      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.82;
      source.connect(analyser);
      analyser.connect(audioContext.destination);
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
    }

    if (audioContextRef.current.state === "suspended") {
      void audioContextRef.current.resume();
    }
  };

  const playTrack = (index: number) => {
    const audio = audioRef.current;
    const track = tracks[index];
    if (!audio || !track) return;

    prepareVisualizer();
    setPlaybackError(null);
    if (activeIndex === index && !audio.paused) {
      audio.pause();
      return;
    }

    if (activeIndex !== index) {
      audio.src = track.url;
      audio.load();
      audio.playbackRate = playbackRate;
      setActiveIndex(index);
      setCurrentTime(0);
      setDuration(0);
    }

    void audio.play().catch(() => {
      setIsPlaying(false);
      setPlaybackError(`Không thể phát “${track.title}”.`);
    });
  };

  const playRelativeTrack = (offset: number) => {
    if (tracks.length === 0) return;
    const currentIndex = activeIndex ?? 0;
    const nextIndex = (currentIndex + offset + tracks.length) % tracks.length;
    playTrack(nextIndex);
  };

  const seekBy = (seconds: number) => {
    const audio = audioRef.current;
    if (!audio || !Number.isFinite(audio.duration)) return;
    const nextTime = Math.min(audio.duration, Math.max(0, audio.currentTime + seconds));
    audio.currentTime = nextTime;
    setCurrentTime(nextTime);
  };

  const cyclePlaybackRate = () => {
    const currentRateIndex = PLAYBACK_RATES.indexOf(playbackRate as (typeof PLAYBACK_RATES)[number]);
    const nextRate = PLAYBACK_RATES[(currentRateIndex + 1) % PLAYBACK_RATES.length];
    if (audioRef.current) audioRef.current.playbackRate = nextRate;
    setPlaybackRate(nextRate);
  };

  return (
    <main className="mp3-page">
      <header className="mp3-page__header">
        <div className="mp3-page__heading">
          <span className="mp3-page__eyebrow">MKT / AUDIO COLLECTION</span>
          <h1>Album list</h1>
        </div>
        <div className="mp3-page__summary" aria-label="Thông tin thư viện">
          <span>{String(tracks.length).padStart(2, "0")} TRACKS</span>
          <span>{formatFileSize(totalSize)}</span>
        </div>
      </header>

      {tracks.length > 0 ? (
        <section className="mp3-album-list" aria-label="Danh sách album">
          <div className="mp3-list__header" aria-hidden="true">
            <span>NO.</span>
            <span>ALBUM / TRACK</span>
            <span>ARTIST</span>
            <span>FORMAT</span>
            <span>ACTIONS</span>
          </div>

          {tracks.map((track, index) => {
            const isActive = activeIndex === index;
            const isCurrentPlaying = isActive && isPlaying;

            return (
              <article className={`mp3-track ${isActive ? "is-active" : ""}`} key={track.fileName}>
                <div className="mp3-track__row">
                  <span className="mp3-track__index">{String(index + 1).padStart(2, "0")}</span>
                  <button
                    className="mp3-track__cover-button"
                    type="button"
                    onClick={() => playTrack(index)}
                    aria-label={`${isCurrentPlaying ? "Tạm dừng" : "Phát"} ${track.title}`}
                  >
                    <Image className="mp3-track__cover" src={track.imageUrl} alt="" width={72} height={72} sizes="72px" />
                    <span className="mp3-track__cover-icon"><PlayIcon isPlaying={isCurrentPlaying} /></span>
                  </button>
                  <button className="mp3-track__identity" type="button" onClick={() => playTrack(index)}>
                    <strong>{track.title}</strong>
                    <span title={track.fileName}>{track.fileName}</span>
                  </button>
                  <span className="mp3-track__artist">{track.artist}</span>
                  <span className="mp3-track__format">MP3 / {formatFileSize(track.sizeBytes)}</span>
                  <div className="mp3-track__actions">
                    <button
                      className="mp3-icon-button mp3-track__play"
                      type="button"
                      onClick={() => playTrack(index)}
                      aria-label={`${isCurrentPlaying ? "Tạm dừng" : "Phát"} ${track.title}`}
                      title={isCurrentPlaying ? "Tạm dừng" : "Phát"}
                    >
                      <PlayIcon isPlaying={isCurrentPlaying} />
                    </button>
                    <a
                      className="mp3-icon-button"
                      href={track.url}
                      download={track.fileName}
                      aria-label={`Tải ${track.title}`}
                      title="Tải MP3"
                    >
                      <DownloadIcon />
                    </a>
                  </div>
                </div>

                {isActive && (
                  <div className="mp3-track__player" aria-label={`Trình phát ${track.title}`}>
                    <div className="mp3-track__waveform">
                      <canvas ref={waveformRef} aria-hidden="true" />
                      <input
                        type="range"
                        min="0"
                        max={duration || 0}
                        step="0.1"
                        value={Math.min(currentTime, duration || 0)}
                        onChange={(event) => {
                          const nextTime = Number(event.currentTarget.value);
                          if (audioRef.current) audioRef.current.currentTime = nextTime;
                          setCurrentTime(nextTime);
                        }}
                        aria-label="Vị trí phát"
                      />
                    </div>
                    <div className="mp3-track__time" aria-live="off">
                      <span>{formatTime(currentTime)}</span>
                      <span>{formatTime(duration)}</span>
                    </div>
                    <div className="mp3-track__controls">
                      <button type="button" onClick={() => playRelativeTrack(-1)} aria-label="Bài trước" title="Bài trước">
                        <ArrowIcon direction="previous" />
                      </button>
                      <button type="button" onClick={() => seekBy(-10)} aria-label="Lùi 10 giây" title="Lùi 10 giây">
                        <SkipIcon direction="back" />
                      </button>
                      <button
                        className="mp3-track__primary-control"
                        type="button"
                        onClick={() => playTrack(index)}
                        aria-label={isPlaying ? "Tạm dừng" : `Phát ${track.title}`}
                        title={isPlaying ? "Tạm dừng" : "Phát"}
                      >
                        <PlayIcon isPlaying={isPlaying} />
                      </button>
                      <button type="button" onClick={() => seekBy(10)} aria-label="Tiến 10 giây" title="Tiến 10 giây">
                        <SkipIcon direction="forward" />
                      </button>
                      <button type="button" onClick={() => playRelativeTrack(1)} aria-label="Bài tiếp theo" title="Bài tiếp theo">
                        <ArrowIcon direction="next" />
                      </button>
                    </div>
                    <button
                      className="mp3-track__rate"
                      type="button"
                      onClick={cyclePlaybackRate}
                      aria-label={`Tốc độ phát ${playbackRate}x`}
                      title="Đổi tốc độ phát"
                    >
                      {playbackRate}x
                    </button>
                  </div>
                )}
              </article>
            );
          })}
        </section>
      ) : (
        <section className="mp3-page__empty">
          <span>NO ALBUM YET</span>
          <h2>Chưa có album nào trong danh sách.</h2>
        </section>
      )}

      {playbackError && <p className="mp3-page__error" role="alert">{playbackError}</p>}

      <audio
        ref={audioRef}
        preload="metadata"
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onLoadedMetadata={(event) => setDuration(event.currentTarget.duration)}
        onDurationChange={(event) => setDuration(event.currentTarget.duration)}
        onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
        onEnded={() => playRelativeTrack(1)}
      />
    </main>
  );
}
