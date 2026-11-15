import { MeshBuilder, Scene, TransformNode, Vector3, type AbstractMesh } from '@babylonjs/core';
import { material } from './materials';
import { BOUNDS, GRAVITY, JUMP_SPEED, MOVE_SPEED, PLAYER_RADIUS, type PlayerId } from './constants';
import type { Input } from './Input';

/** Procedural toy-inspired ninja, with separate limb pivots and frame-rate-independent animation. */
export class Character {
  readonly root: TransformNode;
  readonly id: PlayerId;
  private readonly shadow: AbstractMesh;
  private readonly leftArm: TransformNode;
  private readonly rightArm: TransformNode;
  private readonly leftLeg: TransformNode;
  private readonly rightLeg: TransformNode;
  private readonly body: TransformNode;
  private verticalVelocity = 0;
  private attackQueued = false;
  private runTimer = 0;
  private idleTimer = 0;
  private attackTime = 0;
  private facing = 0;

  constructor(scene: Scene, id: PlayerId, start: Vector3) {
    this.id = id;
    this.root = new TransformNode(`${id}-root`, scene);
    this.root.position.copyFrom(start);
    const isTosia = id === 'tosia';
    const suit = material(scene, `${id}-suit`, isTosia ? '#14bea6' : '#e7a92c');
    const suitDark = material(scene, `${id}-dark`, isTosia ? '#086a72' : '#89512d');
    const trim = material(scene, `${id}-trim`, isTosia ? '#a7fff4' : '#fff2a4');
    const skin = material(scene, `${id}-skin`, '#f2c68a');
    const eyes = material(scene, `${id}-eyes`, '#1c2438');
    const belt = material(scene, `${id}-belt`, '#253247');
    const steel = material(scene, `${id}-steel`, '#d9e9ed');
    const swordGrip = material(scene, `${id}-sword-grip`, '#483747');

    const box = (name: string, parent: TransformNode, w: number, h: number, d: number, x: number, y: number, z: number, mat = suit): AbstractMesh => {
      const mesh = MeshBuilder.CreateBox(`${id}-${name}`, { width: w, height: h, depth: d }, scene);
      mesh.parent = parent;
      mesh.position.set(x, y, z);
      mesh.material = mat;
      return mesh;
    };
    const pivot = (name: string, x: number, y: number, z: number, parent = this.root): TransformNode => {
      const node = new TransformNode(`${id}-${name}`, scene);
      node.parent = parent;
      node.position.set(x, y, z);
      return node;
    };
    this.body = pivot('body-pivot', 0, 0.98, 0);
    box('torso', this.body, 0.84, 0.83, 0.45, 0, 0.25, 0, suit);
    box('chest-band', this.body, 0.86, 0.13, 0.48, 0, 0.38, 0, trim);
    box('belt', this.body, 0.90, 0.15, 0.50, 0, -0.15, 0, belt);
    box('buckle', this.body, 0.20, 0.14, 0.055, 0, -0.15, 0.28, trim);
    box('emblem', this.body, 0.22, 0.25, 0.035, 0, 0.31, 0.25, belt);

    this.leftArm = pivot('left-shoulder', -0.56, 1.49, 0, this.body);
    this.leftArm.position.y -= 0.98;
    this.rightArm = pivot('right-shoulder', 0.56, 1.49, 0, this.body);
    this.rightArm.position.y -= 0.98;
    for (const [side, arm] of [['left', this.leftArm], ['right', this.rightArm]] as const) {
      box(`${side}-sleeve`, arm, 0.30, 0.55, 0.42, 0, -0.23, 0, suitDark);
      const hand = MeshBuilder.CreateCylinder(`${id}-${side}-hand`, { diameter: 0.29, height: 0.27, tessellation: 16 }, scene);
      hand.parent = arm;
      hand.position.set(0, -0.59, 0);
      hand.material = skin;
      box(`${side}-cuff`, arm, 0.33, 0.10, 0.44, 0, -0.47, 0, trim);
    }
    this.leftLeg = pivot('left-hip', -0.22, 0.73, 0);
    this.rightLeg = pivot('right-hip', 0.22, 0.73, 0);
    for (const [side, leg] of [['left', this.leftLeg], ['right', this.rightLeg]] as const) {
      box(`${side}-leg`, leg, 0.37, 0.48, 0.43, 0, -0.22, 0, suit);
      box(`${side}-boot`, leg, 0.38, 0.26, 0.52, 0, -0.51, 0.075, suitDark);
    }
    const head = MeshBuilder.CreateCylinder(`${id}-head`, { diameter: 0.72, height: 0.62, tessellation: 24 }, scene);
    head.parent = this.body;
    head.position.set(0, 0.97, 0);
    head.material = skin;
    const hood = MeshBuilder.CreateCylinder(`${id}-hood`, { diameter: 0.81, height: 0.32, tessellation: 24 }, scene);
    hood.parent = this.body;
    hood.position.set(0, 1.22, 0);
    hood.material = suitDark;
    box('forehead-band', this.body, 0.80, 0.10, 0.48, 0, 1.11, 0.21, trim);
    box('mask', this.body, 0.78, 0.25, 0.18, 0, 0.82, 0.34, suitDark);
    box('left-eye', this.body, 0.105, 0.07, 0.05, -0.16, 1.01, 0.375, eyes);
    box('right-eye', this.body, 0.105, 0.07, 0.05, 0.16, 1.01, 0.375, eyes);
    // A sheathed training sword, purely visual for now.
    const sword = pivot('sword', 0.33, 1.2, -0.37);
    sword.rotation.z = -0.52;
    box('sword-scabbard', sword, 0.15, 1.0, 0.15, 0, 0.1, 0, belt);
    box('sword-guard', sword, 0.34, 0.09, 0.19, 0, 0.63, 0, steel);
    box('sword-handle', sword, 0.13, 0.33, 0.15, 0, 0.84, 0, swordGrip);

    this.shadow = MeshBuilder.CreateDisc(`${id}-shadow`, { radius: 0.62, tessellation: 28 }, scene);
    this.shadow.rotation.x = Math.PI / 2;
    this.shadow.position.set(start.x, 0.015, start.z);
    const shadowMat = material(scene, `${id}-shadow-mat`, '#0f2637');
    shadowMat.alpha = 0.24;
    shadowMat.disableLighting = true;
    this.shadow.material = shadowMat;
  }

  update(dt: number, input: Input, canMoveTo: (from: Vector3, to: Vector3) => boolean): void {
    const direction = input.get(this.id);
    if (direction.attack) {
      this.attackQueued = true;
      this.attackTime = 0.28;
    }
    const before = this.root.position.clone();
    const dx = direction.x * MOVE_SPEED * dt;
    const dz = direction.z * MOVE_SPEED * dt;
    const nextX = new Vector3(Math.max(BOUNDS.minX + PLAYER_RADIUS, Math.min(BOUNDS.maxX - PLAYER_RADIUS, before.x + dx)), before.y, before.z);
    if (canMoveTo(before, nextX)) this.root.position.x = nextX.x;
    const nextZ = new Vector3(this.root.position.x, before.y, Math.max(BOUNDS.minZ + PLAYER_RADIUS, Math.min(BOUNDS.maxZ - PLAYER_RADIUS, before.z + dz)));
    if (canMoveTo(this.root.position, nextZ)) this.root.position.z = nextZ.z;

    if (direction.jump && this.root.position.y <= 0.001) this.verticalVelocity = JUMP_SPEED;
    this.verticalVelocity -= GRAVITY * dt;
    this.root.position.y = Math.max(0, this.root.position.y + this.verticalVelocity * dt);
    if (this.root.position.y === 0) this.verticalVelocity = 0;

    const moving = direction.x !== 0 || direction.z !== 0;
    this.idleTimer += dt;
    this.attackTime = Math.max(0, this.attackTime - dt);
    if (moving) {
      const target = Math.atan2(direction.x, direction.z);
      const delta = Math.atan2(Math.sin(target - this.facing), Math.cos(target - this.facing));
      this.facing += delta * Math.min(1, dt * 14);
      this.runTimer += dt * 12;
    }
    this.root.rotation.y = this.facing;
    const gait = moving ? Math.sin(this.runTimer) : 0;
    const swing = gait * 0.48;
    this.leftLeg.rotation.x = swing;
    this.rightLeg.rotation.x = -swing;
    this.leftArm.rotation.x = -swing * 0.8;
    this.rightArm.rotation.x = swing * 0.8;
    this.body.rotation.z = moving ? Math.sin(this.runTimer * 0.5) * 0.035 : Math.sin(this.idleTimer * 1.8) * 0.02;
    this.body.position.y = 0.98 + (moving ? Math.abs(gait) * 0.045 : Math.sin(this.idleTimer * 2) * 0.025);
    if (this.root.position.y > 0.03) {
      this.leftLeg.rotation.x = -0.22;
      this.rightLeg.rotation.x = 0.27;
      this.leftArm.rotation.x = -0.28;
      this.rightArm.rotation.x = -0.28;
    }
    if (this.attackTime > 0) this.rightArm.rotation.x = -1.2 * Math.sin((this.attackTime / 0.28) * Math.PI);
    this.shadow.position.x = this.root.position.x;
    this.shadow.position.z = this.root.position.z;
    this.shadow.scaling.setAll(1 - Math.min(this.root.position.y / 8, 0.3));
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
