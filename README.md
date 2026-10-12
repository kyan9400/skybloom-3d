# Skybloom — Cities that grow back

A concept website for **Skybloom**, a fictional eco-city developer. Scroll through the story and a whole district
grows in real-time 3D: glass-and-timber towers rise out of the ground, gardens climb their facades and the light
moves from morning to dusk until the windows come on one by one.

Live: https://skybloom-3d.vercel.app

> Concept project — fictional brand.

## Signature 3D technique
- **Instanced rounded towers, one draw call.** Every tower volume is an instance of a unit superellipse prism built in
  code (analytic, perfectly smooth normals; the window grid wraps around the rounded corners by arc length), with
  per-instance footprint, height, growth delay and seed. A custom `ShaderMaterial` lifts each tower out of the
  ground from a single `uGrow` uniform, with delays that ripple outward from the park.
- **Procedural facades.** Window bays, timber mullions and floor slabs are drawn in the fragment shader from world
  coordinates, with storefronts, a parapet band, timber grain and slab shadow lines. The glass reflects the analytic
  sky (the street below the horizon) with per-pane tilt, fresnel and a sharp + broad sun highlight, and towers shadow
  each other through the heightfield (high/medium).
- **The district switches on.** At dusk windows and street lamps light up in a wave spreading from the park, lower
  floors first, with a bright front running down the avenues, additive lamp glows (high tier), a last pulse of the
  survey ring and a slow scroll-driven dolly zoom. Chapter 01 opens with scan lines mapping the empty plot.
- **Growth shader for the gardens.** A noise-broken "bloom front" climbs each facade (planter troughs on every slab,
  vines up some bays) and a second instanced mesh of ~20-triangle leaf clusters opens exactly as the front reaches it,
  with wind sway on the high tier.
- **Day-to-dusk light.** Sky gradient, sun, fog, hemisphere light and ground shadows (ray-marched through a small
  generated heightfield of the towers) all come from one time-of-day value.
- **Performance rules applied:** render on demand, quality tiers chosen from the GPU before the canvas exists,
  idle-aware adaptive DPR, one scroll smoothing layer, shader warm-up (`compileAsync`) behind a loader, no per-frame
  allocations, reduced-motion by default with a "Turn on full motion" toggle, and a designed SVG poster when WebGL is
  missing, the context is lost or the GPU is a software renderer (SwiftShader, llvmpipe, ...). Append `?quality=low|medium|high` or `?motion=full|reduced` to test.

## Tech stack
Next.js 16 (App Router, TypeScript, `src/`), React 19, three.js 0.186 + @react-three/fiber 9, Tailwind CSS 4.
The 3D scene is a client component loaded with `next/dynamic(..., { ssr: false })` only after window `load` and an
idle callback, so the HTML (and the hero heading) renders instantly and hydration never competes with the scene.
A cheap GPU probe (a throwaway WebGL context, no three.js) runs first: software renderers get the poster and the 3D
chunk is never downloaded (`?quality=` forces it on). Scene data is built in small steps that yield to the browser.

Versions are pinned exactly as in the shared stack file. Deliberate differences: `@react-three/drei`, `gsap`/`@gsap/react`,
`lenis` and `@react-three/postprocessing` are not installed — the scene needs no drei helper (adaptive DPR is a small
custom controller that ignores render-on-demand idle gaps), and scroll smoothing is a single damping step inside the
render loop instead of Lenis, which keeps exactly one smoothing layer and a smaller bundle.

## Project layout
```
src/app/            layout, page, 404, globals.css (design tokens), icon.svg, OG/Twitter images (PNG screenshots of the live site), robots, sitemap
src/components/     StoryStage (sticky 3D stage), Poster (no-WebGL), MotionToggle, MobileMenu, DistrictArt, SiteFooter
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
npm run build:pages  # static GitHub Pages mirror in out/ (served under /skybloom-3d)
npm run lint
```

## Credits
Fonts: Fraunces and Manrope (SIL OFL 1.1). Libraries: see [CREDITS.md](CREDITS.md). All 3D, illustrations and the favicon
are made in code for this project; the social preview image is a screenshot of the live site.

## Copyright
© 2026 Alhassan Alfarran. All rights reserved — see [LICENSE](LICENSE).
