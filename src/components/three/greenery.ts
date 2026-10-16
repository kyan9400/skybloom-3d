/*
 * Real greenery: Poly Haven CC0 scans (island_tree_02, shrub_02), reduced for instancing and packed into one
 * meshopt-compressed glb with webp textures (public/models/greenery.glb, ~250 KB, built offline with gltf-transform).
 * The tree's leaf cards were thinned and enlarged to keep the canopy full at ~4 k triangles, the trunk simplified.
 * Loaded with the 3D chunk (never on the critical path); the meshopt decoder is three's local copy, no CDN.
 */

import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";

export interface ScanPart {
  geometry: THREE.BufferGeometry;
  map: THREE.Texture;
}

export interface Greenery {
  trunk: ScanPart;
  leaves: ScanPart;
  shrub: ScanPart;
}

const URL = `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/models/greenery.glb`;

export async function loadGreenery(): Promise<Greenery> {
  const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  const gltf = await loader.loadAsync(URL);
  const part = (name: string): ScanPart => {
    const mesh = gltf.scene.getObjectByName(name) as THREE.Mesh | undefined;
    const material = mesh?.material as THREE.MeshStandardMaterial | undefined;
    if (!mesh || !material?.map) throw new Error(`greenery: missing ${name}`);
    const map = material.map;
    map.colorSpace = THREE.SRGBColorSpace;
    map.anisotropy = 4;
    material.dispose(); // only the texture and the geometry are kept: the scene draws them with its own shader
    return { geometry: mesh.geometry, map };
  };
  return { trunk: part("tree_trunk"), leaves: part("tree_leaves"), shrub: part("shrub") };
}
