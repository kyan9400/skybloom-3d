/*
 * Quality tier, decided BEFORE the Canvas is created.
 * One throwaway WebGL context tells us whether 3D works at all and which GPU this is.
 *   software renderers -> no 3D at all (poster) · integrated laptop / phone GPUs -> at most medium · touch devices -> at most medium
 *   ?quality=low|medium|high overrides (and forces the 3D on, even on a software renderer).
 */

export type Tier = "low" | "medium" | "high";

export interface TierSettings {
  dprCap: number;
  antialias: boolean;
  towers: number;
  leaves: number;
  sway: boolean;
  /** perimeter points of the rounded tower section */
  seg: number;
  /** towers shadow each other (heightfield march in the facade shader) */
  selfShadow: boolean;
  /** additive lamp glows at dusk (one extra draw call) */
  glow: boolean;
  /** scanned park trees (Poly Haven island_tree_02, instanced) */
  parkTrees: number;
  /** scanned street trees: every n-th planting spot along the avenues */
  avenueStride: number;
  /** scanned shrubs (Poly Haven shrub_02) on roofs and terraces */
  shrubs: number;
}

export const TIERS: Record<Tier, TierSettings> = {
  high: { dprCap: 2, antialias: true, towers: 150, leaves: 7000, sway: true, seg: 48, selfShadow: true, glow: true, parkTrees: 30, avenueStride: 1, shrubs: 900 },
  medium: { dprCap: 1.5, antialias: true, towers: 100, leaves: 4000, sway: false, seg: 32, selfShadow: true, glow: false, parkTrees: 22, avenueStride: 2, shrubs: 420 },
  low: { dprCap: 1, antialias: false, towers: 60, leaves: 1600, sway: false, seg: 16, selfShadow: false, glow: false, parkTrees: 14, avenueStride: 3, shrubs: 150 },
};

export interface GpuProbe {
  /** a WebGL2 context could be created (with ?quality= forced, even a slow one) */
  webgl: boolean;
  /** software rasteriser (SwiftShader, llvmpipe, ...) or the browser flagged a major performance caveat */
  software: boolean;
  /** ?quality=low|medium|high was given: show the 3D whatever the GPU */
  forced: boolean;
  tier: Tier;
  gpu: string;
}

let cached: GpuProbe | null = null;

const SOFTWARE_GPU = /swiftshader|llvmpipe|softpipe|software|basic render|mesa offscreen/i;

function isTier(value: string | null): value is Tier {
  return value === "low" || value === "medium" || value === "high";
}

function gpuName(gl: WebGL2RenderingContext) {
  const name = String(gl.getParameter(gl.RENDERER) || "");
  if (!/^webkit/i.test(name)) return name; // Firefox already reports the real name
  const info = gl.getExtension("WEBGL_debug_renderer_info");
  return info ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL) || name) : name;
}

function context(options: WebGLContextAttributes): WebGL2RenderingContext | null {
  try {
    return document.createElement("canvas").getContext("webgl2", options);
  } catch {
    return null;
  }
}

/**
 * Client only, cached after the first call. Cheap: a 300x150 throwaway context, no three.js.
 * Call it after the page has loaded (see StoryStage), never during hydration.
 */
export function probeGpu(): GpuProbe {
  if (cached) return cached;
  const param = new URLSearchParams(window.location.search).get("quality");
  const forced = isTier(param);

  // the browser refuses this when it would fall back to a slow (software) path
  let gl = context({ failIfMajorPerformanceCaveat: true });
  let caveat = false;
  if (!gl) {
    caveat = true;
    // only worth a second context when the URL insists on 3D anyway
    if (forced) gl = context({});
  }
  if (!gl) {
    cached = { webgl: false, software: caveat, forced, tier: "low", gpu: "" };
    return cached;
  }
  const gpu = gpuName(gl);
  gl.getExtension("WEBGL_lose_context")?.loseContext(); // free it right away
  const software = caveat || SOFTWARE_GPU.test(gpu);

  let tier: Tier = "high";
  const nav = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };
  const cores = nav.hardwareConcurrency || 4;
  const memory = nav.deviceMemory || 4;
  const touch = window.matchMedia("(pointer: coarse)").matches;
  if (software || nav.connection?.saveData || cores <= 2 || memory <= 2) tier = "low";
  else if (touch || cores <= 4 || /intel|uhd|iris|mali|adreno|powervr|apple gpu|radeon\(tm\) graphics|radeon graphics/i.test(gpu)) tier = "medium";
  if (forced) tier = param;

  cached = { webgl: true, software, forced, tier, gpu };
  return cached;
}

/** Software renderers get the poster, not the 3D, unless ?quality= forces it. */
export function wants3d(probe: GpuProbe): boolean {
  return probe.webgl && (!probe.software || probe.forced);
}
