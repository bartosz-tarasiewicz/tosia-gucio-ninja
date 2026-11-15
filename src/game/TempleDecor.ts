import { Color3, MeshBuilder, Scene, StandardMaterial, Vector3 } from '@babylonjs/core';
import { material } from './materials';

/** Decorative meshes only: no collision or gameplay changes. */
export function decorateTemple(scene: Scene): void {
  const rock = material(scene, 'v03-rock', '#536f7d');
  const rockLight = material(scene, 'v03-rock-light', '#809e9a');
  const wood = material(scene, 'v03-wood', '#77563d');
  const leaf = material(scene, 'v03-leaf', '#31947a');
  const leafLight = material(scene, 'v03-leaf-light', '#66bd83');
  const lantern = material(scene, 'v03-lantern', '#f7c66b', '#b97b2a');
  const roof = material(scene, 'v03-roof', '#355a68');
  const flags = [
    material(scene, 'v03-flag-tosia', '#2fceb8'),
    material(scene, 'v03-flag-gucio', '#e9b54e')
  ];

  const block = (name: string, w: number, h: number, d: number, pos: Vector3, mat: StandardMaterial): void => {
    const mesh = MeshBuilder.CreateBox(name, { width: w, height: h, depth: d }, scene);
    mesh.position.copyFrom(pos);
    mesh.material = mat;
  };

  // Distant silhouettes flank the playfield, outside movement bounds.
  for (const side of [-1, 1]) {
    for (let i = 0; i < 5; i++) {
      const x = side * (13.3 + (i % 2) * 2.3);
      const z = -10 + i * 5.4;
      const height = 1.1 + (i % 3) * 0.8;
      const boulder = MeshBuilder.CreatePolyhedron(`v03-boulder-${side}-${i}`, { type: 2, size: 1.35 }, scene);
      boulder.position.set(x, height * 0.38 - 0.4, z);
      boulder.scaling.set(1.2, height, 0.95);
      boulder.material = i % 2 ? rockLight : rock;
    }
    for (let i = 0; i < 5; i++) {
      const x = side * (11.8 + (i % 2) * 1.7);
      const z = -9.4 + i * 4.8;
      const height = 2.8 + (i % 3) * 0.45;
      const trunk = MeshBuilder.CreateCylinder(`v03-bamboo-trunk-${side}-${i}`, { height, diameter: 0.19, tessellation: 8 }, scene);
      trunk.position.set(x, height * 0.5, z);
      trunk.material = wood;
      for (let k = 0; k < 3; k++) {
        const crown = MeshBuilder.CreateSphere(`v03-bamboo-crown-${side}-${i}-${k}`, { diameter: 1.3, segments: 8 }, scene);
        crown.position.set(x + (k - 1) * 0.3, height - 0.2 + k * 0.35, z);
        crown.scaling.set(0.8, 0.44, 0.7);
        crown.material = k % 2 ? leafLight : leaf;
      }
    }
    // Banners and lantern posts mark the riddle and the temple entry.
    for (const z of [-0.4, 8.4]) {
      const x = side * 8.1;
      block(`v03-post-${side}-${z}`, 0.18, 2.9, 0.18, new Vector3(x, 1.45, z), wood);
      block(`v03-banner-${side}-${z}`, 0.65, 1.45, 0.07, new Vector3(x + side * 0.34, 2.0, z), flags[side === -1 ? 0 : 1]);
      const cap = MeshBuilder.CreateSphere(`v03-lantern-${side}-${z}`, { diameter: 0.45, segments: 10 }, scene);
      cap.position.set(x, 3.08, z);
      cap.material = lantern;
    }
  }

  // Temple gate rooftop: a simple silhouette above the existing gate, never blocks gameplay.
  block('v03-roof-center', 9.2, 0.25, 1.7, new Vector3(0, 4.55, 4.1), roof);
  for (const side of [-1, 1]) {
    const roofEdge = MeshBuilder.CreateBox(`v03-roof-edge-${side}`, { width: 1.7, height: 0.25, depth: 1.7 }, scene);
    roofEdge.position.set(side * 5.0, 4.72, 4.1);
    roofEdge.rotation.z = side * 0.24;
    roofEdge.material = roof;
    block(`v03-roof-gold-${side}`, 0.5, 0.17, 1.72, new Vector3(side * 4.15, 4.72, 4.1), lantern);
  }

  // Pebble paths along the outer edge, with deterministic positions.
  for (let i = 0; i < 18; i++) {
    const side = i % 2 ? 1 : -1;
    const pebble = MeshBuilder.CreateSphere(`v03-pebble-${i}`, { diameter: 0.38, segments: 6 }, scene);
    pebble.position.set(side * (8.0 + (i % 3) * 0.65), 0.12, -9 + Math.floor(i / 2) * 2.35);
    pebble.scaling.set(1.35, 0.34, 0.8);
    pebble.material = i % 3 ? rockLight : rock;
  }
}
