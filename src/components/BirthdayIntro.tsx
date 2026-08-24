"use client";

import Image from "next/image";
import { type FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { requestAlbumTrackPlayback } from "../lib/media-events";
import { sitePath } from "../lib/site-path";
import styles from "./BirthdayIntro.module.css";

const birthdaySessionKey = "mkt-birthday-intro-2026";
const birthdayCompletedKey = "mkt-birthday-intro-completed-2026";
const birthdayGateKey = "mkt-birthday-preview-unlocked-2026";
const birthdayPassword = "emyeuanhphuongbac";
const birthdayUnlockAt = Date.UTC(2026, 7, 25, 17);
const birthdayHomeTrackIndex = 1;

type IntroScene = "wish" | "cake" | "contents" | "video";
type GateStatus = "checking" | "locked" | "unlocking" | "unlocked";
type MicrophoneState = "idle" | "requesting" | "listening" | "unavailable";

type FireworkParticle = {
  x: number;
  y: number;
  previousX: number;
  previousY: number;
  velocityX: number;
  velocityY: number;
  gravity: number;
  drag: number;
  life: number;
  maximumLife: number;
  size: number;
  color: string;
};

type FireworkRing = {
  x: number;
  y: number;
  radius: number;
  opacity: number;
  color: string;
};

type FireworkRocket = {
  x: number;
  y: number;
  previousX: number;
  previousY: number;
  velocityX: number;
  velocityY: number;
  life: number;
  targetX: number;
  targetY: number;
  colorOffset: number;
  energy: number;
  color: string;
};

function getCountdownParts(remainingMs: number | null) {
  if (remainingMs == null) {
    return [
      { label: "NGÀY", value: "--" },
      { label: "GIỜ", value: "--" },
      { label: "PHÚT", value: "--" },
      { label: "GIÂY", value: "--" },
    ];
  }

  const totalSeconds = Math.max(0, Math.floor(remainingMs / 1000));
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return [
    { label: "NGÀY", value: String(days).padStart(2, "0") },
    { label: "GIỜ", value: String(hours).padStart(2, "0") },
    { label: "PHÚT", value: String(minutes).padStart(2, "0") },
    { label: "GIÂY", value: String(seconds).padStart(2, "0") },
  ];
}

function playClickSound() {
  window.dispatchEvent(new Event("mkt-click"));
}

function launchFireworks(canvas: HTMLCanvasElement, reducedMotion: boolean) {
  const context = canvas.getContext("2d");
  if (!context) return () => {};

  const colors = ["#f5d88f", "#fff8df", "#b8323b", "#d47263", "#a8c5d0"];
  const rockets: FireworkRocket[] = [];
  const particles: FireworkParticle[] = [];
  const rings: FireworkRing[] = [];
  const timers: number[] = [];
  let canvasWidth = 0;
  let canvasHeight = 0;
  let animationFrame = 0;
  let animationEnd = 0;
  let stopped = false;

  const resize = () => {
    const rect = canvas.getBoundingClientRect();
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    canvasWidth = rect.width;
    canvasHeight = rect.height;
    canvas.width = Math.round(canvasWidth * pixelRatio);
    canvas.height = Math.round(canvasHeight * pixelRatio);
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  };

  const addBurst = (xRatio: number, yRatio: number, colorOffset: number, energy: number) => {
    const x = canvasWidth * xRatio;
    const y = canvasHeight * yRatio;
    const count = reducedMotion ? 24 : Math.round(78 * energy);

    if (energy >= 0.94) {
      rings.push({
        x,
        y,
        radius: 3,
        opacity: 0.76,
        color: colors[colorOffset % colors.length],
      });
    }

    for (let index = 0; index < count; index += 1) {
      const angle = (Math.PI * 2 * index) / count + Math.random() * 0.08;
      const speed = (2.2 + Math.random() * 4.8) * energy;
      const life = 78 + Math.random() * 42;
      particles.push({
        x,
        y,
        previousX: x,
        previousY: y,
        velocityX: Math.cos(angle) * speed,
        velocityY: Math.sin(angle) * speed,
        gravity: 0.028 + Math.random() * 0.024,
        drag: 0.984 + Math.random() * 0.007,
        life,
        maximumLife: life,
        size: 1 + Math.random() * 1.7,
        color: colors[(index + colorOffset) % colors.length],
      });
    }
  };

  const launchRocket = (xRatio: number, yRatio: number, colorOffset: number, energy: number) => {
    const targetX = canvasWidth * xRatio;
    const targetY = canvasHeight * yRatio;
    const duration = reducedMotion ? 12 : 30 + Math.round(Math.random() * 12);
    const startX = targetX + (Math.random() - 0.5) * canvasWidth * 0.13;
    const startY = canvasHeight + 18;
    rockets.push({
      x: startX,
      y: startY,
      previousX: startX,
      previousY: startY,
      velocityX: (targetX - startX) / duration,
      velocityY: (targetY - startY) / duration,
      life: duration,
      targetX,
      targetY,
      colorOffset,
      energy,
      color: colors[colorOffset % colors.length],
    });
  };

  const draw = () => {
    if (stopped) return;

    context.clearRect(0, 0, canvasWidth, canvasHeight);
    context.globalCompositeOperation = "lighter";

    for (let index = rockets.length - 1; index >= 0; index -= 1) {
      const rocket = rockets[index];
      rocket.previousX = rocket.x;
      rocket.previousY = rocket.y;
      rocket.x += rocket.velocityX;
      rocket.y += rocket.velocityY;
      rocket.life -= 1;

      context.globalAlpha = 0.95;
      context.strokeStyle = rocket.color;
      context.shadowColor = rocket.color;
      context.shadowBlur = 12;
      context.lineWidth = 2;
      context.beginPath();
      context.moveTo(rocket.previousX, rocket.previousY + 12);
      context.lineTo(rocket.x, rocket.y);
      context.stroke();
      context.beginPath();
      context.arc(rocket.x, rocket.y, 2.4, 0, Math.PI * 2);
      context.fillStyle = "#fff8df";
      context.fill();

      if (rocket.life <= 0) {
        addBurst(
          rocket.targetX / canvasWidth,
          rocket.targetY / canvasHeight,
          rocket.colorOffset,
          rocket.energy,
        );
        rockets.splice(index, 1);
      }
    }

    for (let index = rings.length - 1; index >= 0; index -= 1) {
      const ring = rings[index];
      ring.radius += 2.7;
      ring.opacity *= 0.91;
      context.globalAlpha = ring.opacity;
      context.strokeStyle = ring.color;
      context.lineWidth = 1;
      context.beginPath();
      context.arc(ring.x, ring.y, ring.radius, 0, Math.PI * 2);
      context.stroke();
      if (ring.opacity < 0.035) rings.splice(index, 1);
    }

    for (let index = particles.length - 1; index >= 0; index -= 1) {
      const particle = particles[index];
      particle.previousX = particle.x;
      particle.previousY = particle.y;
      particle.velocityX *= particle.drag;
      particle.velocityY = particle.velocityY * particle.drag + particle.gravity;
      particle.x += particle.velocityX;
      particle.y += particle.velocityY;
      particle.life -= 1;

      const opacity = Math.max(0, particle.life / particle.maximumLife);
      context.globalAlpha = opacity;
      context.strokeStyle = particle.color;
      context.shadowColor = particle.color;
      context.shadowBlur = 7;
      context.lineWidth = particle.size;
      context.beginPath();
      context.moveTo(particle.previousX, particle.previousY);
      context.lineTo(particle.x, particle.y);
      context.stroke();

      if (index % 7 === 0) {
        context.beginPath();
        context.arc(particle.x, particle.y, particle.size * 0.8, 0, Math.PI * 2);
        context.fillStyle = particle.color;
        context.fill();
      }

      if (particle.life <= 0) particles.splice(index, 1);
    }

    context.globalAlpha = 1;
    context.shadowBlur = 0;
    context.globalCompositeOperation = "source-over";

    if (rockets.length || particles.length || rings.length || Date.now() < animationEnd) {
      animationFrame = window.requestAnimationFrame(draw);
    } else {
      animationFrame = 0;
    }
  };

  resize();
  window.addEventListener("resize", resize);
  animationEnd = Date.now() + (reducedMotion ? 1800 : 6200);

  const sequence: Array<[number, number, number, number, number]> = reducedMotion
    ? [
        [0, 0.22, 0.25, 0, 0.8],
        [380, 0.76, 0.22, 2, 0.8],
        [760, 0.5, 0.18, 1, 0.9],
      ]
    : [
        [0, 0.2, 0.25, 0, 0.9],
        [260, 0.78, 0.2, 2, 0.95],
        [560, 0.48, 0.16, 1, 1.12],
        [910, 0.12, 0.48, 3, 0.78],
        [1180, 0.88, 0.44, 0, 0.82],
        [1580, 0.33, 0.34, 4, 0.95],
        [1940, 0.69, 0.31, 1, 1.04],
        [2420, 0.5, 0.23, 2, 1.18],
      ];

  sequence.forEach(([delay, x, y, colorOffset, energy]) => {
    timers.push(window.setTimeout(() => launchRocket(x, y, colorOffset, energy), delay));
  });
  animationFrame = window.requestAnimationFrame(draw);

  return () => {
    stopped = true;
    timers.forEach((timer) => window.clearTimeout(timer));
    if (animationFrame) window.cancelAnimationFrame(animationFrame);
    window.removeEventListener("resize", resize);
    context.clearRect(0, 0, canvasWidth, canvasHeight);
  };
}

export function BirthdayIntro() {
  const [isVisible, setIsVisible] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const [gateStatus, setGateStatus] = useState<GateStatus>("checking");
  const [remainingMs, setRemainingMs] = useState<number | null>(null);
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [scene, setScene] = useState<IntroScene>("wish");
  const [isBlowing, setIsBlowing] = useState(false);
  const [isBlown, setIsBlown] = useState(false);
  const [microphoneState, setMicrophoneState] = useState<MicrophoneState>("idle");

  const stageRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const openButtonRef = useRef<HTMLButtonElement>(null);
  const blowButtonRef = useRef<HTMLButtonElement>(null);
  const enterButtonRef = useRef<HTMLButtonElement>(null);
  const siteButtonRef = useRef<HTMLButtonElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const microphoneFrameRef = useRef(0);
  const blowTimerRef = useRef(0);
  const gateTimerRef = useRef(0);
  const exitTimerRef = useRef(0);
  const fireworksCleanupRef = useRef<(() => void) | null>(null);
  const isBlowingRef = useRef(false);
  const isBlownRef = useRef(false);

  const stopMicrophone = useCallback(() => {
    if (microphoneFrameRef.current) {
      window.cancelAnimationFrame(microphoneFrameRef.current);
      microphoneFrameRef.current = 0;
    }
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    mediaStreamRef.current = null;
    if (audioContextRef.current) {
      void audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
  }, []);

  const startBlowSequence = useCallback(() => {
    if (isBlowingRef.current || isBlownRef.current) return;

    stopMicrophone();
    isBlowingRef.current = true;
    setMicrophoneState("idle");
    setIsBlowing(true);
    playClickSound();

    blowTimerRef.current = window.setTimeout(() => {
      const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      isBlowingRef.current = false;
      isBlownRef.current = true;
      setIsBlowing(false);
      setIsBlown(true);
      if (canvasRef.current) {
        fireworksCleanupRef.current?.();
        fireworksCleanupRef.current = launchFireworks(canvasRef.current, reducedMotion);
      }
    }, window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 120 : 940);
  }, [stopMicrophone]);

  const requestMicrophone = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setMicrophoneState("unavailable");
      startBlowSequence();
      return;
    }

    setMicrophoneState("requesting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          autoGainControl: false,
          echoCancellation: false,
          noiseSuppression: false,
        },
      });
      const AudioContextClass = window.AudioContext
        ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) throw new Error("AudioContext is unavailable");

      const audioContext = new AudioContextClass();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.5;
      source.connect(analyser);
      await audioContext.resume();

      mediaStreamRef.current = stream;
      audioContextRef.current = audioContext;
      setMicrophoneState("listening");

      const samples = new Uint8Array(analyser.fftSize);
      const listeningStartedAt = performance.now();
      let strongFrames = 0;

      const detectBlow = () => {
        analyser.getByteTimeDomainData(samples);
        let sum = 0;
        for (const sample of samples) {
          const normalized = (sample - 128) / 128;
          sum += normalized * normalized;
        }
        const volume = Math.sqrt(sum / samples.length);
        if (performance.now() - listeningStartedAt > 450 && volume > 0.09) {
          strongFrames += 1;
        } else {
          strongFrames = Math.max(0, strongFrames - 1);
        }

        if (strongFrames >= 4) {
          startBlowSequence();
          return;
        }
        microphoneFrameRef.current = window.requestAnimationFrame(detectBlow);
      };

      microphoneFrameRef.current = window.requestAnimationFrame(detectBlow);
    } catch {
      stopMicrophone();
      setMicrophoneState("unavailable");
      startBlowSequence();
    }
  }, [startBlowSequence, stopMicrophone]);

  const handleBlowButton = () => {
    if (microphoneState === "requesting") return;
    if (microphoneState === "listening" || microphoneState === "unavailable") {
      startBlowSequence();
      return;
    }
    playClickSound();
    void requestMicrophone();
  };

  const exitIntro = useCallback((completed: boolean) => {
    stopMicrophone();
    videoRef.current?.pause();
    requestAlbumTrackPlayback(birthdayHomeTrackIndex);
    fireworksCleanupRef.current?.();
    fireworksCleanupRef.current = null;
    try {
      window.sessionStorage.setItem(birthdaySessionKey, "seen");
      if (completed) {
        window.localStorage.setItem(birthdayCompletedKey, "seen");
      }
    } catch {
    }
    setIsExiting(true);
    exitTimerRef.current = window.setTimeout(() => setIsVisible(false), 650);
  }, [stopMicrophone]);

  const handleSkipIntro = () => {
    playClickSound();
    exitIntro(false);
  };

  const handleVideoEnded = () => {
    exitIntro(true);
  };

  const handleOpenGift = () => {
    playClickSound();
    setScene("cake");
  };

  const handleShowContents = () => {
    playClickSound();
    fireworksCleanupRef.current?.();
    fireworksCleanupRef.current = null;
    setScene("contents");
  };

  const handleStartVideo = () => {
    playClickSound();
    setScene("video");
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      void videoRef.current.play().catch(() => {});
    }
  };

  const handleReplay = () => {
    playClickSound();
    window.clearTimeout(blowTimerRef.current);
    stopMicrophone();
    fireworksCleanupRef.current?.();
    fireworksCleanupRef.current = null;
    isBlowingRef.current = false;
    isBlownRef.current = false;
    setMicrophoneState("idle");
    setIsBlowing(false);
    setIsBlown(false);
    setScene("wish");
  };

  const revealBirthday = useCallback(() => {
    window.clearTimeout(gateTimerRef.current);
    setGateStatus("unlocking");
    gateTimerRef.current = window.setTimeout(() => {
      setGateStatus("unlocked");
      try {
        if (
          window.localStorage.getItem(birthdayCompletedKey) === "seen"
          || window.sessionStorage.getItem(birthdaySessionKey) === "seen"
        ) {
          setIsVisible(false);
          requestAlbumTrackPlayback(birthdayHomeTrackIndex);
        }
      } catch {
      }
    }, 720);
  }, []);

  const handlePasswordSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    playClickSound();

    if (password.trim() !== birthdayPassword) {
      setPasswordError("Mật khẩu chưa đúng. Thử lại nhé.");
      setPassword("");
      window.requestAnimationFrame(() => passwordInputRef.current?.focus());
      return;
    }

    try {
      window.localStorage.setItem(birthdayGateKey, "unlocked");
    } catch {
    }
    setPasswordError(null);
    setPassword("");
    revealBirthday();
  };

  useEffect(() => {
    let initializeFrame = 0;
    let countdownInterval = 0;
    let isPreviewUnlocked = false;
    let hasSeenIntro = false;

    try {
      isPreviewUnlocked = window.localStorage.getItem(birthdayGateKey) === "unlocked";
      hasSeenIntro = window.localStorage.getItem(birthdayCompletedKey) === "seen"
        || window.sessionStorage.getItem(birthdaySessionKey) === "seen";
    } catch {
    }

    const updateCountdown = () => {
      const nextRemainingMs = Math.max(0, birthdayUnlockAt - Date.now());
      setRemainingMs(nextRemainingMs);
      if (nextRemainingMs === 0) {
        window.clearInterval(countdownInterval);
        revealBirthday();
      }
    };

    initializeFrame = window.requestAnimationFrame(() => {
      if (hasSeenIntro) {
        setIsVisible(false);
        window.setTimeout(() => requestAlbumTrackPlayback(birthdayHomeTrackIndex), 0);
        return;
      }

      if (Date.now() < birthdayUnlockAt && !isPreviewUnlocked) {
        setGateStatus("locked");
        updateCountdown();
        countdownInterval = window.setInterval(updateCountdown, 1000);
      } else {
        setGateStatus("unlocked");
      }
      setIsInitialized(true);
    });

    return () => {
      window.cancelAnimationFrame(initializeFrame);
      window.clearInterval(countdownInterval);
    };
  }, [revealBirthday]);

  useEffect(() => {
    const siteContent = document.getElementById("site-content");
    if (!isVisible || !siteContent) return;

    siteContent.setAttribute("inert", "");
    siteContent.setAttribute("aria-hidden", "true");
    return () => {
      siteContent.removeAttribute("inert");
      siteContent.removeAttribute("aria-hidden");
    };
  }, [isVisible]);

  useEffect(() => {
    if (!isVisible) return;
    if (gateStatus === "locked") {
      const focusFrame = window.requestAnimationFrame(() => passwordInputRef.current?.focus());
      return () => window.cancelAnimationFrame(focusFrame);
    }
    if (gateStatus !== "unlocked") return;

    const focusTarget = scene === "wish"
      ? openButtonRef.current
      : scene === "contents"
        ? siteButtonRef.current
        : scene === "video"
          ? videoRef.current
        : isBlown
          ? enterButtonRef.current
          : blowButtonRef.current;
    const focusFrame = window.requestAnimationFrame(() => focusTarget?.focus({ preventScroll: true }));
    return () => window.cancelAnimationFrame(focusFrame);
  }, [gateStatus, isBlown, isVisible, scene]);

  useEffect(() => () => {
    window.clearTimeout(blowTimerRef.current);
    window.clearTimeout(gateTimerRef.current);
    window.clearTimeout(exitTimerRef.current);
    stopMicrophone();
    fireworksCleanupRef.current?.();
  }, [stopMicrophone]);

  if (!isVisible) return null;

  const blowButtonLabel = microphoneState === "requesting"
    ? "Đang mở micro..."
    : microphoneState === "listening"
      ? "Thổi vào micro"
      : "Thổi nến";
  const countdownParts = getCountdownParts(remainingMs);
  const isGateOpen = gateStatus === "unlocked";

  return (
    <section
      ref={stageRef}
      className={`${styles.root} ${isInitialized ? styles.ready : ""} ${isExiting ? styles.exiting : ""}`}
      data-scene={scene}
      data-gate={gateStatus}
      data-blowing={isBlowing}
      data-blown={isBlown}
      role="dialog"
      aria-modal="true"
      aria-label={isGateOpen ? "Chúc mừng sinh nhật Mông Khánh Truyền" : "Món quà sinh nhật đang được khóa"}
    >
      <div className={styles.grain} aria-hidden="true" />

      {gateStatus !== "unlocked" && (
        <div
          className={`${styles.gate} ${gateStatus === "unlocking" ? styles.gateUnlocking : ""}`}
          aria-busy={gateStatus === "checking"}
        >
          <div className={styles.gatePhoto} aria-hidden="true">
            <Image
              src={sitePath("/images/mkt/IMG_3265.jpg")}
              alt=""
              fill
              sizes="100vw"
              priority
            />
          </div>
          <div className={styles.gateShade} aria-hidden="true" />
          <div className={styles.gateFrame} aria-hidden="true" />

          <div className={styles.gateLayout}>
            <div className={styles.gateCopy}>
              <div className={styles.gateLockMark} aria-hidden="true">
                <svg viewBox="0 0 24 24">
                  <rect x="5" y="10" width="14" height="11" rx="1" />
                  <path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3" />
                </svg>
              </div>
              <p className={styles.gateEyebrow}>MKT / 26 · 08 · 2026</p>
              <h1>
                Món quà này
                <span>chưa đến lúc mở.</span>
              </h1>
              <p className={styles.gateMessage}>
                Anh giữ nơi này kín đến đúng ngày của em. Một chút chờ đợi để điều bất ngờ trở nên trọn vẹn hơn.
              </p>

              <div className={styles.countdown} aria-label="Đếm ngược đến ngày 26 tháng 8 năm 2026">
                {countdownParts.map((part) => (
                  <div className={styles.countdownPart} key={part.label} aria-hidden="true">
                    <strong>{part.value}</strong>
                    <span>{part.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <form className={styles.gateForm} onSubmit={handlePasswordSubmit}>
              <label htmlFor="birthday-password">MẬT KHẨU MỞ SỚM</label>
              <div className={styles.gateInputRow}>
                <div className={styles.gateInputShell}>
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <rect x="5" y="10" width="14" height="11" rx="1" />
                    <path d="M8 10V7a4 4 0 0 1 8 0v3" />
                  </svg>
                  <input
                    ref={passwordInputRef}
                    id="birthday-password"
                    type="password"
                    value={password}
                    onChange={(event) => {
                      setPassword(event.currentTarget.value);
                      if (passwordError) setPasswordError(null);
                    }}
                    autoComplete="off"
                    placeholder="Nhập mật khẩu"
                    aria-invalid={passwordError != null}
                    aria-describedby="birthday-password-error"
                    disabled={gateStatus !== "locked"}
                  />
                </div>
                <button
                  type="submit"
                  aria-label="Mở khóa món quà"
                  title="Mở khóa"
                  disabled={gateStatus !== "locked" || password.length === 0}
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M5 12h14m-5-5 5 5-5 5" />
                  </svg>
                </button>
              </div>
              <p id="birthday-password-error" className={styles.gateError} role="alert">
                {passwordError ?? "\u00a0"}
              </p>
            </form>
          </div>
        </div>
      )}

      <button
        className={styles.skipButton}
        type="button"
        onClick={handleSkipIntro}
        aria-label="Bỏ qua màn giới thiệu"
        aria-hidden={!isGateOpen}
        tabIndex={isGateOpen ? 0 : -1}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="m6 6 12 12M18 6 6 18" />
        </svg>
      </button>

      <button
        className={styles.replayButton}
        type="button"
        onClick={handleReplay}
        aria-label="Xem lại lời chúc"
        aria-hidden={!isGateOpen || scene !== "cake" || !isBlown}
        tabIndex={isGateOpen && scene === "cake" && isBlown ? 0 : -1}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M3 12a9 9 0 1 0 3-6.7L3 8m0-5v5h5" />
        </svg>
      </button>

      <div className={styles.wishScene} aria-hidden={!isGateOpen || scene !== "wish"}>
        <div className={styles.photo} aria-hidden="true">
          <Image
            src={sitePath("/images/mkt/IMG_3265.jpg")}
            alt=""
            fill
            sizes="100vw"
            priority
          />
        </div>
        <div className={styles.photoShade} aria-hidden="true" />

        <div className={styles.wishContent}>
          <p className={styles.eyebrow}>26 · 08 · 2004 / MÔNG KHÁNH TRUYỀN</p>
          <h1>
            Chúc mừng sinh nhật
            <span>cô gái anh thương.</span>
          </h1>
          <div className={styles.rule} aria-hidden="true" />
          <div className={styles.letter}>
            <p>
              Mình mới đi cùng nhau được một tháng, chưa dài nhưng đủ để anh biết em đã trở thành
              phần dịu dàng nhất trong mỗi ngày của anh.
            </p>
            <p>
              Sắp tới em sẽ ở Trung Quốc, còn anh vẫn ở Việt Nam. Anh biết sẽ có những ngày rất nhớ,
              nhưng anh mong hai đứa mình vẫn kể nhau nghe mọi chuyện, tin nhau và cùng cố gắng.
            </p>
            <p>
              Chúng mình cùng quê, cùng có một nơi để nhớ và để trở về. Khoảng cách có thể làm những
              cái ôm đến muộn hơn, nhưng sẽ không làm anh thương em ít đi.
            </p>
          </div>
          <p className={styles.signature}>Tuổi 22 thật hạnh phúc nhé, em yêu.</p>
        </div>

        <button
          ref={openButtonRef}
          className={styles.primaryButton}
          type="button"
          onClick={handleOpenGift}
          tabIndex={isGateOpen && scene === "wish" ? 0 : -1}
        >
          <span>Mở món quà của anh</span>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M5 12h14m-5-5 5 5-5 5" />
          </svg>
        </button>
      </div>

      <div className={styles.cakeScene} aria-hidden={!isGateOpen || scene !== "cake"}>
        <canvas ref={canvasRef} className={styles.fireworks} aria-hidden="true" />
        <div className={styles.sky} aria-hidden="true" />
        <div className={styles.candlelight} aria-hidden="true" />

        <div className={styles.cakeCopy} aria-hidden={isBlown}>
          <p className={styles.eyebrow}>TRUYỀN ƠI, NHẮM MẮT LẠI</p>
          <h2>Ước một điều thật đẹp nhé.</h2>
        </div>

        <div className={styles.finalCopy} role="status" aria-live="polite" aria-hidden={!isBlown}>
          <strong>Trung Quốc hay Việt Nam, anh vẫn chọn em.</strong>
          <p>
            Điều ước của anh là khoảng cách chỉ làm chúng mình thương và trân trọng nhau nhiều hơn.
            Anh sẽ vẫn ở đây, cùng em đi qua những ngày sắp tới.
          </p>
        </div>

        <div className={styles.cakeVisual}>
          <div className={styles.wind} aria-hidden="true">
            <span /><span /><span /><span />
          </div>

          <div className={styles.cake} aria-label="Bánh sinh nhật hai tầng với ba ngọn nến">
            <div className={`${styles.candle} ${styles.candleOne}`}>
              <span className={styles.flame} />
              <span className={styles.smoke} />
            </div>
            <div className={`${styles.candle} ${styles.candleTwo}`}>
              <span className={styles.flame} />
              <span className={styles.smoke} />
            </div>
            <div className={`${styles.candle} ${styles.candleThree}`}>
              <span className={styles.flame} />
              <span className={styles.smoke} />
            </div>

            <div className={`${styles.tier} ${styles.topTier}`}>
              <span className={`${styles.drip} ${styles.dripOne}`} />
              <span className={`${styles.drip} ${styles.dripTwo}`} />
              <span className={`${styles.drip} ${styles.dripThree}`} />
            </div>
            <div className={`${styles.tier} ${styles.bottomTier}`}>
              <span className={styles.ribbon} aria-hidden="true" />
              <span className={styles.plaque}>MKT</span>
            </div>
            <div className={styles.plate} />
          </div>
        </div>

        <button
          ref={blowButtonRef}
          className={`${styles.primaryButton} ${styles.blowButton}`}
          type="button"
          onClick={handleBlowButton}
          disabled={microphoneState === "requesting" || isBlowing}
          aria-hidden={isBlown}
          tabIndex={isGateOpen && scene === "cake" && !isBlown ? 0 : -1}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 8h8a3 3 0 1 0-3-3M4 12h13a3 3 0 1 1-3 3M4 16h5" />
          </svg>
          <span>{isBlowing ? "Đang thổi..." : blowButtonLabel}</span>
        </button>

        <button
          ref={enterButtonRef}
          className={`${styles.primaryButton} ${styles.enterButton}`}
          type="button"
          onClick={handleShowContents}
          aria-hidden={!isBlown}
          tabIndex={isGateOpen && scene === "cake" && isBlown ? 0 : -1}
        >
          <span>Xem bên trong món quà</span>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M5 12h14m-5-5 5 5-5 5" />
          </svg>
        </button>
      </div>

      <div className={styles.contentsScene} aria-hidden={!isGateOpen || scene !== "contents"}>
        <div className={styles.contentsPhoto} aria-hidden="true">
          <Image
            src={sitePath("/images/mkt/IMG_3259.jpg")}
            alt=""
            fill
            sizes="100vw"
            loading="eager"
          />
        </div>
        <div className={styles.contentsShade} aria-hidden="true" />

        <div className={styles.contentsLayout}>
          <div className={styles.contentsHeading}>
            <p className={styles.eyebrow}>TRƯỚC KHI EM MỞ QUÀ</p>
            <h2>
              Trong này có ba cách
              <span>để anh ở gần em hơn.</span>
            </h2>
          </div>

          <div className={styles.giftList}>
            <article className={styles.giftItem}>
              <div className={styles.giftMeta}>
                <span>01</span>
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <circle cx="12" cy="12" r="8" />
                  <circle cx="12" cy="12" r="2" />
                  <path d="M12 4v3M20 12h-3" />
                </svg>
              </div>
              <h3>Album</h3>
              <p>
                Phần này anh làm riêng cho em, để em nghe những bài em thích bất cứ lúc nào mà không
                cần phải chờ quảng cáo.
              </p>
            </article>

            <article className={styles.giftItem}>
              <div className={styles.giftMeta}>
                <span>02</span>
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <rect x="3" y="4" width="18" height="16" rx="1" />
                  <circle cx="9" cy="10" r="2" />
                  <path d="m4 18 5-5 4 4 2-2 5 4" />
                </svg>
              </div>
              <h3>Memory</h3>
              <p>
                Đây là những hình ảnh từ những lần anh và em gặp nhau, những khoảnh khắc anh vẫn giữ
                trong điện thoại. Lúc nào nhớ anh, em mở ra xem nhé.
              </p>
            </article>

            <article className={styles.giftItem}>
              <div className={styles.giftMeta}>
                <span>03</span>
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M4 12v2M8 8v8M12 5v14M16 8v8M20 11v3" />
                </svg>
              </div>
              <h3>MP3</h3>
              <p>
                Đây sẽ là những đoạn voice của anh, để những lúc nhớ giọng anh em vẫn có thể nghe thấy
                anh ở bên.
              </p>
            </article>
          </div>

          <div className={styles.contentsFooter}>
            <p>Một món quà nhỏ, dành cho những ngày mình phải ở xa nhau.</p>
            <button
              ref={siteButtonRef}
              className={`${styles.primaryButton} ${styles.contentsButton}`}
              type="button"
              onClick={handleStartVideo}
              tabIndex={isGateOpen && scene === "contents" ? 0 : -1}
            >
              <span>Xem món quà cuối cùng</span>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M5 12h14m-5-5 5 5-5 5" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <div className={styles.videoScene} aria-hidden={!isGateOpen || scene !== "video"}>
        <video
          ref={videoRef}
          controls
          playsInline
          preload="metadata"
          onEnded={handleVideoEnded}
          tabIndex={isGateOpen && scene === "video" ? 0 : -1}
          aria-label="Video cuối màn giới thiệu"
        >
          <source src={sitePath("/videos/info.mp4")} type="video/mp4" />
          Trình duyệt của bạn không hỗ trợ phát video.
        </video>
      </div>
    </section>
  );
}
