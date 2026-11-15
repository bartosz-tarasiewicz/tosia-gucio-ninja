import {
  Color3, MeshBuilder, Scene, StandardMaterial, Vector3,
  type AbstractMesh, type Mesh
} from '@babylonjs/core';
import { material } from './materials';
import { PLATE_RADIUS, type PlayerId } from './constants';
import type { Character } from './Character';

interface Target {
  mesh: Mesh;
  position: Vector3;
  hit: boolean;
}

interface Projectile {
  mesh: Mesh;
  start: Vector3;
  end: Vector3;
  elapsed: number;
}

interface Coin {
  mesh: Mesh;
  center: Vector3;
  collected: boolean;
  phase: number;
}

const COIN_POSITIONS: Array<[number, number]> = [
  [-7.2, -7.7], [7.0, -6.8], [-1.1, -4.4],
  [1.2, 0.1], [0, 7.3], [-6.5, 9.2]
];

export class World {
  readonly plates: Record<PlayerId, Vector3> = {
    tosia: new Vector3(-4.1, 0, -0.4),
    gucio: new Vector3(4.1, 0, -0.4)
  };
  readonly exit = new Vector3(0, 0, 9.2);
  readonly maxCoins = COIN_POSITIONS.length;
  private readonly gate: Mesh;
  private readonly plateMaterials: Record<PlayerId, StandardMaterial>;
  private readonly coins: Coin[] = [];
  private readonly targets: Target[] = [];
  private readonly projectiles: Projectile[] = [];
  private readonly shurikenMat: StandardMaterial;
  private readonly portal: Mesh;
  private gateOpened = false;
  private elapsed = 0;

  constructor(scene: Scene) {
    const ground = material(scene, 'ground', '#a7b7a0');
    const grass = material(scene, 'grass', '#668a69');
    const tiles = material(scene, 'stone-tiles', '#c6c4ad');
    const path = material(scene, 'path-tiles', '#dad7b9');
    const cliff = material(scene, 'cliff', '#647c79');
    const gold = material(scene, 'gold', '#f5c755', '#4a3610');
    this.shurikenMat = material(scene, 'shuriken', '#e7f8ff', '#4ad3ff');
    const water = material(scene, 'water', '#1b6c91', '#0a2e49');
    const pillar = material(scene, 'temple-pillar', '#9aab9f');
    const pillarAccent = material(scene, 'temple-pillar-accent', '#c0d6be');
    const gateMat = material(scene, 'gate', '#9b5768', '#28131e');
    const portalMat = material(scene, 'portal', '#6cddff', '#239cbf');
    const portalCenter = material(scene, 'portal-center', '#186e80', '#15506c');
    portalCenter.alpha = 0.45;

    const block = (name: string, width: number, height: number, depth: number, x: number, y: number, z: number, mat: StandardMaterial): Mesh => {
      const mesh = MeshBuilder.CreateBox(name, { width, height, depth }, scene);
      mesh.position.set(x, y, z);
      mesh.material = mat;
      return mesh;
    };

    // Dwa brzegi oddzielone kanałem. Jedyna droga prowadzi przez bramę.
    block('front-island', 24, 0.85, 15.5, 0, -0.47, -4.5, cliff);
    block('rear-island', 24, 0.85, 8.6, 0, -0.47, 8.0, cliff);
    block('front-surface', 23.8, 0.11, 15.2, 0, 0.0, -4.5, ground);
    block('rear-surface', 23.8, 0.11, 8.4, 0, 0.0, 8.0, ground);
    block('water', 25.2, 0.10, 1.65, 0, -0.22, 3.82, water);
    block('bridge', 7.3, 0.56, 2.0, 0, -0.23, 3.9, tiles);
    block('bridge-walk', 6.8, 0.10, 1.95, 0, 0.07, 3.9, path);

    // Klockowy deseń: proste wypukłości w terenie.
    const stud = material(scene, 'ground-studs', '#98ac95');
    for (let x = -10; x <= 10; x += 2) {
      for (const z of [-10, -8, -6, -4, -2, 0, 2, 6, 8, 10]) {
        if (z === 2 && Math.abs(x) < 5) continue;
        if (z === 0 && Math.abs(x) > 2 && Math.abs(x) < 6) continue;
        const dot = MeshBuilder.CreateCylinder(`stud-${x}-${z}`, { diameter: 0.17, height: 0.07, tessellation: 10 }, scene);
        dot.position.set(x, 0.09, z);
        dot.material = stud;
      }
    }

    // Ścieżka prowadząca od startu do płyt i bramy.
    for (let z = -9.0; z <= 1.7; z += 1.7) {
      block(`path-center-${z}`, 4.6, 0.09, 1.25, 0, 0.10, z, path);
    }
    block('path-left', 5, 0.09, 1.15, -3.2, 0.11, -0.4, tiles);
    block('path-right', 5, 0.09, 1.15, 3.2, 0.11, -0.4, tiles);
    for (let z = 5.25; z < 10; z += 1.5) {
      block(`path-rear-${z}`, 4.5, 0.09, 1.1, 0, 0.10, z, path);
    }

    // Dwie płyty naciskowe, wymagające dwóch graczy.
    const leftMat = material(scene, 'plate-left', '#14676a', '#0a272c');
    const rightMat = material(scene, 'plate-right', '#6a501e', '#30220b');
    this.plateMaterials = { tosia: leftMat, gucio: rightMat };
    for (const id of ['tosia', 'gucio'] as const) {
      const plate = MeshBuilder.CreateCylinder(`${id}-plate`, { diameter: PLATE_RADIUS * 2, height: 0.16, tessellation: 48 }, scene);
      plate.position.copyFrom(this.plates[id]);
      plate.position.y = 0.19;
      plate.material = this.plateMaterials[id];
      const ring = MeshBuilder.CreateTorus(`${id}-plate-ring`, { diameter: 2.14, thickness: 0.12, tessellation: 48 }, scene);
      ring.position.copyFrom(plate.position);
      ring.position.y += 0.10;
      ring.material = gold;
    }

    // Zamyka jedyny most; po wykonaniu zagadki znika z przejścia.
    this.gate = block('closed-gate', 7.05, 3.25, 0.52, 0, 1.62, 4.05, gateMat);
    for (let i = -3; i <= 3; i++) {
      block(`gate-bars-${i}`, 0.21, 3.3, 0.62, i * 0.95, 1.65, 3.70, pillarAccent);
    }
    // Kratki pozostają dekoracją nad mostem po otwarciu — rodzic do bramy.
    // Części krat poniżej mają własny uchwyt, są więc ukrywane razem z bramą.
    for (const mesh of scene.meshes.filter((mesh) => mesh.name.startsWith('gate-bars-'))) {
      mesh.parent = this.gate;
      mesh.position.x -= this.gate.position.x;
      mesh.position.y -= this.gate.position.y;
      mesh.position.z -= this.gate.position.z;
    }
    for (const x of [-3.85, 3.85]) {
      block(`bridge-pillar-${x}`, 0.92, 3.7, 1.06, x, 1.85, 4.1, pillar);
      block(`bridge-cap-${x}`, 1.25, 0.40, 1.27, x, 3.8, 4.1, pillarAccent);
      block(`bridge-beacon-${x}`, 0.32, 0.56, 0.32, x, 4.35, 4.1, gold);
    }
    block('gate-top', 8.6, 0.63, 1.32, 0, 4.05, 4.1, pillar);

    // Portal kończący testową misję.
    this.portal = MeshBuilder.CreateTorus('exit-portal', { diameter: 3.1, thickness: 0.36, tessellation: 56 }, scene);
    this.portal.position.set(0, 1.83, 9.9);
    this.portal.rotation.x = Math.PI / 2;
    this.portal.material = portalMat;
    const portalSurface = MeshBuilder.CreateDisc('portal-surface', { radius: 1.33, tessellation: 48 }, scene);
    portalSurface.position.set(0, 1.83, 9.84);
    portalSurface.material = portalCenter;
    block('portal-platform', 5.2, 0.32, 3.1, 0, 0.0, 9.7, pillar);
    for (const x of [-2.5, 2.5]) {
      block(`portal-stela-${x}`, 0.60, 3.5, 0.65, x, 1.75, 9.75, pillar);
      block(`portal-stela-cap-${x}`, 0.8, 0.26, 0.82, x, 3.6, 9.75, gold);
    }

    // Monety są w pełni proceduralne — bez zewnętrznych zasobów.
    for (const [index, [x, z]] of COIN_POSITIONS.entries()) {
      const coin = MeshBuilder.CreateTorus(`coin-${index + 1}`, { diameter: 0.68, thickness: 0.22, tessellation: 24 }, scene);
      coin.position.set(x, 0.85, z);
      coin.rotation.x = Math.PI / 2;
      coin.material = gold;
      this.coins.push({ mesh: coin, center: new Vector3(x, 0.85, z), collected: false, phase: index * 1.3 });
    }

    // Dwa treningowe cele: dodatkowa aktywność, niezależna od bramy.
    const targetOuter = material(scene, 'target-outer', '#f9d37a', '#7e4a0b');
    const targetInner = material(scene, 'target-inner', '#a63854', '#581526');
    for (const [i, x, z] of [[0, -7.0, -2.7], [1, 7.0, -2.7]] as const) {
      const disc = MeshBuilder.CreateCylinder(`ninja-target-${i}`, { diameter: 1.35, height: 0.18, tessellation: 36 }, scene);
      disc.position.set(x, 1.5, z);
      disc.rotation.x = Math.PI / 2;
      disc.material = targetOuter;
      const bullseye = MeshBuilder.CreateCylinder(`ninja-bullseye-${i}`, { diameter: 0.64, height: 0.20, tessellation: 36 }, scene);
      bullseye.parent = disc;
      bullseye.position.y = 0.01;
      bullseye.material = targetInner;
      block(`target-pole-${i}`, 0.17, 1.0, 0.17, x, 0.5, z, pillar);
      this.targets.push({ mesh: disc, position: disc.position.clone(), hit: false });
    }

    // Roślinność i dekoracje na obrzeżach; nie blokują prototypowej fizyki.
    const trunk = material(scene, 'tree-trunk', '#53705c');
    const canopy = material(scene, 'tree-canopy', '#2e7366');
    const canopies: Array<[number, number, number]> = [
      [-9.2, -8.3, 2.5], [-9.0, -2.7, 2.2], [9.0, -9.1, 2.6], [9.4, -2.8, 2.3],
      [-9.5, 6.8, 2.5], [9.3, 7.0, 2.5], [-8.2, 10.7, 2.1], [8.5, 10.6, 2.3]
    ];
    for (const [x, z, h] of canopies) {
      const stem = MeshBuilder.CreateCylinder(`bamboo-${x}-${z}`, { diameter: 0.36, height: h, tessellation: 10 }, scene);
      stem.position.set(x, h / 2, z);
      stem.material = trunk;
      for (let k = 0; k < 3; k++) {
        const leaf = MeshBuilder.CreateSphere(`leaf-${x}-${z}-${k}`, { diameter: 1.25, segments: 8 }, scene);
        leaf.position.set(x + (k - 1) * 0.27, h + (k % 2) * 0.35, z + (k - 1) * 0.16);
        leaf.scaling.set(1.0, 0.55, 1.0);
        leaf.material = canopy;
      }
    }
    for (const [x, z] of [[-6.8, 6.0], [6.9, 6.2], [-9.3, -5], [9.2, -5]] as Array<[number, number]>) {
      block(`rubble-${x}-${z}`, 1.35, 0.55, 1.35, x, 0.28, z, grass);
    }
  }

  get targetsHit(): number { return this.targets.filter((target) => target.hit).length; }
  get maxTargets(): number { return this.targets.length; }

  throwShuriken(hero: Character): void {
    const origin = hero.root.position.add(new Vector3(0, 1.45, 0));
    // W tej wersji celujemy automatycznie w najbliższą tarczę w promieniu 4 jednostek.
    const candidate = this.targets
      .filter((target) => !target.hit)
      .map((target) => ({ target, distance: Vector3.Distance(origin, target.position) }))
      .filter((entry) => entry.distance <= 4.2)
      .sort((a, b) => a.distance - b.distance)[0];
    const facing = new Vector3(Math.sin(hero.root.rotation.y), 0, Math.cos(hero.root.rotation.y));
    const destination = candidate?.target.position.clone() ?? origin.add(facing.scale(3.0));
    const projectile = MeshBuilder.CreateCylinder(`shuriken-${Date.now()}-${this.projectiles.length}`, { diameter: 0.48, height: 0.09, tessellation: 4 }, this.gate.getScene());
    projectile.rotation.x = Math.PI / 2;
    projectile.position.copyFrom(origin);
    projectile.material = this.shurikenMat;
    this.projectiles.push({ mesh: projectile, start: origin, end: destination, elapsed: 0 });
    if (candidate) {
      candidate.target.hit = true;
      candidate.target.mesh.material = material(this.gate.getScene(), `hit-target-${this.targetsHit}`, '#46e3a0', '#1f9d70');
    }
  }

  update(dt: number): void {
    this.elapsed += dt;
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const projectile = this.projectiles[i];
      projectile.elapsed += dt;
      const fraction = Math.min(1, projectile.elapsed / 0.28);
      projectile.mesh.position = Vector3.Lerp(projectile.start, projectile.end, fraction);
      projectile.mesh.rotation.y += dt * 18;
      if (fraction >= 1) {
        projectile.mesh.dispose();
        this.projectiles.splice(i, 1);
      }
    }
    for (const coin of this.coins) {
      if (coin.collected) continue;
      coin.mesh.rotation.y += dt * 2.2;
      coin.mesh.position.y = coin.center.y + Math.sin(this.elapsed * 3 + coin.phase) * 0.14;
    }
    this.portal.scaling.setAll(1 + Math.sin(this.elapsed * 2.1) * 0.03);
    if (this.gateOpened && this.gate.position.y > -4.2) {
      this.gate.position.y = Math.max(-4.2, this.gate.position.y - dt * 3.8);
    }
  }

  setPlateActive(id: PlayerId, isActive: boolean): void {
    const mat = this.plateMaterials[id];
    mat.emissiveColor = isActive ? new Color3(0.25, 0.85, 0.72) : new Color3(0.05, 0.05, 0.04);
  }

  openGate(): void { this.gateOpened = true; }
  get isGateOpen(): boolean { return this.gateOpened; }

  collectCoins(characters: readonly Character[]): number {
    let collectedNow = 0;
    for (const coin of this.coins) {
      if (coin.collected) continue;
      if (characters.some((hero) => hero.near(coin.center, 0.90))) {
        coin.collected = true;
        coin.mesh.setEnabled(false);
        collectedNow += 1;
      }
    }
    return collectedNow;
  }
}
