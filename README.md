# Skybloom — Cities that grow back

A concept website for **Skybloom**, a fictional eco-city developer. Scroll through the story and a whole district
grows in real-time 3D: glass-and-timber towers rise out of the ground, gardens climb their facades and the light
moves from morning to dusk until the windows come on one by one.

Live: <!-- LIVE_URL -->

> Concept project — fictional brand.

## Signature 3D technique
- **Instanced towers, one draw call.** Every tower volume is an instance of a unit box (`InstancedBufferGeometry`)
  with per-instance footprint, height, growth delay and seed. A custom `ShaderMaterial` lifts each tower out of the
  ground from a single `uGrow` uniform, with delays that ripple outward from the park.
- **Procedural facades.** Window bays, timber mullions and floor slabs are drawn in the fragment shader from world
  coordinates; the glass reflects the analytic sky with fresnel and a sun glint, and at dusk individual windows light
  up from a per-window hash.
- **Growth shader for the gardens.** A noise-broken "bloom front" climbs each facade (planter troughs on every slab,
  vines up some bays) and a second instanced mesh of ~20-triangle leaf clusters opens exactly as the front reaches it,
  with wind sway on the high tier.
- **Day-to-dusk light.** Sky gradient, sun, fog, hemisphere light and ground shadows (ray-marched through a small
  generated heightfield of the towers) all come from one time-of-day value.
- **Performance rules applied:** render on demand, quality tiers chosen from the GPU before the canvas exists,
  idle-aware adaptive DPR, one scroll smoothing layer, shader warm-up (`compileAsync`) behind a loader, no per-frame
  allocations, reduced-motion by default with a "Turn on full motion" toggle, and a designed SVG poster when WebGL is
  missing or the context is lost. Append `?quality=low|medium|high` or `?motion=full|reduced` to test.

## Tech stack
Next.js 16 (App Router, TypeScript, `src/`), React 19, three.js 0.186 + @react-three/fiber 9, Tailwind CSS 4.
The 3D scene is a client component loaded with `next/dynamic(..., { ssr: false })` after the page is idle, so the
HTML (and the hero heading) renders instantly.

Versions are pinned exactly as in the shared stack file. Deliberate differences: `@react-three/drei`, `gsap`/`@gsap/react`,
`lenis` and `@react-three/postprocessing` are not installed — the scene needs no drei helper (adaptive DPR is a small
custom controller that ignores render-on-demand idle gaps), and scroll smoothing is a single damping step inside the
render loop instead of Lenis, which keeps exactly one smoothing layer and a smaller bundle.

## Project layout
```
src/app/            layout, page, 404, globals.css (design tokens), icon.svg, OG/Twitter images, robots, sitemap
src/components/     StoryStage (sticky 3D stage), Poster (no-WebGL), MotionToggle, DistrictArt, SiteFooter
src/components/three/
  Scene.tsx         Canvas, frame loop, camera path, time of day, adaptive DPR
  city.ts           seeded district layout, leaf clusters, shadow heightfield
  shaders.ts        sky, ground, tower and plant GLSL
src/lib/            quality tiers, motion preference, shared scroll state
SPEC.md             design spec: concept, copy, palette, budget
```

## Run it
```bash
npm install
npm run dev     # http://localhost:3000
npm run build   # production build
npm run lint
```

## Credits
Fonts: Fraunces and Manrope (SIL OFL 1.1). Libraries: see [CREDITS.md](CREDITS.md). All 3D, illustrations, favicon
and social images are made in code for this project.

## Copyright
© 2026 Alhassan Alfarran. All rights reserved — see [LICENSE](LICENSE).
