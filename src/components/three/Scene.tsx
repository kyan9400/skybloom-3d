"use client";

/*
 * The signature moment: a district that grows as you scroll.
 * Four draw calls (sky, ground, towers, plants), no textures except a tiny generated heightfield, no shadow maps.
 * Render on demand: frames are requested by scroll / pointer, and while the damped scroll value is still settling
 * or the wind sway is running (high tier, full motion, on screen).
 */

import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { TIERS, type Tier, type TierSettings } from "@/lib/quality";
import { story } from "@/lib/story";
import { buildCity, FIELD_EXTENT, FIELD_SIZE, MAX_HEIGHT, PLOT_RADIUS } from "./city";
import {
  groundFragment,
  groundVertex,
  plantFragment,
  plantVertex,
  skyFragment,
  skyVertex,
  towerFragment,
  towerVertex,
} from "./shaders";

/* ------------------------------------------------------------------ scroll -> scene mapping */

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

// camera keyframes: [progress, position, look-at]
const CAMERA_KEYS: [number, [number, number, number], [number, number, number]][] = [
  [0.0, [8, 1.8, 46], [0, 6.5, 0]],
  [0.2, [-6, 3.2, 42], [0, 7.5, 0]],
  [0.42, [-30, 12, 34], [0, 11, 0]],
  [0.64, [-38, 20, 8], [0, 12, 0]],
  [0.84, [-14, 30, 44], [0, 9, 0]],
  [1.0, [18, 33, 54], [-2, 7, -4]],
];

// time of day: morning -> noon -> golden hour -> dusk
interface SkyKey {
  at: number;
  zenith: string;
  horizon: string;
  sun: string;
  sunIntensity: number;
  fog: string;
  ground: string;
  sunDir: [number, number, number];
}
const SKY_KEYS: SkyKey[] = [
  { at: 0.0, zenith: "#8cb6d6", horizon: "#f6dcbc", sun: "#ffe2b8", sunIntensity: 1.0, fog: "#e6dcc9", ground: "#6b7458", sunDir: [0.78, 0.32, -0.36] },
  { at: 0.42, zenith: "#5b98cf", horizon: "#d8e6ec", sun: "#fff4e2", sunIntensity: 1.15, fog: "#d2dfe2", ground: "#6f7a5a", sunDir: [0.32, 0.88, -0.28] },
  { at: 0.72, zenith: "#6a8bb6", horizon: "#f6b57c", sun: "#ffb46b", sunIntensity: 1.0, fog: "#e5b98f", ground: "#6a5f48", sunDir: [-0.5, 0.22, -0.82] },
  { at: 1.0, zenith: "#1c1f46", horizon: "#de7658", sun: "#ff7a48", sunIntensity: 0.6, fog: "#5a3d52", ground: "#2c2533", sunDir: [-0.6, 0.035, -0.8] },
];

/* ------------------------------------------------------------------ geometry */

function makeTowerGeometry(offsets: Float32Array, sizes: Float32Array, seeds: Float32Array, count: number) {
  const box = new THREE.BoxGeometry(1, 1, 1);
  box.translate(0, 0.5, 0);
  const geo = new THREE.InstancedBufferGeometry();
  geo.index = box.index;
  geo.setAttribute("position", box.getAttribute("position"));
  geo.setAttribute("normal", box.getAttribute("normal"));
  geo.setAttribute("aOffset", new THREE.InstancedBufferAttribute(offsets, 3));
  geo.setAttribute("aSize", new THREE.InstancedBufferAttribute(sizes, 3));
  geo.setAttribute("aSeed", new THREE.InstancedBufferAttribute(seeds, 4));
  geo.instanceCount = count;
  return geo;
}

function makePlantGeometry(anchors: Float32Array, hosts: Float32Array, plants: Float32Array, count: number) {
  const ico = new THREE.IcosahedronGeometry(1, 0);
  const geo = new THREE.InstancedBufferGeometry();
  geo.setAttribute("position", ico.getAttribute("position"));
  geo.setAttribute("aAnchor", new THREE.InstancedBufferAttribute(anchors, 3));
  geo.setAttribute("aHost", new THREE.InstancedBufferAttribute(hosts, 3));
  geo.setAttribute("aPlant", new THREE.InstancedBufferAttribute(plants, 4));
  geo.instanceCount = count;
  return geo;
}

/* ------------------------------------------------------------------ adaptive resolution */

// Frame times are only measured between consecutive drawn frames (render on demand leaves long gaps).
// Slow frames -> jump the pixel ratio down; 2 s of fast frames -> step back up; a raise that has to be
// undone twice stops further raises, so the canvas never keeps reallocating.
function useAdaptiveDpr(cap: number) {
  const setDpr = useThree((s) => s.setDpr);
  const state = useRef({ dpr: cap, avg: 16.7, settleUntil: 0, calmSince: 0, lastRaise: -1e9, bounces: 0 });
  return (deltaMs: number, now: number) => {
    const s = state.current;
    if (deltaMs < 4 || deltaMs > 100) return;
    s.avg += (deltaMs - s.avg) * 0.1;
    if (now < s.settleUntil) return;
    const floor = Math.min(1, cap) * 0.75;
    const apply = (value: number) => {
      s.dpr = value;
      setDpr(value);
      s.settleUntil = now + 600;
      s.calmSince = 0;
      s.avg = 16.7;
    };
    if (s.avg > 21 && s.dpr > floor) {
      if (now - s.lastRaise < 3000) s.bounces++;
      apply(Math.max(floor, Math.min(s.dpr - 0.25, s.dpr * Math.sqrt(17.5 / s.avg))));
    } else if (s.avg < 17.5 && s.dpr < cap && s.bounces < 2) {
      if (!s.calmSince) s.calmSince = now;
      if (now - s.calmSince > 2000) {
        apply(Math.min(cap, s.dpr + 0.25));
        s.lastRaise = now;
      }
    } else s.calmSince = 0;
  };
}

/* ------------------------------------------------------------------ the district */

interface DistrictProps {
  settings: TierSettings;
  cap: number;
  reducedMotion: boolean;
  onReady: () => void;
}

function District({ settings, cap, reducedMotion, onReady }: DistrictProps) {
  const { gl, scene, camera, invalidate, size, get } = useThree();
  const skyRef = useRef<THREE.Mesh>(null);
  const reducedRef = useRef(reducedMotion);
  const adapt = useAdaptiveDpr(cap);

  const city = useMemo(() => buildCity(settings), [settings]);

  const assets = useMemo(() => {
    const shared = {
      uSunDir: { value: new THREE.Vector3(0.78, 0.32, -0.36).normalize() },
      uSunColor: { value: new THREE.Color() },
      uZenith: { value: new THREE.Color() },
      uHorizon: { value: new THREE.Color() },
      uGroundColor: { value: new THREE.Color() },
      uFogColor: { value: new THREE.Color() },
      uFogDensity: { value: 0.0085 },
      uGrow: { value: 0 },
      uBloom: { value: 0 },
      uDusk: { value: 0 },
      uTime: { value: 0 },
    };
    const field = new THREE.DataTexture(city.field, FIELD_SIZE, FIELD_SIZE, THREE.RGBAFormat);
    field.magFilter = THREE.NearestFilter;
    field.minFilter = THREE.NearestFilter;
    field.generateMipmaps = false;
    field.needsUpdate = true;

    const sky = new THREE.ShaderMaterial({
      vertexShader: skyVertex,
      fragmentShader: skyFragment,
      uniforms: { ...shared },
      side: THREE.BackSide,
      depthWrite: false,
    });
    const ground = new THREE.ShaderMaterial({
      vertexShader: groundVertex,
      fragmentShader: groundFragment,
      uniforms: {
        ...shared,
        uField: { value: field },
        uFieldExtent: { value: FIELD_EXTENT },
        uMaxHeight: { value: MAX_HEIGHT },
        uPlotRadius: { value: PLOT_RADIUS },
      },
    });
    const towers = new THREE.ShaderMaterial({ vertexShader: towerVertex, fragmentShader: towerFragment, uniforms: { ...shared } });
    const plants = new THREE.ShaderMaterial({
      vertexShader: plantVertex,
      fragmentShader: plantFragment,
      uniforms: { ...shared, uSway: { value: 0 } },
    });
    const towerGeo = makeTowerGeometry(city.offsets, city.sizes, city.seeds, city.volumeCount);
    const plantGeo = makePlantGeometry(city.anchors, city.hosts, city.plants, city.leafCount);
    const groundGeo = new THREE.CircleGeometry(260, 64);
    groundGeo.rotateX(-Math.PI / 2);
    const skyGeo = new THREE.SphereGeometry(300, 32, 16);

    const curvePos = new THREE.CatmullRomCurve3(CAMERA_KEYS.map((k) => new THREE.Vector3(...k[1])), false, "centripetal");
    const curveLook = new THREE.CatmullRomCurve3(CAMERA_KEYS.map((k) => new THREE.Vector3(...k[2])), false, "centripetal");
    const skyKeys = SKY_KEYS.map((k) => ({
      at: k.at,
      zenith: new THREE.Color(k.zenith),
      horizon: new THREE.Color(k.horizon),
      sun: new THREE.Color(k.sun).multiplyScalar(k.sunIntensity),
      fog: new THREE.Color(k.fog),
      ground: new THREE.Color(k.ground),
      sunDir: new THREE.Vector3(...k.sunDir).normalize(),
    }));
    return { shared, field, sky, ground, towers, plants, towerGeo, plantGeo, groundGeo, skyGeo, curvePos, curveLook, skyKeys };
  }, [city]);

  // free GPU memory when the scene goes away
  useEffect(
    () => () => {
      const a = assets;
      [a.sky, a.ground, a.towers, a.plants, a.towerGeo, a.plantGeo, a.groundGeo, a.skyGeo, a.field].forEach((o) => o.dispose());
    },
    [assets],
  );

  // reusable scratch objects: nothing is allocated per frame
  const scratchRef = useRef({
    pos: new THREE.Vector3(),
    look: new THREE.Vector3(),
    offset: new THREE.Vector3(),
    current: story.target,
    px: 0,
    py: 0,
    time: 0,
  });
  // the frame loop reads the GPU resources through a ref (they are mutated every frame: uniforms)
  const assetsRef = useRef(assets);
  useEffect(() => {
    assetsRef.current = assets;
  }, [assets]);

  useEffect(() => {
    reducedRef.current = reducedMotion;
    invalidate();
  }, [reducedMotion, invalidate]);

  // hand the scene's invalidate to the DOM side (scroll / pointer handlers)
  useEffect(() => {
    story.invalidate = invalidate;
    return () => {
      story.invalidate = null;
    };
  }, [invalidate]);

  // warm-up: compile every shader before the canvas is revealed
  useEffect(() => {
    let cancelled = false;
    const reveal = () => {
      if (cancelled) return;
      invalidate();
      requestAnimationFrame(() => requestAnimationFrame(() => !cancelled && onReady()));
    };
    gl.compileAsync(scene, camera).then(reveal, reveal);
    return () => {
      cancelled = true;
    };
  }, [gl, scene, camera, invalidate, onReady]);

  const portrait = size.width / Math.max(1, size.height) < 1;
  useEffect(() => {
    const cam = get().camera as THREE.PerspectiveCamera;
    cam.fov = portrait ? 56 : 42;
    cam.updateProjectionMatrix();
    invalidate();
  }, [get, portrait, invalidate]);

  useFrame((state, delta) => {
    const now = performance.now();
    adapt(delta * 1000, now);
    const reduced = reducedRef.current;
    const dt = Math.min(delta, 1 / 30); // after an idle gap, do not jump
    const s = scratchRef.current;
    const assets = assetsRef.current;

    // the ONLY smoothing layer for scroll; reduced motion cuts straight to the scroll position
    if (reduced) s.current = story.target;
    else {
      s.current += (story.target - s.current) * (1 - Math.exp(-dt * 7));
      if (Math.abs(story.target - s.current) < 0.0002) s.current = story.target;
    }
    const p = s.current;
    const u = assets.shared;
    u.uGrow.value = smooth(0.1, 0.56, p);
    u.uBloom.value = smooth(0.4, 0.8, p);
    u.uDusk.value = smooth(0.76, 0.97, p);

    // sky / light keyframes
    const tod = Math.min(1, p / 0.96);
    const keys = assets.skyKeys;
    let i = 0;
    while (i < keys.length - 2 && tod > keys[i + 1].at) i++;
    const a = keys[i];
    const b = keys[i + 1];
    const k = smooth(a.at, b.at, tod);
    u.uZenith.value.lerpColors(a.zenith, b.zenith, k);
    u.uHorizon.value.lerpColors(a.horizon, b.horizon, k);
    u.uSunColor.value.lerpColors(a.sun, b.sun, k);
    u.uFogColor.value.lerpColors(a.fog, b.fog, k);
    u.uGroundColor.value.lerpColors(a.ground, b.ground, k);
    u.uSunDir.value.lerpVectors(a.sunDir, b.sunDir, k).normalize();

    // camera path
    let c = 0;
    while (c < CAMERA_KEYS.length - 2 && p > CAMERA_KEYS[c + 1][0]) c++;
    const segment = (p - CAMERA_KEYS[c][0]) / (CAMERA_KEYS[c + 1][0] - CAMERA_KEYS[c][0]);
    const t = (c + Math.min(1, Math.max(0, segment))) / (CAMERA_KEYS.length - 1);
    assets.curvePos.getPoint(t, s.pos);
    assets.curveLook.getPoint(t, s.look);
    if (portrait) s.pos.sub(s.look).multiplyScalar(1.3).add(s.look);

    // small pointer parallax (full motion only)
    let pointerMoving = false;
    if (!reduced) {
      const tx = story.pointerX;
      const ty = story.pointerY;
      s.px += (tx - s.px) * (1 - Math.exp(-dt * 4));
      s.py += (ty - s.py) * (1 - Math.exp(-dt * 4));
      pointerMoving = Math.abs(tx - s.px) > 0.001 || Math.abs(ty - s.py) > 0.001;
      s.offset.set(s.px * 1.6, -s.py * 0.8, 0).applyQuaternion(state.camera.quaternion);
      s.pos.add(s.offset);
    }
    state.camera.position.copy(s.pos);
    state.camera.lookAt(s.look);
    skyRef.current?.position.copy(state.camera.position);

    // wind in the gardens: an autonomous effect, so it keeps the loop alive (high tier, full motion only)
    const swaying = settings.sway && !reduced && u.uBloom.value > 0.02;
    if (swaying) s.time += dt;
    u.uTime.value = s.time;
    (assets.plants.uniforms.uSway as { value: number }).value = settings.sway && !reduced ? 1 : 0;

    const settling = s.current !== story.target;
    if (story.visible && !document.hidden && (settling || pointerMoving || swaying)) invalidate();
  });

  return (
    <>
      <mesh ref={skyRef} geometry={assets.skyGeo} material={assets.sky} frustumCulled={false} renderOrder={-1} />
      <mesh geometry={assets.groundGeo} material={assets.ground} position={[0, -0.005, 0]} />
      <mesh geometry={assets.towerGeo} material={assets.towers} frustumCulled={false} />
      <mesh geometry={assets.plantGeo} material={assets.plants} frustumCulled={false} />
    </>
  );
}

/* ------------------------------------------------------------------ canvas */

export interface SceneProps {
  tier: Tier;
  reducedMotion: boolean;
  onReady: () => void;
  onLost: () => void;
}

export default function Scene({ tier, reducedMotion, onReady, onLost }: SceneProps) {
  const settings = TIERS[tier];
  const cap = Math.min(typeof window === "undefined" ? 1 : window.devicePixelRatio || 1, settings.dprCap);
  return (
    <Canvas
      frameloop="demand"
      flat
      dpr={[1, cap]}
      camera={{ fov: 42, near: 0.5, far: 700, position: [8, 1.8, 46] }}
      gl={{ antialias: settings.antialias, alpha: false, stencil: false, powerPreference: "high-performance" }}
      onCreated={({ gl }) => {
        gl.domElement.addEventListener("webglcontextlost", (event) => {
          event.preventDefault();
          onLost();
        });
      }}
    >
      <District settings={settings} cap={cap} reducedMotion={reducedMotion} onReady={onReady} />
    </Canvas>
  );
}
