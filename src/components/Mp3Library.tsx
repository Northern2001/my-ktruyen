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
  const featuredTrack = activeTrack ?? tracks[0] ?? null;
  const featuredIndex = activeIndex ?? 0;

  useEffect(() => () => {
    void audioContextRef.current?.close();
  }, []);

  useEffect(() => {
    const canvas = waveformRef.current;
    if (!canvas || !featuredTrack) return;

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
        const seed = Math.abs(Math.sin((index + 1) * 12.9898 + featuredIndex * 3.17));
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
          : "rgba(255, 255, 255, 0.22)";
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
  }, [currentTime, duration, featuredIndex, featuredTrack, isPlaying]);

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
      {featuredTrack && (
        <div className="mp3-page__ambient" aria-hidden="true">
          <Image key={featuredTrack.imageUrl} src={featuredTrack.imageUrl} alt="" fill sizes="100vw" />
        </div>
      )}

      <header className="mp3-page__header">
        <div className="mp3-page__heading">
          <span className="mp3-page__eyebrow">MKT / LETTERS YOU CAN HEAR</span>
          <h1>Voice notes</h1>
        </div>
        <div className="mp3-page__summary" aria-label="Thông tin thư viện">
          <span>{String(tracks.length).padStart(2, "0")} VOICES</span>
          <span>PRIVATE ARCHIVE</span>
        </div>
      </header>

      {featuredTrack ? (
        <section className="mp3-stage" aria-label={`Voice đang chọn: ${featuredTrack.title}`}>
          <div className={`mp3-stage__artwork ${isPlaying ? "is-playing" : ""}`}>
            <Image
              key={featuredTrack.imageUrl}
              src={featuredTrack.imageUrl}
              alt=""
              fill
              sizes="(max-width: 700px) 84vw, 390px"
              loading={featuredIndex === 0 ? "eager" : "lazy"}
            />
            <span className="mp3-stage__number">V.{String(featuredIndex + 1).padStart(2, "0")}</span>
            <span className="mp3-stage__signal">
              <i aria-hidden="true" />
              {isPlaying ? "ĐANG PHÁT" : "VOICE NOTE"}
            </span>
          </div>

          <div className="mp3-stage__content">
            <div className="mp3-stage__meta">
              <span>{featuredTrack.recordedAt ?? "MỘT KHOẢNH KHẮC"}</span>
              <span>{featuredTrack.mood ?? "TÂM TÌNH"}</span>
            </div>
            <h2>{featuredTrack.title}</h2>
            <p>{featuredTrack.note ?? "Những điều không gửi thành tin nhắn, tôi để lại ở đây bằng giọng nói."}</p>

            <div className="mp3-waveform">
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
            <div className="mp3-stage__time" aria-live="off">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>

            <div className="mp3-stage__controls">
              <button type="button" onClick={() => playRelativeTrack(-1)} aria-label="Voice trước" title="Voice trước">
                <ArrowIcon direction="previous" />
              </button>
              <button type="button" onClick={() => seekBy(-10)} aria-label="Lùi 10 giây" title="Lùi 10 giây">
                <SkipIcon direction="back" />
              </button>
              <button
                className="mp3-stage__play"
                type="button"
                onClick={() => playTrack(featuredIndex)}
                aria-label={isPlaying ? "Tạm dừng" : `Phát ${featuredTrack.title}`}
                title={isPlaying ? "Tạm dừng" : "Phát voice"}
              >
                <PlayIcon isPlaying={isPlaying} />
              </button>
              <button type="button" onClick={() => seekBy(10)} aria-label="Tiến 10 giây" title="Tiến 10 giây">
                <SkipIcon direction="forward" />
              </button>
              <button type="button" onClick={() => playRelativeTrack(1)} aria-label="Voice tiếp theo" title="Voice tiếp theo">
                <ArrowIcon direction="next" />
              </button>
            </div>

            <div className="mp3-stage__utilities">
              <button type="button" onClick={cyclePlaybackRate} aria-label={`Tốc độ phát ${playbackRate}x`} title="Đổi tốc độ phát">
                {playbackRate}x
              </button>
              <span>{featuredTrack.artist}</span>
              <a href={featuredTrack.url} download={featuredTrack.fileName} aria-label={`Tải ${featuredTrack.title}`} title="Tải voice">
                <DownloadIcon />
              </a>
            </div>
          </div>
        </section>
      ) : (
        <section className="mp3-page__empty">
          <span>NO VOICE YET</span>
          <h2>Chưa có lời nào được lưu lại.</h2>
        </section>
      )}

      {tracks.length > 0 && (
        <section className="mp3-archive" aria-label="Danh sách voice">
          <header className="mp3-archive__header">
            <div>
              <span>ARCHIVE / {String(tracks.length).padStart(2, "0")}</span>
              <h2>Những điều đã nói</h2>
            </div>
            <span>GIỌNG NÓI CŨNG LÀ MỘT KỶ NIỆM</span>
          </header>

          <div className="mp3-list">
            {tracks.map((track, index) => {
              const isActive = activeIndex === index;
              const isCurrentPlaying = isActive && isPlaying;

              return (
                <article className={`mp3-track ${isActive ? "is-active" : ""}`} key={track.fileName}>
                  <span className="mp3-track__index">{String(index + 1).padStart(2, "0")}</span>
                  <button
                    className="mp3-track__cover-button"
                    type="button"
                    onClick={() => playTrack(index)}
                    aria-label={`${isCurrentPlaying ? "Tạm dừng" : "Phát"} ${track.title}`}
                  >
                    <Image className="mp3-track__cover" src={track.imageUrl} alt="" width={68} height={68} sizes="68px" />
                    <span className="mp3-track__cover-icon"><PlayIcon isPlaying={isCurrentPlaying} /></span>
                  </button>
                  <button className="mp3-track__identity" type="button" onClick={() => playTrack(index)}>
                    <strong>{track.title}</strong>
                    <span>{track.note ?? "Một đoạn cảm xúc được giữ lại bằng giọng nói."}</span>
                  </button>
                  <span className="mp3-track__mood">{track.mood ?? "TÂM TÌNH"}</span>
                  <span className="mp3-track__date">{track.recordedAt ?? "VOICE NOTE"}</span>
                  <a
                    className="mp3-icon-button"
                    href={track.url}
                    download={track.fileName}
                    aria-label={`Tải ${track.title}`}
                    title="Tải voice"
                  >
                    <DownloadIcon />
                  </a>
                </article>
              );
            })}
          </div>
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
