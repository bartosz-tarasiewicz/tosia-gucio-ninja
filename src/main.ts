import './styles.css';
import Phaser from 'phaser';

type PlayerId = 'tosia' | 'gucio';
type Controls = { left: Phaser.Input.Keyboard.Key; right: Phaser.Input.Keyboard.Key; jump: Phaser.Input.Keyboard.Key; attack: Phaser.Input.Keyboard.Key };
type Hero = { id: PlayerId; sprite: Phaser.Physics.Arcade.Sprite; controls: Controls; spawnX: number; spawnY: number; facing: number };
type Coin = { sprite: Phaser.GameObjects.Arc; x: number; y: number; collected: boolean };
type Target = { x: number; y: number; body: Phaser.GameObjects.Arc; hit: boolean };

const WORLD_WIDTH = 2350;
const GROUND_Y = 607;
const PALETTE = { rock: 0x172c43, grass: 0x62bf52, grassLight: 0x9be46d, stone: 0x31576a, gold: 0xffd46c };

class NinjaTemple extends Phaser.Scene {
  private platforms!: Phaser.Physics.Arcade.StaticGroup;
  private heroes!: [Hero, Hero];
  private coins: Coin[] = [];
  private targets: Target[] = [];
  private plates: Phaser.GameObjects.Arc[] = [];
  private bridge?: Phaser.Physics.Arcade.Image;
  private bridgeArtwork?: Phaser.GameObjects.Graphics;
  private portal?: Phaser.GameObjects.Container;
  private gateOpen = false;
  private ended = false;
  private coinCount = 0;
  private lastAttack: Record<PlayerId, number> = { tosia: 0, gucio: 0 };
  private hud?: HTMLElement;
  private instruction?: HTMLElement;
  private backdrop?: Phaser.GameObjects.Image;

  constructor() { super('NinjaTemple'); }

  preload(): void {
    this.load.svg('background', '/art/forest.svg');
    this.load.svg('tosia', '/art/tosia.svg', { width: 116, height: 146 });
    this.load.svg('gucio', '/art/gucio.svg', { width: 116, height: 146 });
    this.load.svg('tosia-jump', '/art/tosia-jump.svg', { width: 116, height: 146 });
    this.load.svg('gucio-jump', '/art/gucio-jump.svg', { width: 116, height: 146 });
  }

  create(): void {
    const art = this.add.graphics();
    art.fillStyle(0xffffff).fillRect(0, 0, 4, 4);
    art.generateTexture('pixel', 4, 4);
    art.destroy();

    this.backdrop = this.add.image(640, 360, 'background')
      .setDisplaySize(1280, 720).setScrollFactor(0).setDepth(-20);

    // Parallax layer: light atmospheric mist, independent of collision.
    this.add.rectangle(1170, 575, WORLD_WIDTH, 160, 0x90d7c6, 0.06).setDepth(-10);
    this.platforms = this.physics.add.staticGroup();

    this.addPlatform(360, GROUND_Y + 50, 720, 100);
    this.addPlatform(1650, GROUND_Y + 50, 1380, 100);
    this.addPlatform(185, 475, 270, 32);
    this.addPlatform(490, 370, 250, 32);
    this.addPlatform(1150, 493, 285, 32);
    this.addPlatform(1530, 391, 310, 32);
    this.addPlatform(1880, 475, 260, 32);

    // Bridge starts locked. Both heroes must stand on distinct rune plates.
    this.bridgeArtwork = this.createPlatformArtwork(850, GROUND_Y + 50, 260, 100);
    this.bridgeArtwork.setVisible(false);
    this.bridge = this.platforms.create(850, GROUND_Y + 50, 'pixel') as Phaser.Physics.Arcade.Image;
    this.bridge.setDisplaySize(260, 100).refreshBody().setVisible(false).disableBody(true, true);

    for (const x of [460, 615]) {
      const plate = this.add.circle(x, GROUND_Y - 9, 30, x === 460 ? 0x36ddc0 : 0xffd36e, 0.68)
        .setStrokeStyle(5, 0xffedaf).setDepth(2);
      this.plates.push(plate);
      this.add.ellipse(x, GROUND_Y - 4, 76, 17, 0xffffff, 0.13).setDepth(1);
    }

    for (const [x, y] of [[135, 551], [285, 429], [490, 321], [590, 548], [1050, 550], [1225, 443], [1550, 344], [1805, 420], [2020, 544]]) {
      const coin = this.add.circle(x, y, 13, PALETTE.gold).setStrokeStyle(4, 0xfff0a5).setDepth(8);
      this.coins.push({ sprite: coin, x, y, collected: false });
    }

    for (const [x, y] of [[525, 315], [1520, 334]]) {
      const target = this.add.circle(x, y, 24, 0x933d52).setStrokeStyle(7, 0xf5d389).setDepth(7);
      this.add.circle(x, y, 10, 0xffeeac).setDepth(8);
      this.targets.push({ x, y, body: target, hit: false });
    }

    // The final gate is a glowing magical arch.
    const portal = this.add.container(2155, GROUND_Y - 110).setDepth(3);
    const rim = this.add.ellipse(0, 0, 115, 175, 0x53f3ed, 0.9).setStrokeStyle(12, 0xc5fff1);
    const inner = this.add.ellipse(0, 0, 75, 140, 0x1b7196, 0.86);
    const halo = this.add.ellipse(0, 0, 145, 200, 0x84fbea, 0.10);
    portal.add([halo, rim, inner]);
    this.portal = portal;
    this.tweens.add({ targets: halo, scaleX: 1.13, scaleY: 1.13, alpha: 0.36, yoyo: true, repeat: -1, duration: 1200 });

    this.heroes = [this.addHero('tosia', 112, 480), this.addHero('gucio', 188, 480)];
    for (const hero of this.heroes) this.physics.add.collider(hero.sprite, this.platforms);

    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, 720);
    this.physics.world.setBounds(0, -140, WORLD_WIDTH, 1200);
    this.cameras.main.scrollX = 0;
    this.hud = document.querySelector('#counters') ?? undefined;
    this.instruction = document.querySelector('#objective') ?? undefined;
    this.refreshHud();
    window.addEventListener('blur', this.onBlur);
    this.events.once('shutdown', () => window.removeEventListener('blur', this.onBlur));
  }

  private readonly onBlur = (): void => {
    for (const h of this.heroes ?? []) h.sprite.setVelocityX(0);
  };

  private addPlatform(x: number, y: number, width: number, height: number): void {
    this.createPlatformArtwork(x, y, width, height);
    const collider = this.platforms.create(x, y, 'pixel') as Phaser.Physics.Arcade.Image;
    collider.setDisplaySize(width, height).refreshBody().setVisible(false);
  }

  private createPlatformArtwork(x: number, y: number, width: number, height: number): Phaser.GameObjects.Graphics {
    const g = this.add.graphics({ x, y }).setDepth(0);
    g.fillStyle(PALETTE.rock).fillRoundedRect(-width / 2, -height / 2, width, height, 10);
    g.fillStyle(PALETTE.stone).fillRect(-width / 2 + 8, -height / 2 + 18, width - 16, Math.max(2, height - 30));
    g.fillStyle(PALETTE.grass).fillRoundedRect(-width / 2, -height / 2 - 11, width, 23, 9);
    g.fillStyle(PALETTE.grassLight).fillRoundedRect(-width / 2 + 9, -height / 2 - 13, width - 18, 7, 3);
    g.lineStyle(3, 0x172c43, 0.5);
    for (let dx = -width / 2 + 30; dx < width / 2 - 10; dx += 65) {
      g.beginPath().moveTo(dx, -height / 2 + 35).lineTo(dx + 15, -height / 2 + 52).lineTo(dx + 8, -height / 2 + 70).strokePath();
    }
    return g;
  }

  private addHero(id: PlayerId, x: number, y: number): Hero {
    const sprite = this.physics.add.sprite(x, y, id).setDepth(10).setScale(0.84);
    sprite.setCollideWorldBounds(true);
    sprite.setSize(56, 114).setOffset(30, 20);
    sprite.setBounce(0);
    sprite.setMaxVelocity(245, 900);
    const kb = this.input.keyboard;
    if (!kb) throw new Error('Brak obsługi klawiatury');
    const key = (name: string): Phaser.Input.Keyboard.Key => kb.addKey(name, false);
    const controls = id === 'tosia'
      ? { left: key('A'), right: key('D'), jump: key('SPACE'), attack: key('Q') }
      : { left: key('LEFT'), right: key('RIGHT'), jump: key('ENTER'), attack: key('SHIFT') };
    return { id, sprite, controls, spawnX: x, spawnY: y, facing: 1 };
  }

  update(time: number): void {
    if (this.ended) return;
    for (const hero of this.heroes) {
      const body = hero.sprite.body as Phaser.Physics.Arcade.Body;
      const { left, right, jump, attack } = hero.controls;
      const axis = Number(right.isDown) - Number(left.isDown);
      hero.sprite.setVelocityX(axis * 240);
      if (axis) {
        hero.facing = axis;
        hero.sprite.setFlipX(axis < 0);
      }
      if (Phaser.Input.Keyboard.JustDown(jump) && body.blocked.down) hero.sprite.setVelocityY(-540);
      const jumping = !body.blocked.down;
      hero.sprite.setTexture(jumping ? `${hero.id}-jump` : hero.id);
      hero.sprite.setAngle(!jumping && axis ? Math.sin(time * 0.016) * 2.4 : 0);
      if (Phaser.Input.Keyboard.JustDown(attack) && time - this.lastAttack[hero.id] > 240) {
        this.lastAttack[hero.id] = time;
        this.attack(hero);
      }
      if (hero.sprite.y > 850) this.resetHero(hero);
    }

    // Simultaneous occupancy: no permanent gate state until both cooperate.
    if (!this.gateOpen) {
      const standing = this.heroes.map(hero => this.plates.findIndex(plate =>
        Math.abs(hero.sprite.x - plate.x) < 37 && Math.abs(hero.sprite.y - (GROUND_Y - 58)) < 72));
      if (standing.includes(0) && standing.includes(1)) this.unlockBridge();
    }

    for (const coin of this.coins) {
      if (coin.collected) continue;
      coin.sprite.y = coin.y + Math.sin(time / 300 + coin.x) * 5;
      coin.sprite.setScale(1 + Math.sin(time / 240 + coin.x) * 0.08);
      if (this.heroes.some(hero => Phaser.Math.Distance.Between(hero.sprite.x, hero.sprite.y, coin.x, coin.sprite.y) < 51)) {
        coin.collected = true;
        coin.sprite.destroy();
        this.coinCount++;
        this.refreshHud();
      }
    }

    if (this.gateOpen && this.heroes.every(hero => hero.sprite.x > 2100 && hero.sprite.y > 380)) this.win();
    const middle = (this.heroes[0].sprite.x + this.heroes[1].sprite.x) / 2;
    const desired = Phaser.Math.Clamp(middle - 640, 0, WORLD_WIDTH - 1280);
    this.cameras.main.scrollX = Phaser.Math.Linear(this.cameras.main.scrollX, desired, 0.055);
  }

  private resetHero(hero: Hero): void {
    hero.sprite.setPosition(hero.spawnX, hero.spawnY);
    hero.sprite.setVelocity(0, 0);
  }

  private unlockBridge(): void {
    this.gateOpen = true;
    this.bridge?.enableBody(false, 850, GROUND_Y + 50, true, true);
    this.bridge?.setVisible(false);
    this.bridgeArtwork?.setVisible(true);
    for (const plate of this.plates) plate.setFillStyle(0x94ffb7, 1);
    if (this.instruction) this.instruction.textContent = 'Most odblokowany! Wspólnie dotrzyjcie do magicznego portalu.';
    this.cameras.main.flash(360, 91, 246, 196, false);
  }

  private attack(hero: Hero): void {
    const x = hero.sprite.x + hero.facing * 36;
    const y = hero.sprite.y - 10;
    const shuriken = this.add.star(x, y, 4, 6, 20, 0xe1faff).setStrokeStyle(3, 0x2e9bbc).setDepth(12);
    const nearby = this.targets.filter(t => !t.hit)
      .map(t => ({ t, d: Phaser.Math.Distance.Between(x, y, t.x, t.y) }))
      .filter(item => item.d < 230)
      .sort((a, b) => a.d - b.d)[0];
    const destination = nearby ? { x: nearby.t.x, y: nearby.t.y } : { x: x + hero.facing * 240, y: y - 18 };
    this.tweens.add({ targets: shuriken, x: destination.x, y: destination.y, angle: 720, duration: 300,
      onComplete: () => {
        shuriken.destroy();
        if (nearby && !nearby.t.hit) {
          nearby.t.hit = true;
          nearby.t.body.setFillStyle(0x43dba1);
          this.refreshHud();
        }
      } });
  }

  private refreshHud(): void {
    if (this.hud) this.hud.textContent = `✦ ${this.coinCount}/9   🎯 ${this.targets.filter(t => t.hit).length}/2`;
  }

  private win(): void {
    this.ended = true;
    const overlay = document.querySelector('#complete');
    const result = document.querySelector('#end-coins');
    if (result) result.textContent = `${this.coinCount} / 9`;
    overlay?.classList.remove('hidden');
  }
}

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: 1280,
  height: 720,
  backgroundColor: '#193d5a',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  render: { antialias: true, pixelArt: false },
  physics: { default: 'arcade', arcade: { gravity: { x: 0, y: 1150 }, debug: false } },
  scene: NinjaTemple
});

document.querySelector('#restart')?.addEventListener('click', () => window.location.reload());
