"use client";

import { Environment, Lightformer, Sparkles } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { fillerFlowers, type FlowerId } from "./flowers";

function seeded(index: number) {
  const x = Math.sin(index * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

const up = new THREE.Vector3(0, 1, 0);
const TAU = Math.PI * 2;

// Paper wrap profile (y, radius). The mouth is at y = mouthY, the gathered neck
// (where the ribbon sits) at neckY and the frilly hem at hemY.
const mouthY = 0.05;
const neckY = -1.15;
const hemY = -1.6;
const neckR = 0.15;
const hemR = 0.4;
const stemEndY = -1.98;
const holdY = -1.0;

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const smooth = (a: number, b: number, x: number) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};

// ---------------------------------------------------------------- geometry kit

type Part = {
  geometry: THREE.BufferGeometry;
  matrix?: THREE.Matrix4;
  color?: THREE.Color | string;
};

// Merge many small pieces into one geometry (one draw call per flower head).
// Pieces that already carry vertex colours keep them; the rest get `color`.
function merge(parts: Part[]) {
  const geometries = parts.map(({ geometry, matrix, color }) => {
    const g = geometry.index ? geometry.toNonIndexed() : geometry.clone();
    if (matrix) g.applyMatrix4(matrix);
    g.deleteAttribute("uv");
    if (!g.getAttribute("color")) {
      const c = new THREE.Color(color ?? "#ffffff");
      const count = g.getAttribute("position").count;
      const data = new Float32Array(count * 3);
      for (let i = 0; i < count; i += 1) {
        data[i * 3] = c.r;
        data[i * 3 + 1] = c.g;
        data[i * 3 + 2] = c.b;
      }
      g.setAttribute("color", new THREE.BufferAttribute(data, 3));
    }
    return g;
  });
  const merged = mergeGeometries(geometries, false);
  geometries.forEach((g) => g.dispose());
  return merged ?? new THREE.BufferGeometry();
}

const place = (
  pos: [number, number, number],
  euler: [number, number, number] = [0, 0, 0],
  scale: number | [number, number, number] = 1,
) =>
  new THREE.Matrix4().compose(
    new THREE.Vector3(...pos),
    new THREE.Quaternion().setFromEuler(
      new THREE.Euler(euler[0], euler[1], euler[2], "YXZ"),
    ),
    typeof scale === "number"
      ? new THREE.Vector3(scale, scale, scale)
      : new THREE.Vector3(...scale),
  );

// A thin rod from a to b.
function rod(
  a: THREE.Vector3,
  b: THREE.Vector3,
  radius: number,
  color: string,
): Part {
  const dir = b.clone().sub(a);
  const geometry = new THREE.CylinderGeometry(radius, radius, dir.length(), 5);
  const matrix = new THREE.Matrix4().compose(
    a.clone().add(b).multiplyScalar(0.5),
    new THREE.Quaternion().setFromUnitVectors(up, dir.normalize()),
    new THREE.Vector3(1, 1, 1),
  );
  return { geometry, matrix, color };
}

const ball = new THREE.SphereGeometry(1, 8, 6);

// One cupped petal: bulges low, narrows to a point and, when `open`, flares its
// upper half outward. Colour runs centre -> edge, baked into the vertices.
function makePetal(
  main: string,
  edge: string,
  radiusScale: number,
  open: number,
  height: number,
  round = false,
) {
  const segU = 10;
  const segV = 14;
  const radius = 0.2 * radiusScale;
  const base = new THREE.Color("#a9cf8a");
  const mainColor = new THREE.Color(main);
  const edgeColor = new THREE.Color(edge);
  const color = new THREE.Color();
  const positions: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];

  for (let j = 0; j <= segV; j += 1) {
    const v = j / segV;
    const bulb = 0.32 + 0.68 * Math.sin(Math.PI * Math.pow(v, 0.72));
    const flare = open * 0.55 * Math.pow(v, 2.2) + 0.1 * Math.pow(v, 7);
    const r = radius * (bulb * (1 - 0.55 * Math.pow(v, 5)) + flare);
    // Rounded petals keep their full width to the tip; pointed ones taper.
    const span = round
      ? 1.45 * Math.pow(1 - Math.pow(v, 4.5), 0.4)
      : 1.32 * Math.pow(1 - Math.pow(v, 2.4), 0.55);
    const y = height * v * (1 - 0.12 * open * v);
    for (let i = 0; i <= segU; i += 1) {
      const u = (i / segU) * 2 - 1;
      const phi = u * span;
      positions.push(Math.sin(phi) * r, y, Math.cos(phi) * r);
      color.copy(mainColor).lerp(edgeColor, Math.pow(Math.abs(u), 2.2));
      color.lerp(base, Math.max(0, 1 - v / 0.12) * 0.55);
      color.multiplyScalar(
        (1 - 0.12 * Math.pow(Math.abs(u), 3)) *
          (0.8 + 0.2 * smooth(0, 0.35, v)),
      );
      colors.push(color.r, color.g, color.b);
    }
  }
  for (let j = 0; j < segV; j += 1) {
    for (let i = 0; i < segU; i += 1) {
      const a = j * (segU + 1) + i;
      const c = a + segU + 1;
      indices.push(a, a + 1, c, a + 1, c + 1, c);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3),
  );
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

// A long leaf: width swells then tapers, arching outward along +x.
function makeLeaf(
  length: number,
  width: number,
  sweep: number,
  dark: string,
  light: string,
) {
  const segV = 14;
  const a = new THREE.Color(dark);
  const b = new THREE.Color(light);
  const color = new THREE.Color();
  const positions: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];
  for (let j = 0; j <= segV; j += 1) {
    const t = j / segV;
    const w = width * Math.sin(Math.PI * Math.pow(t, 0.65)) + 0.004;
    const x = sweep * Math.pow(t, 1.8);
    const y = length * t;
    [-1, 0, 1].forEach((side) => {
      positions.push(x + side * w * 0.25, y, side * w);
      color.copy(a).lerp(b, side === 0 ? 0.35 : 0.05 + 0.2 * t);
      colors.push(color.r, color.g, color.b);
    });
  }
  for (let j = 0; j < segV; j += 1) {
    const i = j * 3;
    indices.push(
      i,
      i + 1,
      i + 3,
      i + 1,
      i + 4,
      i + 3,
      i + 1,
      i + 2,
      i + 4,
      i + 2,
      i + 5,
      i + 4,
    );
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3),
  );
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

type Ring = {
  scale: number;
  open: number;
  height: number;
  count: number;
  tilt: number;
  phase: number;
  lift: number;
};

function ringHead(
  main: string,
  edge: string,
  rings: Ring[],
  round = false,
  core?: string,
) {
  const parts: Part[] = rings.flatMap((ring) => {
    const geometry = makePetal(
      main,
      edge,
      ring.scale,
      ring.open,
      ring.height,
      round,
    );
    return Array.from({ length: ring.count }, (_, k) => ({
      geometry,
      matrix: place(
        [0, ring.lift, 0],
        [ring.tilt, ring.phase + (k * TAU) / ring.count, 0],
      ),
    }));
  });
  if (core)
    parts.push({
      geometry: ball,
      matrix: place([0, 0.12, 0], [0, 0, 0], [0.13, 0.12, 0.13]),
      color: core,
    });
  return merge(parts);
}

function buildRose(white: boolean) {
  const [main, edge, core] = white
    ? ["#fff0e2", "#ffffff", "#f1dccb"]
    : ["#f0a0b7", "#fde3ea", "#e58aa4"];
  return ringHead(
    main,
    edge,
    [
      {
        scale: 0.62,
        open: 0,
        height: 0.42,
        count: 4,
        tilt: 0.04,
        phase: 0,
        lift: 0.03,
      },
      {
        scale: 0.86,
        open: 0.25,
        height: 0.46,
        count: 5,
        tilt: 0.14,
        phase: 0.5,
        lift: 0.0,
      },
      {
        scale: 1.1,
        open: 0.6,
        height: 0.48,
        count: 6,
        tilt: 0.3,
        phase: 0.2,
        lift: -0.04,
      },
      {
        scale: 1.32,
        open: 1.0,
        height: 0.46,
        count: 7,
        tilt: 0.55,
        phase: 0.1,
        lift: -0.09,
      },
    ],
    true,
    core,
  );
}

function buildPeony() {
  return ringHead(
    "#f6b3c7",
    "#fff0f4",
    [
      {
        scale: 0.5,
        open: 0,
        height: 0.4,
        count: 4,
        tilt: 0.05,
        phase: 0,
        lift: 0.04,
      },
      {
        scale: 0.75,
        open: 0.3,
        height: 0.48,
        count: 5,
        tilt: 0.15,
        phase: 0.4,
        lift: 0.01,
      },
      {
        scale: 1.0,
        open: 0.7,
        height: 0.52,
        count: 6,
        tilt: 0.3,
        phase: 0.1,
        lift: -0.02,
      },
      {
        scale: 1.25,
        open: 1.0,
        height: 0.52,
        count: 7,
        tilt: 0.5,
        phase: 0.3,
        lift: -0.06,
      },
      {
        scale: 1.45,
        open: 1.3,
        height: 0.5,
        count: 8,
        tilt: 0.7,
        phase: 0,
        lift: -0.1,
      },
    ],
    true,
    "#f08fab",
  );
}

function buildTulip() {
  const outer = makePetal("#ff9d88", "#ffd9ce", 1.04, 0, 0.66);
  const inner = makePetal("#ff9d88", "#ffd9ce", 0.95, 0, 0.66);
  return merge([
    ...[0, 1, 2].map((k) => ({
      geometry: outer,
      matrix: place([0, 0, 0], [0, (k * TAU) / 3, 0]),
    })),
    ...[0, 1, 2].map((k) => ({
      geometry: inner,
      matrix: place([0, 0, 0], [0, Math.PI / 3 + (k * TAU) / 3, 0]),
    })),
  ]);
}

function buildLily() {
  const petal = makePetal("#f3b2c6", "#fffaf6", 0.55, 1.7, 0.78);
  const parts: Part[] = Array.from({ length: 6 }, (_, k) => ({
    geometry: petal,
    matrix: place([0, 0, 0], [0.95, (k * TAU) / 6, 0]),
  }));
  for (let k = 0; k < 5; k += 1) {
    const a = (k * TAU) / 5;
    const tip = new THREE.Vector3(Math.cos(a) * 0.1, 0.22, Math.sin(a) * 0.1);
    parts.push(rod(new THREE.Vector3(0, 0.02, 0), tip, 0.006, "#d9e8c6"));
    parts.push({
      geometry: ball,
      matrix: place(
        tip.toArray() as [number, number, number],
        [0, 0, 0],
        0.016,
      ),
      color: "#e8833a",
    });
  }
  return merge(parts);
}

function buildHydrangea() {
  const palette = ["#a893ec", "#c4b6ff", "#f2b5cd", "#9a86e0"];
  const parts: Part[] = [
    {
      geometry: ball,
      matrix: place([0, 0.02, 0], [0, 0, 0], [0.15, 0.1, 0.15]),
      color: "#7f6bc4",
    },
  ];
  const count = 46;
  for (let i = 0; i < count; i += 1) {
    const cosPhi = 1 - ((i + 0.5) / count) * 1.0;
    const phi = Math.acos(cosPhi);
    const a = i * 2.39996;
    const n = new THREE.Vector3(
      Math.sin(phi) * Math.cos(a),
      cosPhi,
      Math.sin(phi) * Math.sin(a),
    );
    const pos = n.clone().multiplyScalar(0.2);
    pos.y *= 0.8;
    const q = new THREE.Quaternion().setFromUnitVectors(up, n);
    const e = new THREE.Euler().setFromQuaternion(q, "YXZ");
    parts.push({
      geometry: ball,
      matrix: place(
        pos.toArray() as [number, number, number],
        [e.x, e.y, e.z],
        [0.055, 0.02, 0.055],
      ),
      color: palette[i % palette.length],
    });
  }
  return merge(parts);
}

function buildBabysBreath() {
  const parts: Part[] = [];
  const branches = 7;
  for (let b = 0; b < branches; b += 1) {
    const a = (b / branches) * TAU + 0.4;
    const lean = 0.25 + (b % 3) * 0.14;
    const dir = new THREE.Vector3(
      Math.sin(a) * lean,
      1,
      Math.cos(a) * lean,
    ).normalize();
    const len = 0.42 + seeded(b + 3) * 0.16;
    const tip = dir.clone().multiplyScalar(len);
    parts.push(rod(new THREE.Vector3(0, 0, 0), tip, 0.006, "#7db46a"));
    for (let k = 0; k < 6; k += 1) {
      const t = 0.45 + (k / 5) * 0.55;
      const base = tip.clone().multiplyScalar(t);
      const off = new THREE.Vector3(
        seeded(b * 9 + k) - 0.5,
        seeded(b * 5 + k + 2) - 0.5,
        seeded(b * 7 + k + 4) - 0.5,
      ).multiplyScalar(0.07);
      const p = base.clone().add(off);
      parts.push(rod(base, p, 0.004, "#8cc277"));
      parts.push({
        geometry: ball,
        matrix: place(
          p.toArray() as [number, number, number],
          [0, 0, 0],
          0.024 + seeded(b + k) * 0.014,
        ),
        color: (b + k) % 5 === 0 ? "#ffd9e3" : "#fffafc",
      });
    }
  }
  return merge(parts);
}

function buildEucalyptus() {
  const parts: Part[] = [];
  const points = [
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0.05, 0.28, 0.02),
    new THREE.Vector3(0.02, 0.58, -0.02),
    new THREE.Vector3(-0.04, 0.8, 0),
  ];
  const curve = new THREE.CatmullRomCurve3(points);
  let previous = curve.getPoint(0);
  for (let k = 1; k <= 10; k += 1) {
    const next = curve.getPoint(k / 10);
    parts.push(rod(previous, next, 0.008, "#5b8f70"));
    previous = next;
  }
  for (let k = 0; k < 9; k += 1) {
    const t = 0.18 + (k / 8) * 0.82;
    const p = curve.getPoint(t);
    const side = k % 2 ? 1 : -1;
    const size = 0.1 - t * 0.04;
    parts.push({
      geometry: ball,
      matrix: place(
        [p.x + side * size * 0.9, p.y, p.z],
        [0, 0, side * -0.5],
        [size, 0.012, size * 0.7],
      ),
      color: k % 3 === 0 ? "#7fb391" : "#5f9a78",
    });
  }
  return merge(parts);
}

const headBuilders: Record<FlowerId, () => THREE.BufferGeometry> = {
  roseWhite: () => buildRose(true),
  rosePink: () => buildRose(false),
  peony: buildPeony,
  tulip: buildTulip,
  lily: buildLily,
  hydrangea: buildHydrangea,
  babysBreath: buildBabysBreath,
  eucalyptus: buildEucalyptus,
};

const headCache = new Map<FlowerId, THREE.BufferGeometry>();
function getHead(id: FlowerId) {
  let geometry = headCache.get(id);
  if (!geometry) {
    geometry = headBuilders[id]();
    headCache.set(id, geometry);
  }
  return geometry;
}

// -------------------------------------------------------------------- layout

const typeScale: Partial<Record<FlowerId, number>> = {
  tulip: 0.78,
  lily: 0.92,
  hydrangea: 0.95,
};

// Heads sit on a spherical cap that widens with the flower count, so the heads
// stay close (like a hand-tied posy) without ever piling onto one another.
function buildLayout(flowers: FlowerId[]) {
  const n = Math.max(1, flowers.length);
  const radius = Math.max(0.7, 0.3 * Math.sqrt(n));
  const cap = 1.08;
  const centerY = mouthY - radius * Math.cos(cap) + 0.02;
  const hold = new THREE.Vector3(0, holdY, 0);

  const items = flowers.map((id, i) => {
    const cosPhi = 1 - (1 - Math.cos(cap)) * ((i + 0.5) / n);
    const phi = Math.acos(cosPhi);
    const a = i * 2.39996;
    const dir = new THREE.Vector3(
      Math.sin(phi) * Math.cos(a),
      cosPhi,
      Math.sin(phi) * Math.sin(a),
    );
    const filler = fillerFlowers.has(id);
    const position = dir
      .clone()
      .multiplyScalar(radius + (filler ? 0.04 : 0))
      .add(new THREE.Vector3(0, centerY, 0));
    const facing = dir
      .clone()
      .add(
        new THREE.Vector3(
          seeded(i + 1) - 0.5,
          seeded(i + 2) - 0.5,
          seeded(i + 3) - 0.5,
        ).multiplyScalar(0.32),
      )
      .normalize();
    const quaternion = new THREE.Quaternion()
      .setFromUnitVectors(up, facing)
      .multiply(
        new THREE.Quaternion().setFromAxisAngle(up, seeded(i + 7) * TAU),
      );
    return {
      id,
      position,
      quaternion,
      scale:
        ((filler ? 1.05 : 0.95) + seeded(i + 40) * 0.16) *
        1.35 *
        (typeScale[id] ?? 1),
    };
  });

  const stems = merge(
    items.map((item, i) => {
      const bend = new THREE.Vector3(
        seeded(i + 21) - 0.5,
        0,
        seeded(i + 31) - 0.5,
      ).multiplyScalar(0.18);
      const start = item.position.clone();
      const mid = start.clone().lerp(hold, 0.55).add(bend);
      const bottom = new THREE.Vector3(
        hold.x + (seeded(i + 4) - 0.5) * 0.08,
        stemEndY,
        hold.z + (seeded(i + 5) - 0.5) * 0.08,
      );
      const curve = new THREE.CatmullRomCurve3([
        start,
        mid,
        hold.clone(),
        bottom,
      ]);
      return {
        geometry: new THREE.TubeGeometry(curve, 16, 0.018, 5, false),
        color: "#6fae5a",
      };
    }),
  );

  return { items, stems, radius };
}

// ------------------------------------------------------------------- the wrap

type SheetOptions = {
  center: number;
  half: number;
  topR: number;
  rimBase: number;
  rimRise: number;
  startY: number;
  pleatCount: number;
  phase: number;
  low: string;
  high: string;
  full?: boolean;
};

function wallRadius(y: number, topR: number) {
  if (y < neckY) {
    const t = clamp01((neckY - y) / (neckY - hemY));
    return neckR + (hemR - neckR) * Math.pow(t, 1.5);
  }
  if (y > mouthY) return topR + (y - mouthY) * 0.5;
  const t = (y - neckY) / (mouthY - neckY);
  return neckR + (topR - neckR) * Math.pow(t, 1.3);
}

function makeSheet(o: SheetOptions) {
  const segU = Math.max(18, Math.round(o.half * 2 * 14));
  const segV = 26;
  const low = new THREE.Color(o.low);
  const high = new THREE.Color(o.high);
  const white = new THREE.Color("#ffffff");
  const color = new THREE.Color();
  const positions: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];

  for (let i = 0; i <= segU; i += 1) {
    const theta = o.center - o.half + (i / segU) * o.half * 2;
    // theta 0 faces the camera. A full wrap dips at the front; a sheet arches up.
    const arch = o.full
      ? 0.5 * (1 + Math.cos(theta - Math.PI))
      : Math.pow(
          Math.max(0, Math.cos(((theta - o.center) / o.half) * (Math.PI / 2))),
          0.75,
        );
    const rim =
      o.rimBase + o.rimRise * arch + 0.03 * Math.sin(theta * 13 + o.phase);
    for (let j = 0; j <= segV; j += 1) {
      const v = j / segV;
      const y = o.startY + v * (rim - o.startY);
      const pleat =
        1 +
        0.05 *
          Math.sin(theta * o.pleatCount + o.phase) *
          (0.2 + 0.8 * smooth(0, 0.8, v));
      const r = wallRadius(y, o.topR) * pleat;
      positions.push(Math.sin(theta) * r, y, Math.cos(theta) * r);
      color
        .copy(low)
        .lerp(high, Math.pow(v, 1.2))
        .lerp(white, smooth(0.9, 1, v) * 0.5);
      color.multiplyScalar(
        0.94 + 0.06 * Math.sin(theta * o.pleatCount + o.phase),
      );
      colors.push(color.r, color.g, color.b);
    }
  }
  for (let i = 0; i < segU; i += 1) {
    for (let j = 0; j < segV; j += 1) {
      const a = i * (segV + 1) + j;
      const c = a + segV + 1;
      indices.push(a, c, a + 1, a + 1, c, c + 1);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3),
  );
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

// A flat ribbon swept along a curve, facing `facing`.
function ribbonStrip(
  points: THREE.Vector3[],
  width: number,
  facing: THREE.Vector3,
  taper = 0,
) {
  const curve = new THREE.CatmullRomCurve3(points);
  const steps = 36;
  const positions: number[] = [];
  const indices: number[] = [];
  for (let k = 0; k <= steps; k += 1) {
    const t = k / steps;
    const p = curve.getPoint(t);
    const side = curve
      .getTangent(t)
      .cross(facing)
      .normalize()
      .multiplyScalar((width / 2) * (1 - taper * t));
    positions.push(
      p.x - side.x,
      p.y - side.y,
      p.z - side.z,
      p.x + side.x,
      p.y + side.y,
      p.z + side.z,
    );
  }
  for (let k = 0; k < steps; k += 1) {
    const a = k * 2;
    indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3),
  );
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

const v3 = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

function Wrapping({ radius }: { radius: number }) {
  const mouthR = radius * 0.95 + 0.22;

  const sheets = useMemo(() => {
    const rise = radius;
    const list: SheetOptions[] = [
      {
        center: Math.PI,
        half: Math.PI,
        topR: mouthR,
        rimBase: -0.1,
        rimRise: 0.3,
        startY: hemY,
        pleatCount: 7,
        phase: 0,
        low: "#e98aa4",
        high: "#f6b7c8",
        full: true,
      },
      {
        center: Math.PI,
        half: 1.2,
        topR: mouthR + 0.3,
        rimBase: 0.2,
        rimRise: rise * 0.5,
        startY: -0.7,
        pleatCount: 5,
        phase: 1,
        low: "#f2aec2",
        high: "#fbd5df",
      },
      {
        center: 2.45,
        half: 1.1,
        topR: mouthR + 0.2,
        rimBase: 0.15,
        rimRise: rise * 0.36,
        startY: -0.7,
        pleatCount: 6,
        phase: 2,
        low: "#f7c4d2",
        high: "#ffeef2",
      },
      {
        center: -2.45,
        half: 1.1,
        topR: mouthR + 0.22,
        rimBase: 0.15,
        rimRise: rise * 0.38,
        startY: -0.7,
        pleatCount: 6,
        phase: 3,
        low: "#efa8be",
        high: "#fbd0dc",
      },
    ];
    return list.map((options) => ({ options, geometry: makeSheet(options) }));
  }, [radius, mouthR]);
  useEffect(() => () => sheets.forEach((s) => s.geometry.dispose()), [sheets]);

  const solid = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        vertexColors: true,
        roughness: 0.7,
        sheen: 0.6,
        sheenColor: new THREE.Color("#ffd9e3"),
        side: THREE.DoubleSide,
      }),
    [],
  );
  const tissue = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        vertexColors: true,
        roughness: 0.55,
        transparent: true,
        opacity: 0.7,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    [],
  );

  const ribbonMaterial = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: "#f3a6ba",
        roughness: 0.3,
        sheen: 1,
        sheenColor: new THREE.Color("#ffd0dc"),
        clearcoat: 0.4,
        side: THREE.DoubleSide,
      }),
    [],
  );
  const bow = useMemo(() => {
    const face = v3(0, 0, 1);
    const geometries: THREE.BufferGeometry[] = [];
    [-1, 1].forEach((s) => {
      geometries.push(
        ribbonStrip(
          [
            v3(0, 0, 0),
            v3(s * 0.12, 0.13, 0.03),
            v3(s * 0.32, 0.12, 0.05),
            v3(s * 0.34, -0.06, 0.04),
            v3(s * 0.14, -0.06, 0.02),
            v3(0, 0, 0),
          ],
          0.1,
          face,
        ),
      );
      geometries.push(
        ribbonStrip(
          [
            v3(0, 0, 0),
            v3(s * 0.1, 0.06, 0.04),
            v3(s * 0.2, 0.2, 0.05),
            v3(s * 0.12, 0.26, 0.04),
          ],
          0.08,
          face,
        ),
      );
    });
    const tails: [number, number, number][] = [
      [-0.12, 0.95, 0.07],
      [0.1, 1.15, -0.05],
      [-0.2, 1.3, 0.1],
      [0.22, 0.85, 0.09],
    ];
    tails.forEach(([dx, len, wave], k) => {
      const s = dx > 0 ? 1 : -1;
      const pts = [
        v3(0, 0, 0.02),
        v3(dx * 0.5, -len * 0.25, 0.05 + wave),
        v3(dx * 1.3 + s * 0.08, -len * 0.55, 0.1 - wave),
        v3(dx * 2.0, -len * 0.8, 0.12 + wave * 0.5),
        v3(dx * 2.4, -len, 0.12),
      ];
      geometries.push(
        ribbonStrip(
          pts,
          0.085 - k * 0.006,
          k % 2 ? v3(0, 0.3, 1).normalize() : face,
          0.35,
        ),
      );
    });
    const merged = mergeGeometries(
      geometries.map((g) => g.toNonIndexed()),
      false,
    );
    geometries.forEach((g) => g.dispose());
    return merged;
  }, []);
  useEffect(() => () => bow?.dispose(), [bow]);

  return (
    <group>
      {sheets.map(({ options, geometry }, i) => (
        <mesh
          key={i}
          geometry={geometry}
          material={options.full ? solid : tissue}
          renderOrder={options.full ? 1 : 3}
        />
      ))}
      <mesh
        position={[0, neckY + 0.02, 0]}
        rotation={[Math.PI / 2, 0, 0]}
        material={ribbonMaterial}
      >
        <torusGeometry args={[neckR + 0.03, 0.04, 10, 40]} />
      </mesh>
      {bow && (
        <mesh
          geometry={bow}
          material={ribbonMaterial}
          position={[0, neckY + 0.02, neckR + 0.06]}
          scale={1.5}
        />
      )}
      <mesh
        position={[0, neckY + 0.02, neckR + 0.08]}
        scale={[0.08, 0.075, 0.06]}
        material={ribbonMaterial}
      >
        <sphereGeometry args={[1, 14, 10]} />
      </mesh>
    </group>
  );
}

// Dark green leaves fanning out around the rim, like the greenery in a posy.
function Greenery({ radius }: { radius: number }) {
  const leaves = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) => {
        const a = (i / 12) * TAU + seeded(i + 70) * 0.25;
        return {
          a,
          lean: 0.55 + seeded(i + 71) * 0.4,
          geometry: makeLeaf(
            0.8 + seeded(i + 80) * 0.5,
            0.11 + seeded(i + 85) * 0.04,
            0.35 + seeded(i + 90) * 0.35,
            "#245f33",
            "#4f9a55",
          ),
        };
      }),
    [],
  );
  useEffect(() => () => leaves.forEach((l) => l.geometry.dispose()), [leaves]);
  const material = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        vertexColors: true,
        roughness: 0.5,
        side: THREE.DoubleSide,
      }),
    [],
  );
  return (
    <>
      {leaves.map((leaf, i) => (
        <group
          key={i}
          rotation={[0, leaf.a - Math.PI / 2, 0]}
          position={[
            Math.sin(leaf.a) * radius * 0.78,
            -0.1,
            Math.cos(leaf.a) * radius * 0.78,
          ]}
        >
          <mesh
            geometry={leaf.geometry}
            material={material}
            rotation={[0, 0, -leaf.lean]}
          />
        </group>
      ))}
    </>
  );
}

// Drag to spin freely: unlimited yaw, limited tilt. It coasts, then idles slowly.
function Bouquet({ flowers }: { flowers: FlowerId[] }) {
  const outer = useRef<THREE.Group>(null);
  const inner = useRef<THREE.Group>(null);
  const gl = useThree((state) => state.gl);
  // ?yaw=<radians> freezes the bouquet at an angle (handy for screenshots).
  const fixedYaw = useMemo(() => {
    if (typeof window === "undefined") return null;
    const value = new URLSearchParams(window.location.search).get("yaw");
    return value === null ? null : Number(value);
  }, []);
  const drag = useRef({
    active: false,
    x: 0,
    y: 0,
    yaw: fixedYaw ?? 0.35,
    pitch: 0.12,
    velocity: 0,
  });

  const layout = useMemo(() => buildLayout(flowers), [flowers]);
  useEffect(
    () => () => {
      layout.stems.dispose();
    },
    [layout],
  );

  const headMaterial = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        vertexColors: true,
        roughness: 0.58,
        sheen: 1,
        sheenRoughness: 0.45,
        sheenColor: new THREE.Color("#ffffff"),
        side: THREE.DoubleSide,
      }),
    [],
  );
  const stemMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6 }),
    [],
  );

  useEffect(() => {
    const element = gl.domElement;
    const state = drag.current;
    const onDown = (event: PointerEvent) => {
      state.active = true;
      state.x = event.clientX;
      state.y = event.clientY;
      state.velocity = 0;
      element.setPointerCapture(event.pointerId);
    };
    const onMove = (event: PointerEvent) => {
      if (!state.active) return;
      const dx = event.clientX - state.x;
      const dy = event.clientY - state.y;
      state.x = event.clientX;
      state.y = event.clientY;
      state.yaw += dx * 0.012;
      state.velocity = dx * 0.012;
      state.pitch = THREE.MathUtils.clamp(state.pitch + dy * 0.006, -0.5, 0.8);
    };
    const onUp = (event: PointerEvent) => {
      state.active = false;
      if (element.hasPointerCapture(event.pointerId))
        element.releasePointerCapture(event.pointerId);
    };
    element.addEventListener("pointerdown", onDown);
    element.addEventListener("pointermove", onMove);
    element.addEventListener("pointerup", onUp);
    element.addEventListener("pointercancel", onUp);
    return () => {
      element.removeEventListener("pointerdown", onDown);
      element.removeEventListener("pointermove", onMove);
      element.removeEventListener("pointerup", onUp);
      element.removeEventListener("pointercancel", onUp);
    };
  }, [gl]);

  useFrame((frame, delta) => {
    const state = drag.current;
    if (!state.active && fixedYaw === null) {
      state.yaw += state.velocity + delta * 0.3;
      state.velocity *= 0.94;
      state.pitch += (0.12 - state.pitch) * Math.min(1, delta * 1.5);
    }
    if (outer.current) outer.current.rotation.y = state.yaw;
    if (inner.current) inner.current.rotation.x = state.pitch;
    // Back the camera off as the bouquet grows so it always fits.
    const distance = 5.8 + layout.radius * 1.5;
    frame.camera.position.z +=
      (distance - frame.camera.position.z) * Math.min(1, delta * 3);
    frame.camera.lookAt(0, -0.45, 0);
  });

  return (
    <group ref={outer}>
      <group ref={inner} position={[0, -0.2, 0]}>
        <mesh geometry={layout.stems} material={stemMaterial} />
        {layout.items.map((item, i) => (
          <mesh
            key={i}
            geometry={getHead(item.id)}
            material={headMaterial}
            position={item.position}
            quaternion={item.quaternion}
            scale={item.scale}
          />
        ))}
        <Greenery radius={layout.radius} />
        <Wrapping radius={layout.radius} />
      </group>
    </group>
  );
}

export default function BouquetCanvas({ flowers }: { flowers: FlowerId[] }) {
  return (
    <Canvas
      dpr={[1, 2]}
      camera={{ position: [0, 0.6, 8.2], fov: 36 }}
      gl={{ alpha: true, antialias: true }}
      style={{ touchAction: "pan-y", userSelect: "none", cursor: "grab" }}
    >
      <Environment resolution={256} environmentIntensity={0.85}>
        <Lightformer
          form="rect"
          intensity={2.6}
          position={[0, 5, 4]}
          scale={[10, 4, 1]}
          color="#fff6f1"
        />
        <Lightformer
          form="rect"
          intensity={1.5}
          position={[-6, 1, 2]}
          rotation-y={Math.PI / 2}
          scale={[6, 5, 1]}
          color="#ffd2dc"
        />
        <Lightformer
          form="rect"
          intensity={1.2}
          position={[6, 0, -2]}
          rotation-y={-Math.PI / 2}
          scale={[6, 5, 1]}
          color="#ffe6ec"
        />
        <Lightformer
          form="rect"
          intensity={0.8}
          position={[0, -4, 3]}
          rotation-x={Math.PI / 2}
          scale={[8, 4, 1]}
          color="#e07a95"
        />
      </Environment>
      <hemisphereLight args={["#fff3f5", "#8a3a4c", 0.6]} />
      <directionalLight position={[3, 5, 5]} intensity={1.3} color="#fff3f0" />
      <Bouquet flowers={flowers} />
      <Sparkles
        count={26}
        scale={[4, 3.6, 4]}
        size={3}
        speed={0.35}
        color="#ffd6dd"
        opacity={0.6}
      />
    </Canvas>
  );
}
