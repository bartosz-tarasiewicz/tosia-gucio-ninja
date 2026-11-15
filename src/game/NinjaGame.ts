import {
  Color3, Color4, DirectionalLight, Engine, FreeCamera, HemisphericLight,
  Scene, Vector3
} from '@babylonjs/core';
import { Character } from './Character';
import { Input } from './Input';
import { World } from './World';
import { BRIDGE_HALF_WIDTH, GATE_Z, PLAYER_RADIUS, PLATE_RADIUS } from './constants';

export class NinjaGame {
  private readonly engine: Engine;
  private readonly scene: Scene;
  private readonly camera: FreeCamera;
  private readonly input: Input;
  private readonly world: World;
  private readonly heroes: readonly [Character, Character];
  private readonly objective: HTMLElement;
  private readonly coinCounter: HTMLElement;
  private readonly targetsCounter: HTMLElement;
  private coins = 0;
  private completed = false;
  private readonly resize = (): void => this.engine.resize();

  constructor(canvas: HTMLCanvasElement) {
    this.engine = new Engine(canvas, true, { antialias: true, stencil: true });
    this.engine.setHardwareScalingLevel(Math.max(1, window.devicePixelRatio / 1.75));
    this.scene = new Scene(this.engine);
    this.scene.clearColor = new Color4(0.12, 0.20, 0.29, 1.0);
    this.scene.ambientColor = Color3.FromHexString('#c5d8ce');

    const light = new HemisphericLight('ambient', new Vector3(0, 1, 0), this.scene);
    light.intensity = 0.85;
    light.groundColor = Color3.FromHexString('#71878a');
    const sun = new DirectionalLight('sun', new Vector3(-0.45, -1, 0.25), this.scene);
    sun.intensity = 0.9;
    sun.diffuse = Color3.FromHexString('#ffedbd');

    this.camera = new FreeCamera('camera', new Vector3(0, 18, -23), this.scene);
    this.camera.fov = 0.78;
    this.camera.minZ = 0.1;
    this.camera.maxZ = 120;
    this.camera.inputs.clear();
    this.scene.activeCamera = this.camera;

    this.world = new World(this.scene);
    this.heroes = [
      new Character(this.scene, 'tosia', new Vector3(-2.3, 0, -8.7)),
      new Character(this.scene, 'gucio', new Vector3(2.3, 0, -8.7))
    ];
    this.input = new Input();
    const objective = document.querySelector<HTMLElement>('#objective');
    const coinCounter = document.querySelector<HTMLElement>('#coins');
    const targetsCounter = document.querySelector<HTMLElement>('#targets');
    if (!objective || !coinCounter || !targetsCounter) throw new Error('Brak elementów HUD');
    this.targetsCounter = targetsCounter;
    this.objective = objective;
    this.coinCounter = coinCounter;
    this.camera.setTarget(new Vector3(0, 0, -4.1));
    window.addEventListener('resize', this.resize);
  }

  start(): void {
    this.engine.runRenderLoop(() => {
      const dt = Math.min(this.engine.getDeltaTime() / 1000, 0.05);
      if (!this.completed) this.update(dt);
      this.scene.render();
    });
  }

  private readonly canMoveTo = (from: Vector3, to: Vector3): boolean => {
    // Wzdłuż kanału poruszać można się wyłącznie po moście.
    if (to.z > GATE_Z - 0.87 && to.z < GATE_Z + 0.87 && Math.abs(to.x) > BRIDGE_HALF_WIDTH - PLAYER_RADIUS) return false;
    // Przed rozwiązaniem zagadki brama blokuje przejście z obu stron.
    if (!this.world.isGateOpen) {
      if (from.z <= GATE_Z - 0.72 && to.z > GATE_Z - 0.72) return false;
      if (from.z >= GATE_Z + 0.72 && to.z < GATE_Z + 0.72) return false;
    }
    return true;
  };

  private update(dt: number): void {
    for (const hero of this.heroes) {
      hero.update(dt, this.input, this.canMoveTo);
      if (hero.consumeAttack()) this.world.throwShuriken(hero);
    }
    this.targetsCounter.textContent = `${this.world.targetsHit}/${this.world.maxTargets}`;
    const [tosia, gucio] = this.heroes;
    const onLeft = tosia.near(this.world.plates.tosia, PLATE_RADIUS);
    const onRight = gucio.near(this.world.plates.gucio, PLATE_RADIUS);
    // Dowolna postać może obsłużyć dowolną płytę; wymagane są dwie różne postacie.
    const leftActive = this.heroes.some((hero) => hero.near(this.world.plates.tosia, PLATE_RADIUS));
    const rightActive = this.heroes.some((hero) => hero.near(this.world.plates.gucio, PLATE_RADIUS));
    this.world.setPlateActive('tosia', leftActive);
    this.world.setPlateActive('gucio', rightActive);
    if (!this.world.isGateOpen && leftActive && rightActive && (onLeft || onRight)) {
      this.world.openGate();
      this.objective.textContent = 'Brama otwarta! Zbierzcie monety i dotrzyjcie OBOJE do portalu.';
      this.objective.classList.add('achieved');
    }

    this.coins += this.world.collectCoins(this.heroes);
    this.coinCounter.textContent = `${this.coins}`;
    this.world.update(dt);

    if (this.world.isGateOpen && this.heroes.every((hero) => hero.near(this.world.exit, 1.95))) {
      this.finish();
    }

    // Wspólna kamera, płynnie śledząca środek między graczami.
    const middleX = (tosia.root.position.x + gucio.root.position.x) / 2;
    const middleZ = (tosia.root.position.z + gucio.root.position.z) / 2;
    const center = new Vector3(middleX, 0.5, middleZ + 3.2);
    const desiredCamera = center.add(new Vector3(0, 17.8, -22.5));
    const factor = Math.min(1, dt * 2.5);
    this.camera.position = Vector3.Lerp(this.camera.position, desiredCamera, factor);
    this.camera.setTarget(Vector3.Lerp(this.camera.getTarget(), center, factor));
  }

  private finish(): void {
    this.completed = true;
    const endCoins = document.querySelector<HTMLElement>('#end-coins');
    const overlay = document.querySelector<HTMLElement>('#complete');
    if (endCoins) endCoins.textContent = `${this.coins} / ${this.world.maxCoins}`;
    overlay?.classList.remove('hidden');
  }

  dispose(): void {
    window.removeEventListener('resize', this.resize);
    this.input.dispose();
    this.engine.stopRenderLoop();
    this.scene.dispose();
    this.engine.dispose();
  }
}
