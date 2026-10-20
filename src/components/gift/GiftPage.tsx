"use client";

import dynamic from "next/dynamic";
import NextImage from "next/image";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { sitePath } from "../../lib/site-path";
import { useMediaPlayback } from "../MediaPlaybackCoordinator";
import {
  giftGame,
  giftIntro,
  giftLetter,
  giftMusic,
  giftTree,
  giftVouchers,
} from "./giftContent";
import {
  defaultFlowers,
  flowerCatalog,
  maxFlowers,
  type FlowerId,
} from "./flowers";
const BouquetCanvas = dynamic(() => import("./BouquetCanvas"), { ssr: false });
import { FlowerIcon } from "./FlowerArt";
import { LoveTree } from "./LoveTree";
import styles from "./GiftPage.module.css";

const mediaSourceId = "gift-music";
const usedStorageKey = "mkt-gift-1020-used";

const fallingPetals = Array.from({ length: 18 }, (_, index) => ({
  left: (index * 11.3 + 5) % 98,
  delay: (index * 1.9) % 14,
  duration: 12 + ((index * 2.7) % 9),
  size: 10 + ((index * 5) % 11),
  hue: index % 3,
}));

// Voucher usage is a per-device convenience, so it lives in localStorage and is
// read through an external store to stay out of the static server render.
const usedListeners = new Set<() => void>();

const usedStore = {
  subscribe(listener: () => void) {
    usedListeners.add(listener);
    return () => {
      usedListeners.delete(listener);
    };
  },
  getSnapshot() {
    try {
      return window.localStorage.getItem(usedStorageKey) ?? "";
    } catch {
      return "";
    }
  },
  getServerSnapshot: () => "",
  toggle(id: string) {
    try {
      const used = new Set(usedStore.getSnapshot().split(",").filter(Boolean));
      if (!used.delete(id)) used.add(id);
      window.localStorage.setItem(usedStorageKey, [...used].join(","));
    } catch {
      // Storage can be blocked (private mode); the voucher just won't persist.
    }
    usedListeners.forEach((notify) => notify());
  },
};

function HeartIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 20.5S3.5 15 3.5 9.2A4.7 4.7 0 0 1 12 6.4a4.7 4.7 0 0 1 8.5 2.8c0 5.8-8.5 11.3-8.5 11.3Z" />
    </svg>
  );
}

const wheelSize = 300;
const wheelRadius = wheelSize / 2 - 4;

function wedgePath(index: number, count: number) {
  const step = (Math.PI * 2) / count;
  const point = (angle: number) => {
    const x = wheelSize / 2 + wheelRadius * Math.sin(angle);
    const y = wheelSize / 2 - wheelRadius * Math.cos(angle);
    return `${x.toFixed(2)} ${y.toFixed(2)}`;
  };
  return `M${wheelSize / 2} ${wheelSize / 2} L${point(index * step)} A${wheelRadius} ${wheelRadius} 0 0 1 ${point((index + 1) * step)} Z`;
}

function VoucherWheel({ usedIds }: { usedIds: Set<string> }) {
  const count = giftVouchers.length;
  const step = 360 / count;
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [resultIndex, setResultIndex] = useState<number | null>(null);
  const timerRef = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timerRef.current), []);

  const spin = () => {
    if (spinning) return;
    const unused = giftVouchers
      .map((voucher, index) => (usedIds.has(voucher.id) ? -1 : index))
      .filter((index) => index >= 0);
    const pool = unused.length ? unused : giftVouchers.map((_, index) => index);
    const target = pool[Math.floor(Math.random() * pool.length)];
    // Land somewhere inside the wedge (not on its edge), with a few full turns.
    const offset = (0.15 + Math.random() * 0.7) * step;
    const current = ((rotation % 360) + 360) % 360;
    const wanted = (360 - (target * step + offset)) % 360;
    const delta = ((wanted - current) % 360 + 360) % 360;
    setResultIndex(null);
    setSpinning(true);
    setRotation(rotation + 360 * 5 + delta);
    timerRef.current = window.setTimeout(() => {
      setSpinning(false);
      setResultIndex(target);
    }, 4700);
  };

  const result = resultIndex === null ? null : giftVouchers[resultIndex];
  const resultUsed = result ? usedIds.has(result.id) : false;

  return (
    <div className={styles.wheelBox}>
      <div className={styles.wheelStage}>
        <svg className={styles.wheelPointer} viewBox="0 0 22 28" aria-hidden="true">
          <path d="M11 28 1 6a11 11 0 0 1 20 0Z" />
        </svg>
        <svg
          className={styles.wheelSvg}
          viewBox={`0 0 ${wheelSize} ${wheelSize}`}
          aria-hidden="true"
        >
          <g
            className={styles.wheelRotor}
            style={{ transform: `rotate(${rotation}deg)` }}
          >
            {giftVouchers.map((voucher, index) => {
              const mid = ((index + 0.5) * step * Math.PI) / 180;
              const labelRadius = wheelRadius * 0.68;
              const x = wheelSize / 2 + labelRadius * Math.sin(mid);
              const y = wheelSize / 2 - labelRadius * Math.cos(mid);
              const fills = ["#c2415c", "#e8788f", "#8f2c43"];
              return (
                <g key={voucher.id} opacity={usedIds.has(voucher.id) ? 0.4 : 1}>
                  <path
                    d={wedgePath(index, count)}
                    fill={fills[index % fills.length]}
                    stroke="#1a0a0e"
                    strokeWidth="2"
                  />
                  <text
                    x={x}
                    y={y}
                    fill="#fff"
                    fontSize="26"
                    fontFamily="Geist Mono, monospace"
                    textAnchor="middle"
                    dominantBaseline="central"
                    transform={`rotate(${(index + 0.5) * step} ${x} ${y})`}
                  >
                    {index + 1}
                  </text>
                </g>
              );
            })}
          </g>
        </svg>
        <button
          type="button"
          className={styles.wheelHub}
          onClick={spin}
          disabled={spinning}
          aria-label="Quay vòng quay quà tặng"
        >
          {spinning ? "..." : "QUAY"}
        </button>
      </div>

      <div
        className={`${styles.wheelResult} ${resultUsed ? styles.isUsed : ""}`}
        aria-live="polite"
      >
        {result ? (
          <>
            <span className={styles.sectionLabel}>
              PHIẾU {(resultIndex! + 1).toString().padStart(2, "0")}
            </span>
            <strong>{result.title}</strong>
            <span>{result.note}</span>
            {resultUsed && <em className={styles.voucherStamp}>ĐÃ DÙNG</em>}
            <button
              type="button"
              className={styles.voucherUse}
              onClick={() => usedStore.toggle(result.id)}
            >
              {resultUsed ? "Hoàn tác" : "Dùng phiếu này"}
            </button>
          </>
        ) : (
          <span>{spinning ? "Đang quay..." : "Bấm QUAY để nhận một phiếu quà."}</span>
        )}
      </div>
    </div>
  );
}

type MemoryCard = { key: string; photo: string };

function buildDeck(): MemoryCard[] {
  const cards = giftGame.photos.flatMap((photo, index) => [
    { key: `${index}-a`, photo },
    { key: `${index}-b`, photo },
  ]);
  for (let i = cards.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }
  return cards;
}

function MatchGame() {
  const [deck, setDeck] = useState<MemoryCard[] | null>(null);
  const [revealed, setRevealed] = useState<number[]>([]);
  const [matched, setMatched] = useState<string[]>([]);
  const [moves, setMoves] = useState(0);
  const lockRef = useRef(false);

  const start = () => {
    setDeck(buildDeck());
    setRevealed([]);
    setMatched([]);
    setMoves(0);
    lockRef.current = false;
  };

  const flip = (position: number) => {
    if (!deck || lockRef.current) return;
    const card = deck[position];
    if (revealed.includes(position) || matched.includes(card.photo)) return;

    const next = [...revealed, position];
    setRevealed(next);
    if (next.length < 2) return;

    setMoves((value) => value + 1);
    const [first, second] = next;
    if (deck[first].photo === deck[second].photo) {
      setMatched((value) => [...value, deck[first].photo]);
      setRevealed([]);
      return;
    }

    lockRef.current = true;
    window.setTimeout(() => {
      setRevealed([]);
      lockRef.current = false;
    }, 850);
  };

  const won = deck !== null && matched.length === giftGame.photos.length;

  return (
    <div className={styles.game}>
      {deck === null ? (
        <button type="button" className={styles.primaryButton} onClick={start}>
          Bắt đầu chơi
        </button>
      ) : (
        <>
          <div className={styles.gameStatus}>
            <span>LƯỢT {moves}</span>
            <span>
              {matched.length}/{giftGame.photos.length} ĐÔI
            </span>
          </div>
          <div className={styles.gameGrid}>
            {deck.map((card, position) => {
              const isOpen =
                revealed.includes(position) || matched.includes(card.photo);
              return (
                <button
                  key={card.key}
                  type="button"
                  className={`${styles.gameCard} ${isOpen ? styles.isOpen : ""} ${matched.includes(card.photo) ? styles.isMatched : ""}`}
                  onClick={() => flip(position)}
                  aria-label={isOpen ? "Thẻ kỷ niệm đã lật" : "Thẻ úp"}
                >
                  <span className={styles.gameBack}>
                    <HeartIcon />
                  </span>
                  <span className={styles.gameFront}>
                    <NextImage
                      src={sitePath(card.photo)}
                      alt=""
                      fill
                      sizes="(max-width: 700px) 24vw, 140px"
                    />
                  </span>
                </button>
              );
            })}
          </div>
          {won && (
            <div className={styles.reward} role="status">
              <HeartIcon className={styles.rewardHeart} />
              <p>{giftGame.reward}</p>
              <span className={styles.sectionLabel}>{giftGame.bonusLabel}</span>
              <p>{giftGame.bonus}</p>
              <button
                type="button"
                className={styles.ghostButton}
                onClick={start}
              >
                Chơi lại
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export function GiftPage() {
  const { beginMediaPlayback, endMediaPlayback } = useMediaPlayback();
  const audioRef = useRef<HTMLAudioElement>(null);
  const lettersRef = useRef<HTMLElement>(null);
  const [opened, setOpened] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [flowers, setFlowers] = useState<FlowerId[]>(defaultFlowers);
  const used = useSyncExternalStore(
    usedStore.subscribe,
    usedStore.getSnapshot,
    usedStore.getServerSnapshot,
  );
  const usedIds = new Set(used.split(",").filter(Boolean));

  // Start the music as soon as the tab opens. If the browser blocks autoplay,
  // fall back to the first touch/click anywhere on the page.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const retry = () => {
      void audio.play().catch(() => {});
    };
    audio.play().catch(() => {
      window.addEventListener("pointerdown", retry, { once: true });
      window.addEventListener("keydown", retry, { once: true });
    });
    return () => {
      window.removeEventListener("pointerdown", retry);
      window.removeEventListener("keydown", retry);
      audio.pause();
      endMediaPlayback(mediaSourceId);
    };
  }, [endMediaPlayback]);

  const toggleMusic = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) void audio.play().catch(() => {});
    else audio.pause();
  }, []);

  const openGift = () => {
    setOpened(true);
    const audio = audioRef.current;
    if (audio?.paused) void audio.play().catch(() => {});
    window.setTimeout(() => {
      lettersRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 500);
  };

  return (
    <div className={`${styles.page} ${opened ? styles.isOpened : ""}`}>
      <audio
        ref={audioRef}
        src={encodeURI(sitePath(giftMusic.url))}
        loop
        preload="auto"
        onPlay={() => {
          beginMediaPlayback(mediaSourceId);
          setIsPlaying(true);
        }}
        onPause={() => {
          endMediaPlayback(mediaSourceId);
          setIsPlaying(false);
        }}
      />

      <div className={styles.petals} aria-hidden="true">
        {fallingPetals.map((petal, index) => (
          <span
            key={index}
            className={styles[`petal${petal.hue}` as "petal0"]}
            style={{
              left: `${petal.left}%`,
              width: petal.size,
              height: petal.size * 1.25,
              animationDelay: `${petal.delay}s`,
              animationDuration: `${petal.duration}s`,
            }}
          />
        ))}
      </div>

      <button
        type="button"
        className={`${styles.music} ${isPlaying ? styles.isPlaying : ""}`}
        onClick={toggleMusic}
        aria-label={isPlaying ? "Tạm dừng nhạc" : "Phát nhạc"}
      >
        <span className={styles.musicBars} aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
        <span className={styles.musicText}>
          {giftMusic.title} · {giftMusic.artist}
        </span>
      </button>

      <section className={styles.hero}>
        <span className={styles.eyebrow}>{giftIntro.eyebrow}</span>
        <div className={styles.bouquet}>
          <BouquetCanvas flowers={flowers} />
        </div>
        <span className={styles.dragHint}>Giữ &amp; kéo để xoay bó hoa</span>
        <div className={styles.picker} aria-label="Chọn hoa">
          <div className={styles.pickerHead}>
            <span>
              CHỌN HOA · {flowers.length}/{maxFlowers}
            </span>
            <span className={styles.pickerActions}>
              <button
                type="button"
                onClick={() => setFlowers((list) => list.slice(0, -1))}
                disabled={flowers.length === 0}
              >
                Bớt 1
              </button>
              <button type="button" onClick={() => setFlowers(defaultFlowers)}>
                Đặt lại
              </button>
              <button
                type="button"
                onClick={() => setFlowers([])}
                disabled={flowers.length === 0}
              >
                Xoá hết
              </button>
            </span>
          </div>
          <ul className={styles.pickerList}>
            {flowerCatalog.map((flower) => (
              <li key={flower.id}>
                <button
                  type="button"
                  className={styles.flowerChip}
                  onClick={() =>
                    setFlowers((list) =>
                      list.length >= maxFlowers ? list : [...list, flower.id],
                    )
                  }
                  disabled={flowers.length >= maxFlowers}
                  aria-label={`Thêm ${flower.label}`}
                >
                  <FlowerIcon id={flower.id} />
                  <b>{flowers.filter((id) => id === flower.id).length || ""}</b>
                  <span>{flower.label}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
        <h1 className={styles.title}>{giftIntro.title}</h1>
        <p className={styles.subtitle}>{giftIntro.subtitle}</p>
        {!opened ? (
          <button
            type="button"
            className={styles.primaryButton}
            onClick={openGift}
          >
            {giftIntro.openLabel}
          </button>
        ) : (
          <span className={styles.scrollHint} aria-hidden="true">
            KÉO XUỐNG
          </span>
        )}
      </section>

      {opened && (
        <main className={styles.content}>
          <section
            ref={lettersRef}
            className={styles.letter}
            aria-label="Lời nhắn"
          >
            <span className={styles.sectionLabel}>01 / LỜI NHẮN</span>
            <h2>{giftLetter.greeting}</h2>
            {giftLetter.paragraphs.map((paragraph, index) => (
              <p key={index} style={{ animationDelay: `${index * 0.35}s` }}>
                {paragraph}
              </p>
            ))}
            <span className={styles.signature}>{giftLetter.signature}</span>
          </section>

          <section aria-label="Phiếu quà tặng">
            <span className={styles.sectionLabel}>02 / PHIẾU QUÀ TẶNG</span>
            <h2 className={styles.sectionTitle}>Vòng quay may mắn</h2>
            <VoucherWheel usedIds={usedIds} />
          </section>

          <section aria-label="Trò chơi">
            <span className={styles.sectionLabel}>03 / {giftGame.eyebrow}</span>
            <h2 className={styles.sectionTitle}>{giftGame.title}</h2>
            <p className={styles.hint}>{giftGame.hint}</p>
            <MatchGame />
          </section>

          <section aria-label="Cây tình yêu">
            <span className={styles.sectionLabel}>04 / {giftTree.eyebrow}</span>
            <h2 className={styles.sectionTitle}>{giftTree.title}</h2>
            <p className={styles.hint}>{giftTree.hint}</p>
            <LoveTree />
          </section>

          <footer className={styles.footer}>
            <span>Mỗi ngày trôi qua vẫn là em.</span>
            <span>B &amp; T</span>
          </footer>
        </main>
      )}
    </div>
  );
}
