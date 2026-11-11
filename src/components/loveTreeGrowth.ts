// Procedural tree for the love tree. Every branch gets its angle and length from
// a hash of its own id, never from a running random generator, so a tree with
// more levels is the same tree as before plus new twigs: nothing jumps around
// as the days go by, and everyone who opens the page sees the same tree.

export type Branch = {
  id: number;
  level: number;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  width: number;
  length: number;
};

export const baseX = 150;
export const baseY = 312;
export const maxDepth = 7;

// The step at which each extra level of branches appears.
const depthSteps = [1, 4, 9, 16, 26, 40, 60] as const;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

function hash(seed: number) {
  const value = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return value - Math.floor(value);
}

export function depthForStep(step: number) {
  return depthSteps.reduce((depth, from, index) => (step >= from ? index + 1 : depth), 0);
}

export function trunkWidth(step: number) {
  return clamp(2.5 + step * 0.14, 2.5, 16);
}

export function treeScale(step: number) {
  return 0.35 + 0.65 * clamp((step - 1) / 100, 0, 1);
}

export function buildBranches(step: number): Branch[] {
  const depth = depthForStep(step);
  if (depth === 0) return [];

  const trunkLength = 60 + 42 * clamp(step / 60, 0, 1);
  const out: Branch[] = [];

  const grow = (
    id: number,
    level: number,
    x: number,
    y: number,
    angle: number,
    length: number,
    width: number,
  ) => {
    const x2 = x + Math.sin(angle) * length;
    const y2 = y - Math.cos(angle) * length;
    out.push({ id, level, x1: x, y1: y, x2, y2, width, length });
    if (level + 1 >= depth) return;

    const childWidth = Math.max(0.9, width * 0.66);
    const spread = 0.38 + hash(id * 3 + 1) * 0.3;
    const ratio = 0.68 + hash(id * 5 + 2) * 0.1;
    grow(id * 4 + 1, level + 1, x2, y2, angle - spread, length * ratio, childWidth);
    grow(id * 4 + 2, level + 1, x2, y2, angle + spread * (0.8 + hash(id) * 0.4), length * (ratio - 0.03), childWidth);
    if (level < 4 && hash(id * 7 + 3) < 0.4) {
      grow(id * 4 + 3, level + 1, x2, y2, angle + (hash(id * 11) - 0.5) * 0.3, length * (ratio - 0.1), childWidth * 0.9);
    }
  };

  grow(1, 0, baseX, baseY, 0, trunkLength, trunkWidth(step));
  return out;
}

export type Tip = { x: number; y: number; r: number; rank: number; tone: number };

// Where the leaves and blossoms sit: the ends of the outermost levels, each
// with a stable `rank` so blossoms open in the same order every time.
export function leafTips(branches: Branch[], step: number): Tip[] {
  const depth = depthForStep(step);
  const fromLevel = Math.max(1, depth - 3);
  return branches
    .filter((branch) => branch.level >= fromLevel)
    .map((branch) => ({
      x: branch.x2,
      y: branch.y2,
      r: clamp(branch.length * 0.8, 9, 20),
      rank: hash(branch.id * 13 + 5),
      tone: hash(branch.id * 17 + 9),
    }));
}

// A resting place for the nest and birds: the end of a mid-level branch.
export function perch(branches: Branch[], level: number, side: number) {
  const found = branches.filter((branch) => branch.level === level);
  return found[side] ?? found[0] ?? null;
}
