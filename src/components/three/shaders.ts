/*
 * GLSL for the district. Everything is driven by a handful of shared uniforms:
 *   uGrow  0..1  towers rise out of the ground (per-tower delay -> outward ripple)
 *   uBloom 0..1  gardens climb the facades and leaf clusters open
 *   uDusk  0..1  windows and street lamps switch on
 *   sky / sun / fog colours come from one time-of-day value on the CPU.
 */

const common = /* glsl */ `
uniform vec3 uSunDir;
uniform vec3 uSunColor;
uniform vec3 uZenith;
uniform vec3 uHorizon;
uniform vec3 uGroundColor;
uniform vec3 uFogColor;
uniform float uFogDensity;
uniform float uGrow;
uniform float uBloom;
uniform float uDusk;
uniform float uTime;

float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash12(i), hash12(i + vec2(1.0, 0.0)), u.x), mix(hash12(i + vec2(0.0, 1.0)), hash12(i + vec2(1.0, 1.0)), u.x), u.y);
}

// same curve on the GPU for towers, plants and ground shadows
float growth(float delay) {
  float t = clamp((uGrow - delay * 0.55) / 0.45, 0.0, 1.0);
  return 1.0 - pow(1.0 - t, 3.0);
}

// how high the gardens have climbed on a tower with this delay
float bloomFront(float delay) {
  return uBloom * 52.0 - delay * 12.0;
}

vec3 skyColor(vec3 dir) {
  float h = dir.y;
  vec3 col = mix(uHorizon, uZenith, pow(clamp(h, 0.0, 1.0), 0.5));
  float s = max(dot(dir, uSunDir), 0.0);
  col += uSunColor * (pow(s, 5.0) * 0.32 + pow(s, 48.0) * 0.5);
  return mix(col, uFogColor, smoothstep(0.0, -0.15, h));
}

vec3 hemi(vec3 n) {
  return mix(uGroundColor, uZenith, n.y * 0.5 + 0.5);
}

vec3 applyFog(vec3 col, vec3 world) {
  float d = length(cameraPosition - world);
  float f = 1.0 - exp(-uFogDensity * uFogDensity * d * d);
  return mix(col, uFogColor, f);
}
`;

/* ------------------------------------------------------------------ SKY */

export const skyVertex = /* glsl */ `
varying vec3 vWorld;
void main() {
  vec4 w = modelMatrix * vec4(position, 1.0);
  vWorld = w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
  gl_Position.z = gl_Position.w; // always at the far plane
}
`;

export const skyFragment = /* glsl */ `
${common}
varying vec3 vWorld;
void main() {
  vec3 dir = normalize(vWorld - cameraPosition);
  vec3 col = skyColor(dir);
  float s = dot(dir, uSunDir);
  col += uSunColor * smoothstep(0.99935, 0.99965, s) * 2.2;
  // a few stars once the sun is down
  vec2 cell = floor(vec2(atan(dir.z, dir.x) * 220.0, dir.y * 260.0));
  float star = step(0.9965, hash12(cell)) * smoothstep(0.12, 0.5, dir.y) * smoothstep(0.55, 1.0, uDusk);
  col += vec3(star * 0.7);
  gl_FragColor = vec4(col, 1.0);
  #include <colorspace_fragment>
}
`;

/* --------------------------------------------------------------- TOWERS */

export const towerVertex = /* glsl */ `
${common}
attribute vec3 aOffset;
attribute vec3 aSize;
attribute vec4 aSeed;
varying vec3 vWorld;
varying vec3 vNormal;
varying vec3 vLocal;
varying vec4 vSeed;
varying float vT;
void main() {
  float t = growth(aSeed.x);
  vT = t;
  vSeed = aSeed;
  vec3 p = position; // unit box, base at y = 0
  float yFull = aOffset.y + p.y * aSize.y;
  // the tower rises out of the ground as one piece: everything shifts up by the same amount
  vec3 world = vec3(aOffset.x + p.x * aSize.x, yFull - aSeed.z * (1.0 - t), aOffset.z + p.z * aSize.z);
  vWorld = world;
  vNormal = normal;
  vLocal = vec3(p.x * aSize.x, yFull, p.z * aSize.z);
  gl_Position = projectionMatrix * viewMatrix * vec4(world, 1.0);
  if (t < 0.001) gl_Position = vec4(2.0, 2.0, 2.0, 1.0); // not started: off screen
}
`;

export const towerFragment = /* glsl */ `
${common}
varying vec3 vWorld;
varying vec3 vNormal;
varying vec3 vLocal;
varying vec4 vSeed;
varying float vT;

void main() {
  if (vWorld.y < -0.01) discard; // still underground
  vec3 n = normalize(vNormal);
  vec3 V = normalize(cameraPosition - vWorld);
  float ndl = max(dot(n, uSunDir), 0.0);
  vec3 ambient = hemi(n) * 0.55;
  float y = vLocal.y;
  vec3 col;

  if (n.y > 0.5) {
    // ROOF: pale concrete that turns into a meadow
    float m = vnoise(vLocal.xz * 3.0 + vSeed.y * 40.0);
    vec3 roof = vec3(0.42, 0.42, 0.38) * (0.85 + 0.3 * m);
    vec3 meadow = mix(vec3(0.09, 0.24, 0.08), vec3(0.32, 0.46, 0.14), m);
    float reach = smoothstep(y - 0.6, y + 0.6, bloomFront(vSeed.x) + (m - 0.5) * 3.0);
    col = mix(roof, meadow, reach) * (uSunColor * ndl + ambient);
  } else {
    // FACADE: floors 0.9 high, bays 0.75 wide, timber frame, glass that reflects the sky
    float u = abs(n.x) > 0.5 ? vLocal.z : vLocal.x;
    vec2 g = vec2(u / 0.75, y / 0.9);
    vec2 cell = floor(g);
    vec2 f = fract(g);
    float mullion = 1.0 - smoothstep(0.05, 0.08, min(f.x, 1.0 - f.x));
    float slab = 1.0 - smoothstep(0.1, 0.14, f.y);
    float frame = max(mullion, slab);

    vec3 R = reflect(-V, n);
    vec3 refl = skyColor(normalize(vec3(R.x, abs(R.y) * 0.85 + 0.05, R.z)));
    float fres = 0.18 + 0.82 * pow(1.0 - max(dot(n, V), 0.0), 3.0);
    float wnd = hash12(cell + vSeed.y * 97.0);
    vec3 tint = mix(vec3(0.035, 0.085, 0.09), vec3(0.06, 0.08, 0.11), vSeed.y);
    vec3 interior = tint * (0.7 + 0.6 * wnd) + ambient * 0.06;
    vec3 glass = mix(interior, refl, fres);
    glass += uSunColor * pow(max(dot(R, uSunDir), 0.0), 160.0) * 1.6;

    // dusk: windows switch on one by one
    float lit = step(hash12(cell * 1.37 + vSeed.y * 53.0), uDusk * 0.62);
    vec3 warm = mix(vec3(1.0, 0.62, 0.32), vec3(1.0, 0.82, 0.55), hash12(cell + 7.0));
    glass = mix(glass, warm * (0.9 + 0.5 * wnd), lit * (1.0 - frame));

    vec3 timber = vec3(0.50, 0.38, 0.26) * (uSunColor * ndl * 0.9 + ambient);
    col = mix(glass, timber, frame);

    // GARDENS: planter troughs on every slab and vines up some bays, climbing from the base
    float nz = vnoise(vec2(u * 0.8 + vSeed.y * 17.0, y * 0.33));
    float reach = smoothstep(y - 1.2, y + 1.2, bloomFront(vSeed.x) + (nz - 0.5) * 6.0);
    float leafy = vnoise(vec2(u, y) * 6.0 + vSeed.y * 9.0);
    float planter = (1.0 - smoothstep(0.3, 0.38, f.y)) * step(0.28, leafy);
    float vine = step(1.0 - vSeed.w * 0.45, vnoise(vec2(cell.x * 0.9 + vSeed.y * 31.0 + n.x * 3.0, n.z * 5.0))) * step(0.32, leafy);
    float green = reach * max(planter, vine);
    vec3 foliage = mix(vec3(0.07, 0.2, 0.07), vec3(0.3, 0.5, 0.15), vnoise(vec2(u, y) * 3.0 + 4.0));
    float wrap = pow(dot(n, uSunDir) * 0.5 + 0.5, 1.5);
    foliage *= uSunColor * wrap * 0.9 + ambient * 1.1;
    col = mix(col, foliage, green);
  }

  // the seam where a growing tower leaves the ground glows softly
  float growing = 1.0 - step(0.999, vT);
  col += vec3(0.45, 0.95, 0.6) * growing * (1.0 - smoothstep(0.0, 0.6, vWorld.y)) * 1.4;

  col = applyFog(col, vWorld);
  gl_FragColor = vec4(col, 1.0);
  #include <colorspace_fragment>
}
`;

/* --------------------------------------------------------------- PLANTS */

export const plantVertex = /* glsl */ `
${common}
uniform float uSway;
attribute vec3 aAnchor;
attribute vec3 aHost;
attribute vec4 aPlant;
varying vec3 vWorld;
varying float vHue;
varying float vShade;
void main() {
  float t = aHost.y > 0.5 ? growth(aHost.x) : 1.0;
  float ready = aHost.y > 0.5 ? smoothstep(0.82, 1.0, t) : 1.0;
  float jitter = hash12(aAnchor.xz * 3.1) - 0.5;
  float open = smoothstep(aAnchor.y - 1.0, aAnchor.y + 1.0, bloomFront(aPlant.y) + jitter * 4.0);
  float s = aPlant.x * open * ready;
  vHue = aPlant.z;
  vShade = position.y * 0.5 + 0.5;

  float a = aPlant.w * 6.2831;
  float c = cos(a);
  float si = sin(a);
  vec3 p = position * vec3(1.0, 0.78, 1.0);
  p = vec3(c * p.x - si * p.z, p.y, si * p.x + c * p.z) * s;
  // wind: the top of each cluster moves a little more than the bottom
  p.x += sin(uTime * 1.3 + aPlant.w * 6.2831 + aAnchor.x * 0.35) * 0.07 * s * (position.y + 1.0) * uSway;
  p.z += cos(uTime * 1.1 + aPlant.w * 4.0 + aAnchor.z * 0.3) * 0.05 * s * (position.y + 1.0) * uSway;

  vec3 anchor = vec3(aAnchor.x, aAnchor.y - aHost.z * (1.0 - t), aAnchor.z);
  vec3 world = anchor + p;
  vWorld = world;
  gl_Position = projectionMatrix * viewMatrix * vec4(world, 1.0);
  if (s < 0.001) gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
}
`;

export const plantFragment = /* glsl */ `
${common}
varying vec3 vWorld;
varying float vHue;
varying float vShade;
void main() {
  if (vWorld.y < -0.01) discard;
  // faceted low-poly look: flat normal from screen-space derivatives
  vec3 n = normalize(cross(dFdx(vWorld), dFdy(vWorld)));
  if (dot(n, cameraPosition - vWorld) < 0.0) n = -n;
  vec3 base = mix(vec3(0.06, 0.2, 0.08), vec3(0.3, 0.5, 0.15), smoothstep(0.0, 0.9, vHue));
  base = mix(base, vec3(0.88, 0.46, 0.38), step(0.94, vHue)); // a few flowering trees
  float wrap = pow(dot(n, uSunDir) * 0.5 + 0.5, 1.6);
  vec3 col = base * (uSunColor * wrap * 1.05 + hemi(n) * 0.5) * (0.55 + 0.45 * vShade);
  col = applyFog(col, vWorld);
  gl_FragColor = vec4(col, 1.0);
  #include <colorspace_fragment>
}
`;

/* --------------------------------------------------------------- GROUND */

export const groundVertex = /* glsl */ `
varying vec3 vWorld;
void main() {
  vec4 w = modelMatrix * vec4(position, 1.0);
  vWorld = w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
}
`;

export const groundFragment = /* glsl */ `
${common}
uniform sampler2D uField;
uniform float uFieldExtent;
uniform float uMaxHeight;
uniform float uPlotRadius;
varying vec3 vWorld;

float towerHeight(vec2 q) {
  vec4 h = texture2D(uField, q / uFieldExtent + 0.5);
  return h.r * uMaxHeight * growth(h.g) * h.a;
}

void main() {
  vec2 p = vWorld.xz;
  float r = length(p);
  float n1 = vnoise(p * 0.35);
  float n2 = vnoise(p * 2.3);

  // countryside: striped fields fading into haze
  vec3 field = mix(vec3(0.3, 0.36, 0.2), vec3(0.45, 0.43, 0.27), step(0.5, fract((p.x * 0.6 + p.y * 0.25) * 0.08 + n1 * 0.3)));
  field *= 0.85 + 0.25 * n2;

  // the plot: pale paving with avenues, footpaths and a lawn that spreads with the bloom
  vec3 paving = vec3(0.58, 0.56, 0.5) * (0.92 + 0.12 * n2);
  vec2 av = abs(p - floor(p / 18.0 + 0.5) * 18.0);
  float avenue = 1.0 - smoothstep(1.0, 1.15, min(av.x, av.y));
  vec2 lane = abs(fract(p / 3.6) - 0.5) * 3.6; // footpaths run between the tower plots
  float path = 1.0 - smoothstep(0.08, 0.14, min(lane.x, lane.y));
  vec3 plot = mix(paving, vec3(0.2, 0.21, 0.22), avenue);
  plot = mix(plot, vec3(0.72, 0.68, 0.6), path * (1.0 - avenue) * 0.6);
  float lawnFront = uBloom * 46.0;
  float lawn = smoothstep(r - 2.5, r + 2.5, lawnFront - n1 * 6.0) * (1.0 - avenue) * (1.0 - path) * step(0.32, n1 + n2 * 0.3);
  lawn = max(lawn, (1.0 - smoothstep(5.0, 5.6, r)) * smoothstep(0.0, 0.25, uBloom + 0.12));
  plot = mix(plot, mix(vec3(0.12, 0.27, 0.1), vec3(0.3, 0.44, 0.15), n2), lawn);

  float inPlot = 1.0 - smoothstep(uPlotRadius + 1.0, uPlotRadius + 3.0, r);
  vec3 col = mix(field, plot, inPlot);

  // ground shadows: march the tower heightfield towards the sun
  vec2 sdir = normalize(uSunDir.xz + 1e-4);
  float tanE = uSunDir.y / max(length(uSunDir.xz), 1e-3);
  float shade = 0.0;
  for (int i = 1; i <= 12; i++) {
    float s = float(i) * 1.1;
    if (towerHeight(p + sdir * s) > s * tanE) { shade = 1.0 - float(i) / 16.0; break; }
  }
  float ao = 0.0;
  ao += step(0.05, towerHeight(p + vec2(0.6, 0.0)));
  ao += step(0.05, towerHeight(p - vec2(0.6, 0.0)));
  ao += step(0.05, towerHeight(p + vec2(0.0, 0.6)));
  ao += step(0.05, towerHeight(p - vec2(0.0, 0.6)));
  float sun = max(uSunDir.y, 0.0) * (1.0 - shade * 0.85);
  col *= uSunColor * sun * 1.05 + hemi(vec3(0.0, 1.0, 0.0)) * 0.5 * (1.0 - ao * 0.09);

  // survey lines: the plot outline glows before anything is built
  float ring = 1.0 - smoothstep(0.0, 0.12, abs(r - uPlotRadius - 1.5));
  col += vec3(0.4, 0.85, 0.55) * ring * (1.0 - uGrow) * 0.9;

  // dusk: street lamps along the avenues
  vec2 lampCell = floor(p / 1.8);
  vec2 lampPos = (lampCell + 0.5) * 1.8;
  float lampD = length(p - lampPos);
  float onAvenue = 1.0 - smoothstep(1.3, 1.5, min(av.x, av.y));
  float lamp = (1.0 - smoothstep(0.0, 0.45, lampD)) * onAvenue * inPlot * step(0.35, hash12(lampCell));
  col += vec3(1.0, 0.66, 0.36) * lamp * uDusk * 1.2;

  col = applyFog(col, vWorld);
  gl_FragColor = vec4(col, 1.0);
  #include <colorspace_fragment>
}
`;
