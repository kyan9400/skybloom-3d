/*
 * Procedural district layout. Deterministic (seeded), so every visitor sees the same skyline.
 *
 * Towers sit on a 3.6-unit grid inside a round plot (radius 29) with three avenues each way and a park in the middle.
 * Tall towers are split into a podium + a slimmer upper volume, leaving a terrace for planting.
 * Every volume becomes one instance of a unit box; plants are instances of a 20-triangle leaf cluster.
 */

import type { TierSettings } from "@/lib/quality";
import { nextTask } from "@/lib/schedule";

export const PLOT_RADIUS = 29;
export const MAX_HEIGHT = 44; // used to pack heights into the 8-bit heightfield
export const FIELD_SIZE = 128; // heightfield texels per side
export const FIELD_EXTENT = 64; // world units covered by the heightfield (-32..32)

const CELL = 3.6;
const AVENUE_EVERY = 5;
const PARK_RADIUS = 5.6;

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Volume {
  x: number;
  z: number;
  base: number;
  w: number;
  d: number;
  h: number;
  delay: number;
  seed: number;
  top: number; // full height of the whole tower this volume belongs to
}

interface Tower {
  x: number;
  z: number;
  r: number;
  volumes: Volume[];
}

export interface CityData {
  towerCount: number;
  volumeCount: number;
  /** per volume: x, base y, z */
  offsets: Float32Array;
  /** per volume: width, height, depth */
  sizes: Float32Array;
  /** per volume: growth delay, random seed, tower top, green factor */
  seeds: Float32Array;
  leafCount: number;
  /** per leaf cluster: x, y (full-height position), z */
  anchors: Float32Array;
  /** per leaf cluster: host growth delay, on-tower flag, host tower top */
  hosts: Float32Array;
  /** per leaf cluster: size, bloom delay, hue, phase */
  plants: Float32Array;
  /** RGBA8: R = tower height / MAX_HEIGHT, G = growth delay */
  field: Uint8Array;
}

function makeTowers(rand: () => number): Tower[] {
  const towers: Tower[] = [];
  const span = Math.ceil(PLOT_RADIUS / CELL);
  for (let i = -span; i <= span; i++) {
    for (let j = -span; j <= span; j++) {
      if (i % AVENUE_EVERY === 0 || j % AVENUE_EVERY === 0) continue; // avenues
      const x = i * CELL + (rand() - 0.5) * 0.5;
      const z = j * CELL + (rand() - 0.5) * 0.5;
      const r = Math.hypot(x, z);
      if (r > PLOT_RADIUS || r < PARK_RADIUS) continue;
      const rn = r / PLOT_RADIUS;
      const w = 1.8 + rand() * 1.1;
      const d = 1.8 + rand() * 1.1;
      let h = 3 + 26 * Math.pow(1 - rn, 1.5) * (0.55 + 0.6 * rand()) + rand() * 2.5;
      const delay = Math.min(1, Math.max(0, rn * 0.78 + rand() * 0.22));
      const seed = rand();
      const volumes: Volume[] = [];
      if (h > 13 && rand() < 0.72) {
        const podium = h * (0.32 + rand() * 0.22);
        const shrink = 0.6 + rand() * 0.18;
        volumes.push({ x, z, base: 0, w, d, h: podium, delay, seed, top: h });
        // the upper volume leans towards one corner so terraces differ from tower to tower
        const ox = (rand() - 0.5) * w * (1 - shrink);
        const oz = (rand() - 0.5) * d * (1 - shrink);
        volumes.push({ x: x + ox, z: z + oz, base: podium, w: w * shrink, d: d * shrink, h: h - podium, delay, seed, top: h });
      } else {
        h = Math.max(h, 3.2);
        volumes.push({ x, z, base: 0, w, d, h, delay, seed, top: h });
      }
      towers.push({ x, z, r, volumes });
    }
  }
  // the landmark: one slim timber-hybrid spire just off the park
  const spire = towers.reduce((best, t) => (Math.abs(t.r - 9) < Math.abs(best.r - 9) && t.x < 0 && t.z > 0 ? t : best), towers[0]);
  const top = 42;
  const podium = 9;
  spire.volumes = [
    { x: spire.x, z: spire.z, base: 0, w: 2.8, d: 2.8, h: podium, delay: 0.05, seed: 0.42, top },
    { x: spire.x, z: spire.z, base: podium, w: 2.0, d: 2.0, h: top - podium, delay: 0.05, seed: 0.42, top },
  ];
  // most important first (closest to the centre), so lower tiers keep the heart of the skyline
  towers.sort((a, b) => a.r - b.r);
  return towers;
}

/** Builds the district in a few steps, handing the main thread back between them (no single long task). */
export async function buildCity(settings: TierSettings): Promise<CityData> {
  const rand = mulberry32(20310417);
  const towers = makeTowers(rand).slice(0, settings.towers);
  const volumes = towers.flatMap((t) => t.volumes);

  const offsets = new Float32Array(volumes.length * 3);
  const sizes = new Float32Array(volumes.length * 3);
  const seeds = new Float32Array(volumes.length * 4);
  volumes.forEach((v, i) => {
    offsets.set([v.x, v.base, v.z], i * 3);
    sizes.set([v.w, v.h, v.d], i * 3);
    seeds.set([v.delay, v.seed, v.top, 0.35 + 0.65 * ((v.seed * 7.31) % 1)], i * 4);
  });

  await nextTask();

  // ---- leaf clusters: generate ~2x the budget, shuffle deterministically, keep the budget ----
  type Leaf = [number, number, number, number, number, number, number, number, number, number];
  const leaves: Leaf[] = [];
  const pushLeaf = (x: number, y: number, z: number, hostDelay: number, onTower: number, top: number, size: number, bloomDelay: number) =>
    leaves.push([x, y, z, hostDelay, onTower, top, size, bloomDelay, rand(), rand()]);

  const target = settings.leaves * 2;
  const towerShare = 0.78;
  let surface = 0;
  for (const v of volumes) surface += v.w * v.d + (v.w + v.d) * 2 * v.h * 0.35;
  const density = (target * towerShare) / Math.max(1, surface);

  for (const t of towers) {
    const upper = t.volumes[1];
    for (const v of t.volumes) {
      const roofY = v.base + v.h;
      // roof meadow / terrace (skip the area covered by the upper volume)
      const roofN = Math.round(v.w * v.d * density);
      for (let k = 0; k < roofN; k++) {
        const x = v.x + (rand() - 0.5) * (v.w - 0.3);
        const z = v.z + (rand() - 0.5) * (v.d - 0.3);
        if (v !== upper && upper && Math.abs(x - upper.x) < upper.w / 2 + 0.1 && Math.abs(z - upper.z) < upper.d / 2 + 0.1) continue;
        pushLeaf(x, roofY + 0.12, z, v.delay, 1, v.top, 0.22 + rand() * 0.3, v.delay);
      }
      // facade planters: clusters hanging off the floor slabs, more on some faces than others
      const faceGreen = [rand(), rand(), rand(), rand()].map((g) => 0.25 + g * 0.75);
      const faceN = Math.round((v.w + v.d) * 2 * v.h * 0.35 * density);
      for (let k = 0; k < faceN; k++) {
        const face = Math.floor(rand() * 4);
        if (rand() > faceGreen[face]) continue;
        const floor = Math.floor((v.base + 0.4 + rand() * (v.h - 0.8)) / 0.9);
        const y = floor * 0.9 + 0.18;
        if (y < v.base + 0.2 || y > roofY - 0.2) continue;
        const along = rand() - 0.5;
        const out = 0.1 + rand() * 0.08;
        let x = v.x;
        let z = v.z;
        if (face === 0) { x += v.w / 2 + out; z += along * v.d; }
        else if (face === 1) { x -= v.w / 2 + out; z += along * v.d; }
        else if (face === 2) { z += v.d / 2 + out; x += along * v.w; }
        else { z -= v.d / 2 + out; x += along * v.w; }
        pushLeaf(x, y, z, v.delay, 1, v.top, 0.16 + rand() * 0.2, v.delay);
      }
    }
  }

  await nextTask();

  // ground: park trees, avenue rows and the forest ring around the plot
  const groundN = target * (1 - towerShare);
  let placed = 0;
  let guard = 0;
  while (placed < groundN && guard++ < groundN * 20) {
    const zone = rand();
    let x: number;
    let z: number;
    let scale: number;
    let bloomDelay: number;
    if (zone < 0.3) {
      const a = rand() * Math.PI * 2;
      const r = Math.sqrt(rand()) * (PARK_RADIUS - 0.8);
      x = Math.cos(a) * r;
      z = Math.sin(a) * r;
      scale = 1;
      bloomDelay = -0.6; // the park's existing trees are there from the first frame
    } else if (zone < 0.55) {
      // avenue rows: trees on both sides of each avenue
      const along = (rand() - 0.5) * PLOT_RADIUS * 2;
      const avenue = (Math.floor(rand() * 3) - 1) * CELL * AVENUE_EVERY;
      const side = (rand() < 0.5 ? -1 : 1) * 1.15;
      const spot = Math.round(along / 1.6) * 1.6;
      if (rand() < 0.5) { x = avenue + side; z = spot; } else { x = spot; z = avenue + side; }
      if (Math.hypot(x, z) > PLOT_RADIUS) continue;
      scale = 0.75;
      bloomDelay = Math.min(1, Math.hypot(x, z) / 42); // street trees are planted with the bloom
    } else {
      const a = rand() * Math.PI * 2;
      const r = PLOT_RADIUS + 3 + Math.pow(rand(), 0.7) * 26;
      // keep the meadow in front of the opening camera clear (it starts low, on the +z side)
      const deg = (a * 180) / Math.PI;
      if (deg > 55 && deg < 120 && r < 66) continue;
      x = Math.cos(a) * r;
      z = Math.sin(a) * r;
      scale = 1.25 + rand() * 0.6;
      bloomDelay = -1; // the surrounding forest is always there
    }
    const layers = 2 + Math.floor(rand() * 2);
    for (let l = 0; l < layers; l++) {
      const size = (0.62 - l * 0.14 + rand() * 0.2) * scale;
      pushLeaf(x + (rand() - 0.5) * 0.3 * scale, (0.75 + l * 0.48) * scale, z + (rand() - 0.5) * 0.3 * scale, 0, 0, 0, size, bloomDelay);
      placed++;
    }
  }

  await nextTask();

  // deterministic shuffle, keep the budget
  for (let i = leaves.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [leaves[i], leaves[j]] = [leaves[j], leaves[i]];
  }
  const kept = leaves.slice(0, settings.leaves);
  const anchors = new Float32Array(kept.length * 3);
  const hosts = new Float32Array(kept.length * 3);
  const plants = new Float32Array(kept.length * 4);
  kept.forEach((l, i) => {
    anchors.set([l[0], l[1], l[2]], i * 3);
    hosts.set([l[3], l[4], l[5]], i * 3);
    plants.set([l[6], l[7], l[8], l[9]], i * 4);
  });

  await nextTask();

  // ---- heightfield for ground shadows ----
  const field = new Uint8Array(FIELD_SIZE * FIELD_SIZE * 4);
  const texel = FIELD_EXTENT / FIELD_SIZE;
  for (const v of volumes) {
    const top = v.base + v.h;
    const i0 = Math.max(0, Math.floor((v.x - v.w / 2 + FIELD_EXTENT / 2) / texel));
    const i1 = Math.min(FIELD_SIZE - 1, Math.floor((v.x + v.w / 2 + FIELD_EXTENT / 2) / texel));
    const j0 = Math.max(0, Math.floor((v.z - v.d / 2 + FIELD_EXTENT / 2) / texel));
    const j1 = Math.min(FIELD_SIZE - 1, Math.floor((v.z + v.d / 2 + FIELD_EXTENT / 2) / texel));
    for (let j = j0; j <= j1; j++) {
      for (let i = i0; i <= i1; i++) {
        const k = (j * FIELD_SIZE + i) * 4;
        const h = Math.round((top / MAX_HEIGHT) * 255);
        if (h > field[k]) {
          field[k] = h;
          field[k + 1] = Math.round(v.delay * 255);
          field[k + 3] = 255;
        }
      }
    }
  }

  return {
    towerCount: towers.length,
    volumeCount: volumes.length,
    offsets,
    sizes,
    seeds,
    leafCount: kept.length,
    anchors,
    hosts,
    plants,
    field,
  };
}
