"use client";

import Image from "next/image";
import { useRef, useState } from "react";

export type Mp3Track = {
  fileName: string;
  url: string;
  sizeBytes: number;
  title: string;
  artist: string;
  imageUrl: string;
  order: number;
};

function formatFileSize(sizeBytes: number) {
  const sizeMb = sizeBytes / 1024 / 1024;
  return sizeMb >= 10 ? `${sizeMb.toFixed(0)} MB` : `${sizeMb.toFixed(1)} MB`;
}

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const minutes = Math.floor(seconds / 60);
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

export function Mp3Library({ tracks }: { tracks: readonly Mp3Track[] }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackError, setPlaybackError] = useState<string | null>(null);

  const activeTrack = activeIndex == null ? null : tracks[activeIndex];
  const totalSize = tracks.reduce((total, track) => total + track.sizeBytes, 0);

  const playTrack = (index: number) => {
    const audio = audioRef.current;
    const track = tracks[index];
    if (!audio || !track) return;

    setPlaybackError(null);
    if (activeIndex === index && !audio.paused) {
      audio.pause();
      return;
    }

    if (activeIndex !== index) {
      audio.src = track.url;
      audio.load();
      setActiveIndex(index);
      setCurrentTime(0);
      setDuration(0);
    }

    void audio.play().catch(() => {
      setIsPlaying(false);
      setPlaybackError(`Không thể phát ${track.title}.`);
    });
  };

  const playRelativeTrack = (offset: number) => {
    if (tracks.length === 0) return;
    const currentIndex = activeIndex ?? 0;
    const nextIndex = (currentIndex + offset + tracks.length) % tracks.length;
    playTrack(nextIndex);
  };

  const handleEnded = () => {
    if (activeIndex == null || tracks.length === 0) return;
    playRelativeTrack(1);
  };

  return (
    <main className={`mp3-page ${activeTrack ? "has-player" : ""}`}>
      <header className="mp3-page__header">
        <div className="mp3-page__heading">
          <span className="mp3-page__eyebrow">MKT / AUDIO ARCHIVE</span>
          <h1>MP3</h1>
        </div>
        <div className="mp3-page__summary" aria-label="Thông tin thư viện">
          <span>{String(tracks.length).padStart(2, "0")} FILES</span>
          <span>{formatFileSize(totalSize)}</span>
        </div>
      </header>

      <section className="mp3-list" aria-label="Danh sách MP3">
        <div className="mp3-list__header" aria-hidden="true">
          <span>NO.</span>
          <span>TRACK</span>
          <span>FILE</span>
          <span>SIZE</span>
          <span>ACTIONS</span>
        </div>

        {tracks.map((track, index) => {
          const isActive = activeIndex === index;
          const isCurrentPlaying = isActive && isPlaying;

          return (
            <article className={`mp3-track ${isActive ? "is-active" : ""}`} key={track.fileName}>
              <span className="mp3-track__index">{String(index + 1).padStart(2, "0")}</span>
              <Image
                className="mp3-track__cover"
                src={track.imageUrl}
                alt=""
                width={58}
                height={58}
                sizes="58px"
              />
              <div className="mp3-track__identity">
                <strong>{track.title}</strong>
                <span>{track.artist}</span>
              </div>
              <span className="mp3-track__filename" title={track.fileName}>{track.fileName}</span>
              <span className="mp3-track__size">{formatFileSize(track.sizeBytes)}</span>
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
            </article>
          );
        })}
      </section>

      {playbackError && <p className="mp3-page__error" role="alert">{playbackError}</p>}

      {activeTrack && (
        <footer className="mp3-player" aria-label="Trình phát MP3">
          <Image src={activeTrack.imageUrl} alt="" width={48} height={48} sizes="48px" />
          <div className="mp3-player__identity">
            <strong>{activeTrack.title}</strong>
            <span>{activeTrack.artist}</span>
          </div>
          <div className="mp3-player__controls">
            <button type="button" onClick={() => playRelativeTrack(-1)} aria-label="Bài trước" title="Bài trước">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 5v14m12-13-9 6 9 6z" /></svg>
            </button>
            <button
              className="mp3-player__play"
              type="button"
              onClick={() => playTrack(activeIndex ?? 0)}
              aria-label={isPlaying ? "Tạm dừng" : "Tiếp tục phát"}
              title={isPlaying ? "Tạm dừng" : "Phát"}
            >
              <PlayIcon isPlaying={isPlaying} />
            </button>
            <button type="button" onClick={() => playRelativeTrack(1)} aria-label="Bài tiếp theo" title="Bài tiếp theo">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 5v14M6 6l9 6-9 6z" /></svg>
            </button>
          </div>
          <div className="mp3-player__timeline">
            <span>{formatTime(currentTime)}</span>
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
            <span>{formatTime(duration)}</span>
          </div>
          <a
            className="mp3-icon-button mp3-player__download"
            href={activeTrack.url}
            download={activeTrack.fileName}
            aria-label={`Tải ${activeTrack.title}`}
            title="Tải MP3"
          >
            <DownloadIcon />
          </a>
        </footer>
      )}

      <audio
        ref={audioRef}
        preload="metadata"
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onLoadedMetadata={(event) => setDuration(event.currentTarget.duration)}
        onDurationChange={(event) => setDuration(event.currentTarget.duration)}
        onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
        onEnded={handleEnded}
      />
    </main>
  );
}
