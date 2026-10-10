# Skybloom — site spec

## Concept
Skybloom is a fictional eco-city developer that builds glass-and-timber districts where planting is part of the structure,
not decoration. The site tells one story with one image: an empty plot at morning, glass towers rising out of the ground as
you scroll, gardens climbing their facades, and the whole district settling into a warm dusk with windows lighting up.

Tone: calm, confident, optimistic. Botanical editorial — a printed annual report from a developer who gardens.

## Audience
- Primary: city planners, municipal partners, impact investors and architects judging whether Skybloom can deliver.
- Secondary (portfolio): studios and recruiters evaluating real-time 3D craft, performance discipline and design quality.

## Sections (in order)
1. **Hero** (inside the 3D story) — h1, intro, primary CTA.
2. **Growth story** (4 scroll chapters over the sticky 3D canvas): Ground, Rise, Bloom, Dusk.
3. **Districts** — three fictional projects with stats.
4. **Principles** — four building principles with numbers.
5. **Impact** — headline metrics band.
6. **Process** — how a district is delivered, five steps.
7. **Contact / CTA** — "Plant a district with us", contact links.
8. **Footer** — credits, motion toggle, legal lines.

## Signature 3D moment
**"The district grows."** A sticky full-viewport canvas behind the hero and four chapters (≈ 460svh of scroll).

Technique (all procedural, zero downloaded assets):
- **Towers**: one `InstancedMesh` of a unit box (pivot at the base). Per-instance attributes: footprint, target height,
  growth delay (distance from the plot centre + noise, so towers rise in a ripple outward), hue seed. A custom
  `ShaderMaterial` scales the vertex Y by an eased growth value, so growth costs one uniform update per frame.
  Fragment: glass facade made from world-space window grid (mullions, floor slabs), fresnel sky reflection, sun glint,
  and dusk window lights (per-window hash, turning on progressively with `uDusk`).
- **Vertical gardens**: the same tower fragment shader grows a green mask up each facade — value-noise bands on
  balcony floors that spread from the base upward as `uBloom` rises, with leaf-shade variation.
- **Plants**: a second `InstancedMesh` of low-poly leaf clusters (icosahedron, 20 tris) on tower terraces, tops and the
  ground. Per-instance attributes: anchor, the tower they belong to, height on that tower, delay. The vertex shader scales
  each cluster from 0 → 1 when the facade reaches it (so plants follow the tower up) and adds a gentle wind sway
  (disabled in reduced motion).
- **Ground**: a plane with a procedural plot shader (paths, plot lines, lawn spreading from the centre with `uBloom`).
- **Sky**: inverted sphere with a gradient shader; sun position, sky colours, fog colour and light colour are all
  interpolated from one `timeOfDay` value (morning → noon → golden hour → dusk).
- **Camera**: a scripted path (low eye level → rising orbit → high aerial), driven by scroll progress.

Scroll & loop (PERF-RULES 1, 5, 7): native scroll writes a target progress into a ref; a single damping step in
`useFrame` eases toward it (the only smoothing layer — no Lenis). `frameloop="demand"`; frames are requested on
scroll and while the damped value is still moving, or while wind sway runs (high tier only, full motion, canvas
on-screen). Canvas pauses when the story leaves the viewport (IntersectionObserver) or the tab is hidden.
No allocations in `useFrame` (pre-allocated Vector3/Color).

Quality tiers (decided before the Canvas exists, from `WEBGL_debug_renderer_info`, touch and cores; `?quality=` overrides):
| tier | DPR cap | MSAA | towers | leaf clusters | wind sway |
|---|---|---|---|---|---|
| high | 2 | yes | 150 | 7 000 | yes |
| medium | 1.5 | yes | 100 | 4 000 | no |
| low | 1 | no | 60 | 1 600 | no |
Plus an idle-aware adaptive-DPR controller (measures only consecutive drawn frames, so render-on-demand gaps are not mistaken for slow frames — the same approach as the Apex Motors reference).

Reduced motion: scroll-linked growth still works but cuts directly to the scroll position (no damping), no wind
sway, no idle camera drift. A "Turn on full motion" toggle in the header (remembered in localStorage,
`?motion=full|reduced` overrides).

No WebGL / context lost / software renderer (SwiftShader, llvmpipe, "Microsoft Basic Render", or a
`failIfMajorPerformanceCaveat` refusal): a designed inline-SVG poster (dusk skyline with planted towers) replaces the canvas behind a light paper veil;
all content remains readable. In that case the 3D chunk is never downloaded; `?quality=low|medium|high` forces 3D on.

Warm-up: the canvas stays transparent behind a small "Breaking ground" loader until `gl.compileAsync` resolves and the
first frame is drawn, then fades in. The hero text is server-rendered and visible immediately.

## Design system
Palette (tokens in `globals.css` `@theme`):
| token | hex | use |
|---|---|---|
| paper | #F4F0E6 | page background |
| paper-2 | #E9E3D3 | alternate band |
| ink | #13261F | text, dark bands |
| ink-soft | #3D5148 | secondary text (7.4:1 on paper) |
| moss | #2F6B45 | accent, links (5.9:1 on paper) |
| fern | #8FC79A | accent on dark (9.3:1 on ink) |
| bloom | #E07A5F | dusk highlight (decorative / large text on ink) |
| dusk | #2A2342 | dusk band |

Fonts (Google, OFL, via next/font): **Fraunces** (display, soft optical serif) + **Manrope** (body/UI).

Spacing scale (4px base): 4, 8, 12, 16, 24, 32, 48, 64, 96, 128 — Tailwind default steps 1/2/3/4/6/8/12/16/24/32.
Type scale: 14 / 16 / 18 / 22 / 30 / 44 / clamp(48px, 9vw, 128px) display.
Radius: 4px on controls, 20px on cards. Focus: 3px moss/fern outline with 3px offset.

## Final copy

**Nav**: Skybloom · Story · Districts · Principles · Process · Contact

**Hero**
- Eyebrow: Eco-city developer · est. 2014
- H1: Cities that grow back.
- Lede: Skybloom builds glass-and-timber districts where every tower carries its own garden. Scroll to watch one rise.
- CTA: See our districts · Talk to us

**Chapter 01 — Ground**: "We start with the soil, not the skyline." Before a single pile is driven we map water, wind and
the species already living on the plot. The masterplan bends around them.

**Chapter 02 — Rise**: "Glass where light matters. Timber everywhere else." Mass-timber cores and triple-glazed skins go
up in weeks, not years — prefabricated within 80 km of the site.

**Chapter 03 — Bloom**: "Every floor is a planting plan." Terraces, facade troughs and roof meadows are engineered into
the structure from day one, irrigated by rain the building catches itself.

**Chapter 04 — Dusk**: "A district that keeps living after hours." When the light goes, the gardens keep cooling the
streets and the windows come on one by one. This is what we hand over: a neighbourhood, already alive.

**Districts** (h2: Three districts, one idea)
- Lumen Quay — Harbourfront, 14 towers. 38,000 m² of planted facade · 2,400 homes · Completed 2022.
- Verdant Spire — Hillside, 1 tower, 61 floors. Tallest timber-hybrid in the region · 9 sky gardens · Completed 2025.
- Fernhill Commons — Former rail yard, 22 low-rises. 11 ha restored meadow · car-free streets · In construction since 2026.

**Principles** (h2: How we build)
1. Plant first — Planting is drawn before floor plans. 40% of each plot stays soil.
2. Catch every drop — Roof meadows and cisterns hold 90% of rainfall on site.
3. Build light — Mass timber stores carbon; embodied CO₂ down 62% versus concrete.
4. Stay nearby — 80% of components made within 80 km.

**Impact** (h2: Measured, not promised): 1.2 M plants established · −4.1 °C street-level summer temperature · 62% less
embodied carbon · 214 species recorded across our districts.

**Process** (h2: From plot to neighbourhood): 01 Listen (6 months of site ecology and resident workshops) · 02 Draw
(masterplan drawn around trees, water and wind) · 03 Prefabricate (timber cassettes and planters built off-site) ·
04 Rise (structure and skin in under 20 weeks per tower) · 05 Tend (we stay on as gardeners for ten years).

**Contact** (h2: Plant a district with us): Partnering on a plot, a policy or a pilot? Our team answers every message
within two working days. Links: Email · WhatsApp · Telegram.

**Footer**: Skybloom · Concept project — fictional brand. · Design & development by Alhassan Alfarran (portfolio,
GitHub) · © 2026 Alhassan Alfarran · motion toggle.

**404**: "This plot is still empty." Nothing has been planted at this address yet. → Back to the district.

## Assets & licenses
| asset | source | license |
|---|---|---|
| All 3D geometry, shaders, sky, ground | written in code | owned (see LICENSE) |
| No-WebGL poster, favicon, OG image | code (inline SVG / next/og) | owned |
| Fraunces, Manrope | Google Fonts via next/font | SIL OFL 1.1 |
| npm libraries | see CREDITS.md | MIT |
No downloaded images, models, HDRIs or textures.

## Performance budget
- First-load JS for `/` < 250 KB gzip (target ≈ 160 KB), 3D chunk lazy via `next/dynamic({ ssr: false })`.
- 3D chunk: three + @react-three/fiber + scene code (requested only after window `load` + `requestIdleCallback`,
  never for software renderers; the scene build yields between steps and before `compileAsync`).
- Draw calls: 4 (sky, ground, towers, plants). Triangles: < 200 k on high.
- No textures, no fonts beyond two variable families (subset latin, `display: swap`).
- LCP element: hero h1 / lede (server-rendered text, no JS-driven reveal). CLS ~ 0 (canvas is absolutely positioned).
- Lighthouse mobile: Perf ≥ 85, A11y/BP/SEO ≥ 95.
