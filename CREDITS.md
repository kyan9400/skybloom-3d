# Credits

The 3D district (towers, shaders, sky, ground, leaf clusters), the no-WebGL poster, the district illustrations, the
favicon and the Open Graph image are made in code for this project and are covered by the repository's LICENSE.
The street, park and foreground trees and the roof/terrace plants are real scanned plants from Poly Haven (CC0, below),
reduced for instancing and bundled in `public/models/greenery.glb` (served from this site, never from a CDN).

## Fonts (SIL Open Font License 1.1, self-hosted at build time via `next/font/google`)
- **Fraunces** — Undercase Type (Phaedra Charles, Flavia Zimbardi) — https://fonts.google.com/specimen/Fraunces
- **Manrope** — Mikhail Sharanda — https://fonts.google.com/specimen/Manrope

## npm libraries
| package | license |
|---|---|
| next | MIT |
| react, react-dom | MIT |
| three | MIT |
| @react-three/fiber | MIT |
| tailwindcss, @tailwindcss/postcss | MIT |
| typescript | Apache-2.0 |
| eslint, eslint-config-next | MIT |
| @types/* | MIT |

## CC0 assets (Poly Haven, CC0 1.0 — https://polyhaven.com/license)
| asset | used for | source |
|---|---|---|
| Island Tree 02 (`island_tree_02`, 1k) | street, park and foreground trees: trunk simplified to ~700 triangles, leaf cards thinned to ~4.5 % and enlarged (~6 k triangles total), leaf alpha merged into a webp texture | https://polyhaven.com/a/island_tree_02 |
| Potted Plant 02 (`potted_plant_02`, 1k, leaves only) | roof and terrace planting (~830 triangles, pot left out) | https://polyhaven.com/a/potted_plant_02 |

Processed offline with gltf-transform + meshoptimizer (meshopt geometry compression, webp textures, 512–1024 px).
