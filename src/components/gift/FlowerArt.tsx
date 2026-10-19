import { memo } from "react";
import type { FlowerId } from "./flowers";

// Soft gradient flower heads (no outlines), drawn around (0, 0) pointing up.
// Gradients run base -> tip in each petal's own space, so they turn with it.

const tones = {
  white: ["#e9d6cb", "#fffdfa"],
  pink: ["#df6e89", "#fbd0db"],
  blush: ["#f0a0b7", "#fee9ef"],
  lilac: ["#9a85e0", "#e3dbff"],
  coral: ["#ff8a74", "#ffdacf"],
  leaf: ["#7fae95", "#d3e6d8"],
} as const;

type Tone = keyof typeof tones;

export function FlowerDefs() {
  return (
    <defs>
      {(Object.keys(tones) as Tone[]).map((tone) => (
        <linearGradient
          key={tone}
          id={`fa-${tone}`}
          x1="0"
          y1="1"
          x2="0"
          y2="0"
        >
          <stop offset="0" stopColor={tones[tone][0]} />
          <stop offset="1" stopColor={tones[tone][1]} />
        </linearGradient>
      ))}
    </defs>
  );
}

// Rounded so the server and client render identical numbers.
const r = (n: number) => Math.round(n * 100) / 100;

const fill = (tone: Tone) => `url(#fa-${tone})`;
const edge = "rgba(110, 40, 60, 0.14)";

function Ring({
  count,
  d,
  tone,
  scale = 1,
  offset = 0,
}: {
  count: number;
  d: string;
  tone: Tone;
  scale?: number;
  offset?: number;
}) {
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <path
          key={i}
          d={d}
          fill={fill(tone)}
          stroke={edge}
          strokeWidth={0.7}
          transform={`rotate(${(i / count) * 360 + offset}) scale(${scale})`}
        />
      ))}
    </>
  );
}

const roundPetal =
  "M0 0 C-20 -4 -27 -20 -12 -27 C-5 -30 5 -30 12 -27 C27 -20 20 -4 0 0Z";
const widePetal =
  "M0 0 C-24 -2 -30 -22 -14 -30 C-6 -34 6 -34 14 -30 C30 -22 24 -2 0 0Z";
const pointPetal = "M0 0 C-10 -8 -9 -24 0 -36 C9 -24 10 -8 0 0Z";

function Rose({ tone }: { tone: "white" | "pink" }) {
  return (
    <g>
      <circle r={24} fill={fill(tone)} />
      <Ring count={5} d={roundPetal} tone={tone} />
      <Ring count={5} d={roundPetal} tone={tone} scale={0.68} offset={36} />
      <circle r={6.5} fill={tones[tone][0]} opacity={0.85} />
      <path
        d="M-5 1 C-5 -6 5 -6 5 0 C5 5 -2 5 -2 1"
        fill="none"
        stroke="rgba(255,255,255,0.6)"
        strokeWidth={1.4}
        strokeLinecap="round"
      />
    </g>
  );
}

function Peony() {
  return (
    <g>
      <Ring count={8} d={widePetal} tone="blush" />
      <Ring count={7} d={widePetal} tone="blush" scale={0.74} offset={20} />
      <Ring count={6} d={widePetal} tone="pink" scale={0.46} offset={8} />
      {Array.from({ length: 9 }, (_, i) => {
        const a = (i / 9) * Math.PI * 2;
        return (
          <circle
            key={i}
            cx={r(Math.cos(a) * 4.5)}
            cy={r(Math.sin(a) * 4.5)}
            r={1.5}
            fill="#f4c94a"
          />
        );
      })}
    </g>
  );
}

function Lily() {
  return (
    <g>
      <Ring count={3} d={pointPetal} tone="blush" scale={0.92} offset={60} />
      <Ring count={3} d={pointPetal} tone="white" />
      {Array.from({ length: 3 }, (_, i) => (
        <path
          key={i}
          d="M0 -4 L0 -24"
          stroke="#e07a99"
          strokeWidth={0.9}
          opacity={0.55}
          transform={`rotate(${i * 120})`}
        />
      ))}
      {Array.from({ length: 5 }, (_, i) => {
        const a = (i / 5) * Math.PI * 2 + 0.3;
        return (
          <g key={i}>
            <line
              x1={0}
              y1={0}
              x2={r(Math.cos(a) * 13)}
              y2={r(Math.sin(a) * 13)}
              stroke="#d9c7a3"
              strokeWidth={1}
            />
            <circle
              cx={r(Math.cos(a) * 13)}
              cy={r(Math.sin(a) * 13)}
              r={2.2}
              fill="#f08a3c"
            />
          </g>
        );
      })}
    </g>
  );
}

function Tulip() {
  return (
    <g stroke={edge} strokeWidth={0.7}>
      <path
        d="M-4 9 C-21 9 -21 -12 -12 -27 C-4 -21 0 -8 -4 9Z"
        fill={fill("coral")}
      />
      <path
        d="M4 9 C21 9 21 -12 12 -27 C4 -21 0 -8 4 9Z"
        fill={fill("coral")}
      />
      <path
        d="M-11 8 C-17 -10 -8 -24 0 -32 C8 -24 17 -10 11 8 C5 14 -5 14 -11 8Z"
        fill={fill("coral")}
      />
    </g>
  );
}

function Hydrangea() {
  const florets = [
    [0, 0],
    ...Array.from({ length: 6 }, (_, i) => [
      r(Math.cos(i * 1.047) * 11),
      r(Math.sin(i * 1.047) * 11),
    ]),
    ...Array.from({ length: 6 }, (_, i) => [
      r(Math.cos(i * 1.047 + 0.52) * 20),
      r(Math.sin(i * 1.047 + 0.52) * 20),
    ]),
  ];
  return (
    <g>
      {florets.map(([x, y], i) => (
        <g key={i} transform={`translate(${x} ${y}) rotate(${i * 23})`}>
          {[0, 90, 180, 270].map((r) => (
            <ellipse
              key={r}
              cx={0}
              cy={-3.6}
              rx={3.3}
              ry={5.2}
              fill={fill(i % 3 === 0 ? "blush" : "lilac")}
              stroke={edge}
              strokeWidth={0.5}
              transform={`rotate(${r})`}
            />
          ))}
          <circle r={1.3} fill="#f6efc4" />
        </g>
      ))}
    </g>
  );
}

function BabysBreath() {
  const sprigs = Array.from({ length: 9 }, (_, i) => {
    const a = (-0.5 + i / 8) * Math.PI * 1.1 - Math.PI / 2;
    const len = 14 + ((i * 7) % 9);
    return { x: Math.cos(a) * len, y: Math.sin(a) * len - 4 };
  });
  return (
    <g>
      {sprigs.map((p, i) => (
        <line
          key={`l${i}`}
          x1={0}
          y1={8}
          x2={p.x}
          y2={p.y}
          stroke="#8fcf7e"
          strokeWidth={1}
        />
      ))}
      {sprigs.map((p, i) => (
        <circle
          key={i}
          cx={p.x}
          cy={p.y}
          r={3.4}
          fill="#ffffff"
          stroke="#f1d3db"
          strokeWidth={1}
        />
      ))}
    </g>
  );
}

function Eucalyptus() {
  return (
    <g>
      <path
        d="M0 18 Q-6 -4 3 -34"
        fill="none"
        stroke="#76a083"
        strokeWidth={1.4}
      />
      {Array.from({ length: 8 }, (_, j) => {
        const t = j / 7;
        const x = -6 * 2 * t * (1 - t) + 3 * t * t + (j % 2 ? 5 : -5);
        const y = 18 - 52 * t;
        return (
          <ellipse
            key={j}
            cx={x}
            cy={y}
            rx={4.8 - t * 1.5}
            ry={5.4 - t * 1.6}
            fill={fill("leaf")}
            stroke="rgba(60,100,80,0.25)"
            strokeWidth={0.6}
          />
        );
      })}
    </g>
  );
}

function FlowerHeadBase({ id }: { id: FlowerId }) {
  switch (id) {
    case "roseWhite":
      return <Rose tone="white" />;
    case "rosePink":
      return <Rose tone="pink" />;
    case "peony":
      return <Peony />;
    case "lily":
      return <Lily />;
    case "tulip":
      return <Tulip />;
    case "hydrangea":
      return <Hydrangea />;
    case "babysBreath":
      return <BabysBreath />;
    default:
      return <Eucalyptus />;
  }
}

export const FlowerHead = memo(FlowerHeadBase);

export function FlowerIcon({ id, size = 52 }: { id: FlowerId; size?: number }) {
  return (
    <svg viewBox="-36 -40 72 72" width={size} height={size} aria-hidden="true">
      <FlowerDefs />
      <FlowerHead id={id} />
    </svg>
  );
}
