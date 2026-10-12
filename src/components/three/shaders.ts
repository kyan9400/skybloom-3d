/*
 * GLSL for the district. Everything is driven by a handful of shared uniforms:
 *   uSurvey 0..1 chapter 01: scan lines map the empty plot
 *   uGrow   0..1 towers rise out of the ground (per-tower delay -> outward ripple)
 *   uBloom  0..1 gardens climb the facades and leaf clusters open
 *   uDusk   0..1 the district switches on: windows and lamps light up in a wave from the park
 *   sky / sun / fog colours come from one time-of-day value on the CPU (blended with the hero's golden hour).
 *   A ring canal around the plot mirrors the sky (ground shader).
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
uniform float uSurvey;
uniform float uExposure;
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

// the dusk wave: > 0 once the switch-on front (spreading from the park) has passed this point
float duskFront(vec2 xz) {
  return uDusk * 1.6 - length(xz) / 29.0 * 0.9;
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

// filmic shoulder (ACES-like roll-off): linear up to 0.7 so the tuned palette holds,
// highlights (lit windows, sun streaks) roll off softly instead of clipping
vec3 filmic(vec3 c) {
  c *= uExposure;
  vec3 over = max(c - 0.7, 0.0);
  return min(c, vec3(0.7)) + 0.3 * (1.0 - exp(-over / 0.3));
}
`;

// tower heightfield: ground shadows and facade self-shadowing
const field = /* glsl */ `
uniform sampler2D uField;
uniform float uFieldExtent;
uniform float uMaxHeight;

// x = current (grown) tower height, y = tower id (1-based, 0 = empty)
vec2 fieldSample(vec2 q) {
  vec4 h = texture2D(uField, q / uFieldExtent + 0.5);
  return vec2(h.r * uMaxHeight * growth(h.g) * h.a, floor(h.b * 255.0 + 0.5));
}

float towerHeight(vec2 q) {
  return fieldSample(q).x;
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
  gl_FragColor = vec4(filmic(col), 1.0);
  #include <colorspace_fragment>
}
`;

/* --------------------------------------------------------------- TOWERS */

export const towerVertex = /* glsl */ `
${common}
uniform float uPerimK; // perimeter / (width + depth) of this section shape
attribute float aU;
attribute vec3 aOffset;
attribute vec3 aSize;
attribute vec4 aSeed;
varying vec3 vWorld;
varying vec3 vNormal;
varying vec3 vLocal;
varying vec4 vSeed;
varying float vT;
varying float vU;
varying float vPerim;
varying float vBase;
varying float vTop;
void main() {
  float t = growth(aSeed.x);
  vT = t;
  vSeed = aSeed;
  vec3 p = position; // unit rounded prism, base at y = 0
  float yFull = aOffset.y + p.y * aSize.y;
  // the tower rises out of the ground as one piece: everything shifts up by the same amount
  vec3 world = vec3(aOffset.x + p.x * aSize.x, yFull - aSeed.z * (1.0 - t), aOffset.z + p.z * aSize.z);
  vWorld = world;
  vNormal = normalize(normal / aSize); // non-uniform scale: inverse-transpose
  vLocal = vec3(p.x * aSize.x, yFull, p.z * aSize.z);
  // window grid wraps around the rounded corners: perimeter snapped to whole 1.5 units (two 0.75 bays,
  // one storefront bay) so the seam is invisible on every floor
  vU = aU;
  vPerim = max(1.5, floor((aSize.x + aSize.z) * uPerimK / 1.5 + 0.5) * 1.5);
  vBase = aOffset.y;
  vTop = aOffset.y + aSize.y;
  gl_Position = projectionMatrix * viewMatrix * vec4(world, 1.0);
  if (t < 0.001) gl_Position = vec4(2.0, 2.0, 2.0, 1.0); // not started: off screen
}
`;

export const towerFragment = /* glsl */ `
${common}
${field}
varying vec3 vWorld;
varying vec3 vNormal;
varying vec3 vLocal;
varying vec4 vSeed;
varying float vT;
varying float vU;
varying float vPerim;
varying float vBase;
varying float vTop;

// 1 = full sun, lower = another tower is in the way (8-step heightfield march, own tower ignored)
float sunVisibility(vec3 n) {
#ifdef SELF_SHADOW
  vec3 q0 = vWorld + n * 0.4;
  float me = floor(vSeed.w); // tower id, packed with the green factor
  for (int i = 1; i <= 8; i++) {
    vec3 q = q0 + uSunDir * (float(i) * 1.4);
    vec2 h = fieldSample(q.xz);
    if (h.x > q.y && abs(h.y - me) > 0.5) return 1.0 - (1.0 - float(i) / 12.0) * 0.8;
  }
#endif
  return 1.0;
}

void main() {
  if (vWorld.y < -0.01) discard; // still underground
  vec3 n = normalize(vNormal);
  vec3 V = normalize(cameraPosition - vWorld);
  float ndl = max(dot(n, uSunDir), 0.0);
  vec3 sun = uSunColor * (ndl > 0.0 ? sunVisibility(n) : 1.0);
  vec3 ambient = hemi(n) * 0.55;
  // warm sky bounce on the faces turned away from the sun: no dead back sides
  vec3 rim = uHorizon * 0.12 * pow(1.0 - ndl, 2.0);
  float y = vLocal.y;
  vec3 col;

  if (n.y > 0.5) {
    // ROOF: pale concrete that turns into a meadow
    float m = vnoise(vLocal.xz * 3.0 + vSeed.y * 40.0);
    vec3 roof = vec3(0.42, 0.42, 0.38) * (0.85 + 0.3 * m);
    vec3 meadow = mix(vec3(0.09, 0.24, 0.08), vec3(0.32, 0.46, 0.14), m);
    float reach = smoothstep(y - 0.6, y + 0.6, bloomFront(vSeed.x) + (m - 0.5) * 3.0);
    col = mix(roof, meadow, reach) * (sun * ndl + ambient);
  } else {
    // FACADE: floors 0.9 high, bays 0.75 wide (a double-height storefront at street level), timber frame, glass
    float lobby = step(vBase, 0.01) * step(y, 1.8);
    float u = vU * vPerim;
    vec2 bay = mix(vec2(0.75, 0.9), vec2(1.5, 1.8), lobby);
    vec2 g = vec2(u, y) / bay;
    vec2 cell = floor(g);
    vec2 f = fract(g);
    float mw = mix(0.085, 0.03, lobby); // chunky timber mullions: the facades read as wood and glass
    float slabH = mix(0.15, 0.06, lobby);
    float mullion = 1.0 - smoothstep(mw, mw + 0.03, min(f.x, 1.0 - f.x));
    float slab = 1.0 - smoothstep(slabH, slabH + 0.04, f.y);
    float parapet = step(vTop - 0.12, y);
    float frame = max(max(mullion, slab), parapet);

    // curtain-wall "oil canning": every pane tilts a hair, so neighbours reflect slightly different sky
    vec3 tng = normalize(vec3(-n.z, 0.0, n.x));
    vec3 np = normalize(n + tng * (hash12(cell + vSeed.y * 13.0) - 0.5) * 0.06 + vec3(0.0, (hash12(cell.yx + 3.1) - 0.5) * 0.03, 0.0));
    vec3 R = reflect(-V, np);
    vec3 skyR = skyColor(normalize(vec3(R.x, max(R.y, 0.0) + 0.02, R.z)));
    vec3 groundR = mix(uGroundColor, uFogColor, 0.5) * 0.8; // below the horizon the glass sees the street, not the sky
    vec3 refl = mix(groundR, skyR, smoothstep(-0.05, 0.05, R.y));
    float fres = 0.18 + 0.82 * pow(1.0 - max(dot(np, V), 0.0), 3.0);

    // fake room behind each pane: darker towards the floor, a ceiling light strip at the top
    float wnd = hash12(cell + vSeed.y * 97.0);
    vec3 tint = mix(mix(vec3(0.035, 0.085, 0.09), vec3(0.06, 0.08, 0.11), vSeed.y), vec3(0.13, 0.095, 0.06), lobby);
    float paneY = clamp((f.y - slabH) / (1.0 - slabH), 0.0, 1.0);
    vec3 interior = tint * (0.7 + 0.6 * wnd) + ambient * 0.06 + rim * 0.5;
    interior *= mix(0.55, 1.0, smoothstep(0.0, 0.25, paneY));
    interior += vec3(1.0, 0.86, 0.62) * smoothstep(0.92, 0.97, paneY) * (0.03 + 0.35 * uDusk);
    vec3 glass = mix(interior, refl, fres);

    // sun on glass: a hot streak plus a broad sheen (Blinn-Phong pair), stronger at grazing angles
    float nh = max(dot(np, normalize(V + uSunDir)), 0.0);
    glass += sun * (pow(nh, 400.0) * 2.4 + pow(nh, 40.0) * 0.18) * fres * step(0.0, dot(n, uSunDir));

    // dusk: the switch-on wave, lower floors first; storefronts come on earlier
    float front = duskFront(vWorld.xz);
    float threshold = mix(clamp(front - y * 0.004, 0.0, 0.7), clamp(front + uDusk * 0.6, 0.0, 0.9), lobby);
    float lit = step(hash12(cell * 1.37 + vSeed.y * 53.0), threshold);
    vec3 warm = mix(vec3(1.0, 0.62, 0.32), vec3(1.0, 0.82, 0.55), hash12(cell + 7.0));
    glass = mix(glass, warm * (0.9 + 0.5 * wnd), lit * (1.0 - frame));

    // timber: vertical grain, a lighter parapet band on top
    float grain = vnoise(vec2(u * 40.0, y * 2.0));
    vec3 wood = mix(vec3(0.56, 0.38, 0.22), vec3(0.72, 0.56, 0.38), parapet) * (0.92 + 0.16 * grain);
    col = mix(glass, wood * (sun * ndl * 0.9 + ambient + rim), frame);
    // a thin shadow line under every slab so the floors read in depth
    col *= 1.0 - 0.35 * smoothstep(0.955, 1.0, f.y) * (1.0 - parapet);

    // GARDENS: planter troughs on every slab and vines up some bays, climbing from the base
    float nz = vnoise(vec2(u * 0.8 + vSeed.y * 17.0, y * 0.33));
    float reach = smoothstep(y - 1.2, y + 1.2, bloomFront(vSeed.x) + (nz - 0.5) * 6.0);
    float leafy = vnoise(vec2(u, y) * 6.0 + vSeed.y * 9.0);
    float planter = (1.0 - smoothstep(0.3, 0.38, f.y)) * step(0.28, leafy) * (1.0 - lobby);
    float vine = step(1.0 - fract(vSeed.w) / 0.9 * 0.45, vnoise(vec2(cell.x * 0.9 + vSeed.y * 31.0 + n.x * 3.0, n.z * 5.0))) * step(0.32, leafy);
    float green = reach * max(planter, vine) * (1.0 - parapet);
    vec3 foliage = mix(vec3(0.07, 0.2, 0.07), vec3(0.3, 0.5, 0.15), vnoise(vec2(u, y) * 3.0 + 4.0));
    float wrap = pow(dot(n, uSunDir) * 0.5 + 0.5, 1.5);
    foliage *= sun * wrap * 0.9 + ambient * 1.1 + rim;
    col = mix(col, foliage, green);
  }

  // towers sit on the ground: contact darkening at the base
  col *= mix(0.62, 1.0, smoothstep(0.0, 1.4, vWorld.y));

  // the seam where a growing tower leaves the ground glows softly
  float growing = 1.0 - step(0.999, vT);
  col += vec3(0.45, 0.95, 0.6) * growing * (1.0 - smoothstep(0.0, 0.6, vWorld.y)) * 1.4;

  col = applyFog(col, vWorld);
  gl_FragColor = vec4(filmic(col), 1.0);
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
varying vec3 vSphereN;
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
  // the ellipsoid's own normal, rotated the same way: blended in the fragment for rounder canopies
  vec3 sn = normalize(position * vec3(1.0, 1.0 / 0.78, 1.0));
  vSphereN = vec3(c * sn.x - si * sn.z, sn.y, si * sn.x + c * sn.z);
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
varying vec3 vSphereN;
varying float vHue;
varying float vShade;
void main() {
  if (vWorld.y < -0.01) discard;
  // low-poly but soft: the flat facet normal blended 30/70 with the round cluster normal
  vec3 fn = normalize(cross(dFdx(vWorld), dFdy(vWorld)));
  vec3 V = normalize(cameraPosition - vWorld);
  if (dot(fn, V) < 0.0) fn = -fn;
  vec3 n = normalize(mix(fn, normalize(vSphereN), 0.7));
  vec3 base = mix(vec3(0.06, 0.2, 0.08), vec3(0.3, 0.5, 0.15), smoothstep(0.0, 0.9, vHue));
  base = mix(base, vec3(0.88, 0.46, 0.38), step(0.94, vHue)); // a few flowering trees
  float wrap = pow(dot(n, uSunDir) * 0.5 + 0.5, 1.6);
  vec3 col = base * (uSunColor * wrap * 1.05 + hemi(n) * 0.5) * (0.55 + 0.45 * vShade);
  // back-lit leaves glow at golden hour (cheap subsurface)
  float back = pow(max(dot(-V, uSunDir), 0.0), 4.0) * 0.35;
  col += vec3(0.55, 0.75, 0.2) * uSunColor * back * (0.55 + 0.45 * vShade);
  col = applyFog(col, vWorld);
  gl_FragColor = vec4(filmic(col), 1.0);
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
${field}
uniform float uPlotRadius;
uniform vec2 uCanal; // inner / outer radius of the ring canal
varying vec3 vWorld;

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

  // the ring canal: rippled water that mirrors the sky, sun glitter by day, the city's lights at dusk
  float canal = smoothstep(uCanal.x, uCanal.x + 0.35, r) * (1.0 - smoothstep(uCanal.y - 0.35, uCanal.y, r));
  if (canal > 0.0) {
    vec3 V = normalize(cameraPosition - vWorld);
    vec2 rip = vec2(vnoise(p * 1.7 + uTime * 0.35), vnoise(p * 1.7 - uTime * 0.3 + 5.0)) - 0.5;
    rip += (vec2(vnoise(p * 6.0 - uTime * 0.6), vnoise(p * 6.0 + 9.0 + uTime * 0.5)) - 0.5) * 0.5;
    vec3 wn = normalize(vec3(rip.x * 0.16, 1.0, rip.y * 0.16));
    vec3 R = reflect(-V, wn);
    vec3 refl = skyColor(normalize(vec3(R.x, max(R.y, 0.02), R.z)));
    float fres = 0.06 + 0.94 * pow(1.0 - max(dot(wn, V), 0.0), 5.0);
    vec3 deep = vec3(0.04, 0.11, 0.12) * (hemi(wn) * 0.7 + uSunColor * 0.25);
    vec3 water = mix(deep, refl, clamp(fres + 0.3, 0.0, 1.0));
    water += uSunColor * (pow(max(dot(R, uSunDir), 0.0), 260.0) * 4.0 + pow(max(dot(R, uSunDir), 0.0), 24.0) * 0.12);
    // dusk: warm light from the windows smeared across the water, broken up by the ripples
    float streak = smoothstep(0.55, 1.0, vnoise(vec2(atan(p.y, p.x) * 46.0, r * 0.5 + rip.x * 5.0)));
    water += vec3(1.0, 0.64, 0.34) * streak * smoothstep(0.3, 0.9, uDusk) * (1.0 - smoothstep(uCanal.x, uCanal.y + 2.0, r)) * 0.9;
    col = mix(col, water, canal);
  }
  // pale stone embankments on both banks
  float bank = max(1.0 - smoothstep(0.0, 0.3, abs(r - uCanal.x)), 1.0 - smoothstep(0.0, 0.3, abs(r - uCanal.y)));
  col = mix(col, vec3(0.66, 0.6, 0.5) * (uSunColor * max(uSunDir.y, 0.0) + hemi(vec3(0.0, 1.0, 0.0)) * 0.55), bank * 0.85);

  vec3 fern = vec3(0.4, 0.85, 0.55);

  // chapter 01, mapping the plot: a scan line sweeps across x, then z, leaving a faint survey grid behind it
  float scan = (1.0 - smoothstep(0.0, 0.08, uGrow)) * inPlot * step(0.001, uSurvey);
  float sweep = uPlotRadius + 1.5;
  float tx = clamp(uSurvey * 2.0, 0.0, 1.0);
  float tz = clamp(uSurvey * 2.0 - 1.0, 0.0, 1.0);
  float sx = mix(-sweep, sweep, tx);
  float sz = mix(-sweep, sweep, tz);
  float lineX = (1.0 - smoothstep(0.0, 0.18, abs(p.x - sx))) * (1.0 - step(0.999, tx));
  float lineZ = (1.0 - smoothstep(0.0, 0.18, abs(p.y - sz))) * step(0.001, tz) * (1.0 - step(0.999, tz));
  float gx = (1.0 - smoothstep(0.03, 0.07, lane.x)) * step(p.x, sx);
  float gz = (1.0 - smoothstep(0.03, 0.07, lane.y)) * step(p.y, sz) * step(0.001, tz);
  col += fern * (max(lineX, lineZ) * 1.1 + max(gx, gz) * 0.22) * scan;

  // survey ring: glows before anything is built, and pulses once more as the last lamp comes on
  float ring = 1.0 - smoothstep(0.0, 0.12, abs(r - uPlotRadius - 1.5));
  float pulse = smoothstep(0.95, 0.975, uDusk) * (1.0 - smoothstep(0.975, 1.0, uDusk));
  col += fern * ring * ((1.0 - uGrow) * 0.9 + pulse * 1.4);

  // dusk: street lamps switch on with the wave from the park (every other 1.8-unit cell on the avenues)
  vec2 lampCell = floor(p / 1.8);
  vec2 lampPos = (lampCell + 0.5) * 1.8;
  float lampD = length(p - lampPos);
  float onAvenue = 1.0 - smoothstep(1.3, 1.5, min(av.x, av.y));
  float checker = 1.0 - step(0.5, mod(lampCell.x + lampCell.y, 2.0));
  float lamp = (1.0 - smoothstep(0.0, 0.45, lampD)) * onAvenue * inPlot * checker;
  float front = duskFront(p);
  col += vec3(1.0, 0.66, 0.36) * lamp * smoothstep(0.0, 0.12, front) * 1.2;
  // the bright leading edge of the wave running down the avenues
  float edgeR = uDusk * 1.6 / 0.9 * 29.0;
  float edge = (1.0 - smoothstep(0.0, 0.4, abs(r - edgeR))) * onAvenue * inPlot * step(0.001, uDusk);
  col += vec3(1.0, 0.78, 0.5) * edge * 0.9;

  col = applyFog(col, vWorld);
  gl_FragColor = vec4(filmic(col), 1.0);
  #include <colorspace_fragment>
}
`;

/* --------------------------------------------------------------- LAMP GLOWS (high tier) */

export const glowVertex = /* glsl */ `
${common}
uniform float uScale;
varying float vA;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  float d = length(cameraPosition - position);
  float fog = exp(-uFogDensity * uFogDensity * d * d);
  vA = smoothstep(0.0, 0.12, duskFront(position.xz)) * smoothstep(0.2, 0.6, uDusk) * fog;
  gl_PointSize = min(64.0, 1.1 * uScale / max(-mv.z, 0.1));
  gl_Position = projectionMatrix * mv;
  if (vA < 0.001) gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
}
`;

export const glowFragment = /* glsl */ `
varying float vA;
void main() {
  float d = length(gl_PointCoord - 0.5) * 2.0;
  float a = pow(max(1.0 - d, 0.0), 2.5) * vA;
  gl_FragColor = vec4(vec3(1.0, 0.68, 0.38), a * 0.8);
  #include <colorspace_fragment>
}
`;
