/*
 * Quality tier, decided BEFORE the Canvas is created.
 * One throwaway WebGL context tells us whether 3D works at all and which GPU this is.
 *   software renderers -> low · integrated laptop / phone GPUs -> at most medium · touch devices -> at most medium
 *   ?quality=low|medium|high overrides.
 */

export type Tier = "low" | "medium" | "high";

export interface TierSettings {
  dprCap: number;
  antialias: boolean;
  towers: number;
  leaves: number;
  sway: boolean;
}

export const TIERS: Record<Tier, TierSettings> = {
  high: { dprCap: 2, antialias: true, towers: 150, leaves: 7000, sway: true },
  medium: { dprCap: 1.5, antialias: true, towers: 100, leaves: 4000, sway: false },
  low: { dprCap: 1, antialias: false, towers: 60, leaves: 1600, sway: false },
};

export interface GpuProbe {
  webgl: boolean;
  tier: Tier;
  gpu: string;
}

let cached: GpuProbe | null = null;

function isTier(value: string | null): value is Tier {
  return value === "low" || value === "medium" || value === "high";
}

function gpuName(gl: WebGL2RenderingContext | WebGLRenderingContext) {
  const name = String(gl.getParameter(gl.RENDERER) || "");
  if (!/^webkit/i.test(name)) return name; // Firefox already reports the real name
  const info = gl.getExtension("WEBGL_debug_renderer_info");
  return info ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL) || name) : name;
}

/** Client only, cached after the first call. */
export function probeGpu(): GpuProbe {
  if (cached) return cached;
  const forced = new URLSearchParams(window.location.search).get("quality");
  let gl: WebGL2RenderingContext | null = null;
  try {
    gl = document.createElement("canvas").getContext("webgl2", { powerPreference: "high-performance" });
  } catch {
    gl = null;
  }
  if (!gl) {
    cached = { webgl: false, tier: "low", gpu: "" };
    return cached;
  }
  const gpu = gpuName(gl);
  gl.getExtension("WEBGL_lose_context")?.loseContext(); // free it right away

  let tier: Tier = "high";
  const nav = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };
  const cores = nav.hardwareConcurrency || 4;
  const memory = nav.deviceMemory || 4;
  const touch = window.matchMedia("(pointer: coarse)").matches;
  if (/swiftshader|llvmpipe|software|basic render/i.test(gpu) || nav.connection?.saveData || cores <= 2 || memory <= 2) tier = "low";
  else if (touch || cores <= 4 || /intel|uhd|iris|mali|adreno|powervr|apple gpu|radeon\(tm\) graphics|radeon graphics/i.test(gpu)) tier = "medium";
  if (isTier(forced)) tier = forced;

  cached = { webgl: true, tier, gpu };
  return cached;
}
