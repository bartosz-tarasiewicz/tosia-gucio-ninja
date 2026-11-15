import { MeshBuilder, Scene, TransformNode, Vector3, type AbstractMesh } from '@babylonjs/core';
import { material } from './materials';
import { BOUNDS, GRAVITY, JUMP_SPEED, MOVE_SPEED, PLAYER_RADIUS, type PlayerId } from './constants';
import type { Input } from './Input';

export class Character {
  readonly root: TransformNode;
  readonly id: PlayerId;
  private readonly shadow: AbstractMesh;
  private readonly leftArm: AbstractMesh;
  private readonly rightArm: AbstractMesh;
  private verticalVelocity = 0;
  private attackQueued = false;
  private runTimer = 0;

  constructor(scene: Scene, id: PlayerId, start: Vector3) {
    this.id = id;
    this.root = new TransformNode(`${id}-root`, scene);
    this.root.position.copyFrom(start);
    const isTosia = id === 'tosia';
    const suit = material(scene, `${id}-suit`, isTosia ? '#26c8b0' : '#f6b834');
    const suitDark = material(scene, `${id}-dark`, isTosia ? '#087c83' : '#ac5c2d');
    const skin = material(scene, `${id}-skin`, '#f4cc90');
    const eyes = material(scene, `${id}-eyes`, '#18233f');
    const belt = material(scene, `${id}-belt`, '#2d354e');
    const accent = material(scene, `${id}-accent`, isTosia ? '#b6fff0' : '#fff0ad', isTosia ? '#113d36' : '#4c3212');

    const part = (name: string, w: number, h: number, d: number, x: number, y: number, z: number, mat = suit): AbstractMesh => {
      const mesh = MeshBuilder.CreateBox(`${id}-${name}`, { width: w, height: h, depth: d }, scene);
      mesh.parent = this.root;
      mesh.position.set(x, y, z);
      mesh.material = mat;
      return mesh;
    };
    part('left-boot', 0.34, 0.22, 0.49, -0.22, 0.15, 0.07, suitDark);
    part('right-boot', 0.34, 0.22, 0.49, 0.22, 0.15, 0.07, suitDark);
    part('left-leg', 0.35, 0.57, 0.42, -0.2, 0.46, 0.0, suit);
    part('right-leg', 0.35, 0.57, 0.42, 0.2, 0.46, 0.0, suit);
    part('torso', 0.88, 0.92, 0.48, 0, 1.19, 0, suit);
    part('belt', 0.90, 0.12, 0.51, 0, 0.78, 0, belt);
    part('emblem', 0.18, 0.26, 0.03, 0, 1.30, 0.256, accent);
    this.leftArm = part('left-arm', 0.27, 0.78, 0.40, -0.59, 1.22, 0.0, suitDark);
    this.rightArm = part('right-arm', 0.27, 0.78, 0.40, 0.59, 1.22, 0.0, suitDark);

    const head = MeshBuilder.CreateCylinder(`${id}-head`, { diameter: 0.75, height: 0.64, tessellation: 20 }, scene);
    head.parent = this.root;
    head.position.y = 1.93;
    head.material = skin;
    const hood = MeshBuilder.CreateCylinder(`${id}-hood`, { diameter: 0.81, height: 0.30, tessellation: 20 }, scene);
    hood.parent = this.root;
    hood.position.y = 2.20;
    hood.material = suitDark;
    part('mask', 0.76, 0.22, 0.17, 0, 1.80, 0.34, suitDark);
    part('left-eye', 0.085, 0.08, 0.045, -0.16, 2.02, 0.381, eyes);
    part('right-eye', 0.085, 0.08, 0.045, 0.16, 2.02, 0.381, eyes);

    this.shadow = MeshBuilder.CreateDisc(`${id}-shadow`, { radius: 0.58, tessellation: 24 }, scene);
    this.shadow.rotation.x = Math.PI / 2;
    this.shadow.position.set(start.x, 0.01, start.z);
    const shadowMat = material(scene, `${id}-shadow-mat`, '#0f2637');
    shadowMat.alpha = 0.28;
    shadowMat.disableLighting = true;
    this.shadow.material = shadowMat;
  }

  update(dt: number, input: Input, canMoveTo: (from: Vector3, to: Vector3) => boolean): void {
    const direction = input.get(this.id);
    if (direction.attack) this.attackQueued = true;
    const before = this.root.position.clone();
    const dx = direction.x * MOVE_SPEED * dt;
    const dz = direction.z * MOVE_SPEED * dt;

    // Oddzielny ruch po każdej osi pozwala ślizgać się wzdłuż ścian.
    const nextX = new Vector3(Math.max(BOUNDS.minX + PLAYER_RADIUS, Math.min(BOUNDS.maxX - PLAYER_RADIUS, before.x + dx)), before.y, before.z);
    if (canMoveTo(before, nextX)) this.root.position.x = nextX.x;
    const nextZ = new Vector3(this.root.position.x, before.y, Math.max(BOUNDS.minZ + PLAYER_RADIUS, Math.min(BOUNDS.maxZ - PLAYER_RADIUS, before.z + dz)));
    if (canMoveTo(this.root.position, nextZ)) this.root.position.z = nextZ.z;

    if (direction.jump && this.root.position.y <= 0.001) this.verticalVelocity = JUMP_SPEED;
    this.verticalVelocity -= GRAVITY * dt;
    this.root.position.y = Math.max(0, this.root.position.y + this.verticalVelocity * dt);
    if (this.root.position.y === 0) this.verticalVelocity = 0;

    const moving = direction.x !== 0 || direction.z !== 0;
    if (moving) {
      this.root.rotation.y = Math.atan2(direction.x, direction.z);
      this.runTimer += dt * 11;
    }
    const armSwing = moving ? Math.sin(this.runTimer) * 0.26 : 0;
    this.leftArm.rotation.x = armSwing;
    this.rightArm.rotation.x = -armSwing;
    this.shadow.position.x = this.root.position.x;
    this.shadow.position.z = this.root.position.z;
    this.shadow.scaling.setAll(1 - Math.min(this.root.position.y / 8, 0.25));
  }

  consumeAttack(): boolean {
    const value = this.attackQueued;
    this.attackQueued = false;
    return value;
  }

  near(point: Vector3, radius: number): boolean {
    const dx = this.root.position.x - point.x;
    const dz = this.root.position.z - point.z;
    return (dx * dx + dz * dz) <= radius * radius && this.root.position.y <= 0.5;
  }
}
