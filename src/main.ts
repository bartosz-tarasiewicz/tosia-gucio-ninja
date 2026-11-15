import './styles.css';
import Phaser from 'phaser';
import { prepareNinjaFrameAtlas } from './game/PaintedNinjaAnimation';

type PlayerId = 'tosia' | 'gucio';
type Controls = { left: Phaser.Input.Keyboard.Key; right: Phaser.Input.Keyboard.Key; jump: Phaser.Input.Keyboard.Key; attack: Phaser.Input.Keyboard.Key };
type Hero = {
  id: PlayerId;
  // Invisible Arcade sprite handles gameplay physics, independent of animation.
  sprite: Phaser.Physics.Arcade.Sprite;
  visual: Phaser.GameObjects.Image;
  controls: Controls;
  spawnX: number;
  spawnY: number;
  facing: number;
};
type Coin = { sprite: Phaser.GameObjects.Image; x: number; y: number; collected: boolean };
type Target = { x: number; y: number; body: Phaser.GameObjects.Image; hit: boolean };

const WORLD_WIDTH = 2350;
const GROUND_Y = 607;
// Approx. 184px at gravity 1150: reaches 148px-high first ledge without excessive airtime.
const JUMP_VELOCITY = -650;
const COYOTE_TIME_MS = 115;
const JUMP_BUFFER_MS = 135;
// A shared camera cannot keep both ninjas visible once they are over 1280px apart.
const MAX_PARTY_DISTANCE = 980;
const PALETTE = { rock: 0x172c43, grass: 0x62bf52, grassLight: 0x9be46d, stone: 0x31576a, gold: 0xffd46c };

class NinjaTemple extends Phaser.Scene {
  private platforms!: Phaser.Physics.Arcade.StaticGroup;
  private heroes!: [Hero, Hero];
  private coins: Coin[] = [];
  private targets: Target[] = [];
  private plates: Phaser.GameObjects.Image[] = [];
  private bridge?: Phaser.Physics.Arcade.Image;
  private bridgeArtwork?: Phaser.GameObjects.Image;
  private gateOpen = false;
  private ended = false;
  private coinCount = 0;
  private lastAttack: Record<PlayerId, number> = { tosia: 0, gucio: 0 };
  private lastGrounded: Record<PlayerId, number> = { tosia: -Infinity, gucio: -Infinity };
  private queuedJump: Record<PlayerId, number> = { tosia: -Infinity, gucio: -Infinity };
  private hud?: HTMLElement;
  private instruction?: HTMLElement;

  constructor() { super('NinjaTemple'); }

  preload(): void {
    this.load.svg('background', '/art/forest.svg');
    // Hand-painted v0.5 assets live in public/art/v05. On a clean checkout
    // without the optional art pack, the v0.4 vector art remains playable.
    this.load.image('painted-bg', '/art/v05/background.webp');
    this.load.image('painted-platform', '/art/v05/platform.webp');
    this.load.image('painted-ground', '/art/v05/ground.webp');
    this.load.image('painted-tosia', '/art/v05/tosia.webp');
    this.load.image('painted-gucio', '/art/v05/gucio.webp');
    this.load.svg('dragon-seal', '/art/v05/dragon-seal.svg', { width: 80, height: 96 });
    this.load.svg('dojo-target', '/art/v05/dojo-target.svg', { width: 100, height: 112 });
    this.load.svg('rune-pedestal', '/art/v05/rune-pedestal.svg', { width: 160, height: 92 });
    this.load.svg('ancient-bridge', '/art/v05/ancient-bridge.svg', { width: 320, height: 160 });
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

    const bgKey = this.textures.exists('painted-bg') ? 'painted-bg' : 'background';
    this.add.image(640, 360, bgKey)
      .setDisplaySize(1280, 720).setScrollFactor(0).setDepth(-20);

    // Parallax layer: light atmospheric mist, independent of collision.
    this.add.rectangle(1170, 575, WORLD_WIDTH, 160, 0x90d7c6, 0.06).setDepth(-10);
    this.prepareGroundStrip();
    this.prepareGroundCliffEdge();
    this.prepareFloatingPlatformArt();
    this.platforms = this.physics.add.staticGroup();

    this.addPlatform(360, GROUND_Y + 50, 720, 100);
    this.addPlatform(1650, GROUND_Y + 50, 1380, 100);
    this.addPlatform(185, 475, 270, 32);
    this.addPlatform(490, 370, 250, 32);
    this.addPlatform(1150, 493, 285, 32);
    this.addPlatform(1530, 391, 310, 32);
    this.addPlatform(1880, 475, 260, 32);

    // Bridge starts locked. It is an actual ancient arch, not a third chunk of
    // terrain. The artwork overlaps each island by 20px to hide joins.
    // The SVG's deck is at y=31/160; position it precisely at GROUND_Y.
    this.bridgeArtwork = this.add.image(850, GROUND_Y + 46, 'ancient-bridge')
      .setDisplaySize(300, 150).setDepth(1).setAlpha(0).setVisible(false);
    this.bridge = this.platforms.create(850, GROUND_Y + 50, 'pixel') as Phaser.Physics.Arcade.Image;
    this.bridge.setDisplaySize(260, 100).refreshBody().setVisible(false).disableBody(true, true);

    for (const x of [460, 615]) {
      this.add.ellipse(x, GROUND_Y - 4, 106, 23, x === 460 ? 0x47f4d3 : 0xffe394, 0.20).setDepth(1);
      const plate = this.add.image(x, GROUND_Y - 9, 'rune-pedestal')
        .setDisplaySize(100, 57)
        .setTint(x === 460 ? 0xc6ffed : 0xffe0a7)
        .setDepth(2);
      this.plates.push(plate);
    }

    for (const [x, y] of [[135, 551], [285, 429], [490, 321], [590, 548], [1050, 550], [1225, 443], [1550, 344], [1805, 420], [2020, 544]]) {
      const seal = this.add.image(x, y, 'dragon-seal').setDisplaySize(44, 52).setDepth(8);
      this.coins.push({ sprite: seal, x, y, collected: false });
    }

    for (const [x, y] of [[525, 315], [1520, 334]]) {
      const target = this.add.image(x, y, 'dojo-target').setDisplaySize(62, 70).setDepth(7);
      this.targets.push({ x, y, body: target, hit: false });
    }

    // The final gate is a glowing magical arch.
    const portal = this.add.container(2155, GROUND_Y - 110).setDepth(3);
    const rim = this.add.ellipse(0, 0, 115, 175, 0x53f3ed, 0.9).setStrokeStyle(12, 0xc5fff1);
    const inner = this.add.ellipse(0, 0, 75, 140, 0x1b7196, 0.86);
    const halo = this.add.ellipse(0, 0, 145, 200, 0x84fbea, 0.10);
    portal.add([halo, rim, inner]);
    this.tweens.add({ targets: halo, scaleX: 1.13, scaleY: 1.13, alpha: 0.36, yoyo: true, repeat: -1, duration: 1200 });

    // Create actual animation frames from the already-approved painted artwork.
    // The generated atlases include distinct leg/arm positions for movement,
    // jumping and attacks, and are prepared once at scene creation.
    prepareNinjaFrameAtlas(this, 'tosia');
    prepareNinjaFrameAtlas(this, 'gucio');
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

  /**
   * The v0.5 ground image was extracted from an illustrated scene. Its lower edge
   * includes unrelated foreground/UI details, and stretching the whole image over
   * long ground sections creates visible rectangular seams.
   * Build a short, repeatable strip from the clean moss-and-rock center instead.
   */
  private prepareGroundStrip(): void {
    if (!this.textures.exists('painted-ground')) return;
    const source = this.textures.get('painted-ground').getSourceImage() as HTMLImageElement;
    // Build a genuinely seamless texture: mirror the clean central rock strip.
    // The original 667x189 crop includes foreground flowers and unrelated UI
    // near the left and bottom edges; those must never be tiled into the level.
    const texture = this.textures.createCanvas('painted-ground-strip', 512, 112);
    if (!texture) return;
    const ctx = texture.getContext();
    ctx.clearRect(0, 0, 512, 112);
    ctx.drawImage(source, 265, 26, 256, 112, 0, 0, 256, 112);
    ctx.save();
    ctx.translate(512, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(source, 265, 26, 256, 112, 0, 0, 256, 112);
    ctx.restore();
    texture.refresh();
  }

  /**
   * Trim the artificial bright edge from the source platform render.
   * The soft alpha at the side corners blends its rocky silhouette into the
   * landscape instead of showing an opaque rectangular outline.
   */
  private prepareFloatingPlatformArt(): void {
    if (!this.textures.exists('painted-platform')) return;
    const source = this.textures.get('painted-platform').getSourceImage() as HTMLImageElement;
    const sw = source.naturalWidth || source.width;
    const sh = source.naturalHeight || source.height;
    if (sw < 48 || sh < 32) return;
    const image = this.textures.createCanvas('painted-platform-soft', 320, 144);
    if (!image) return;
    const ctx = image.getContext();
    ctx.clearRect(0, 0, 320, 144);
    // Cropping excludes the neon rim and the empty padded edges of the export.
    ctx.drawImage(source, sw * 0.07, sh * 0.06, sw * 0.86, sh * 0.78, 0, 0, 320, 144);
    ctx.globalCompositeOperation = 'destination-in';
    const sides = ctx.createLinearGradient(0, 0, 320, 0);
    sides.addColorStop(0, 'rgba(0,0,0,0)');
    sides.addColorStop(0.05, '#000');
    sides.addColorStop(0.95, '#000');
    sides.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = sides;
    ctx.fillRect(0, 0, 320, 144);
    ctx.globalCompositeOperation = 'source-over';
    image.refresh();
  }

  /**
   * A mossy, jagged cliff silhouette replaces the hard rectangular left edge
   * of the right-hand island. This is artwork only; colliders are unchanged.
   */
  private prepareGroundCliffEdge(): void {
    if (!this.textures.exists('painted-ground')) return;
    const source = this.textures.get('painted-ground').getSourceImage() as HTMLImageElement;
    const texture = this.textures.createCanvas('painted-ground-edge', 120, 160);
    if (!texture) return;
    const ctx = texture.getContext();
    ctx.clearRect(0, 0, 120, 160);
    ctx.drawImage(source, 230, 25, 200, 130, 0, 0, 120, 160);
    ctx.globalCompositeOperation = 'destination-in';
    ctx.beginPath();
    ctx.moveTo(24, 0);
    ctx.quadraticCurveTo(7, 10, 18, 32);
    ctx.lineTo(8, 45);
    ctx.lineTo(25, 65);
    ctx.lineTo(12, 82);
    ctx.lineTo(21, 98);
    ctx.lineTo(3, 123);
    ctx.lineTo(19, 151);
    ctx.lineTo(120, 160);
    ctx.lineTo(120, 0);
    ctx.closePath();
    ctx.fillStyle = '#fff';
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
    texture.refresh();
  }

  private addPlatform(x: number, y: number, width: number, height: number): void {
    this.createPlatformArtwork(x, y, width, height);
    const collider = this.platforms.create(x, y, 'pixel') as Phaser.Physics.Arcade.Image;
    collider.setDisplaySize(width, height).refreshBody().setVisible(false);
    if (height < 100) {
      // One-way elevated ledges: the ninja can jump through their underside
      // and land on top. Full solid collision previously trapped both players
      // below the first overhanging platform, even after increasing jump height.
      const body = collider.body as Phaser.Physics.Arcade.StaticBody;
      body.checkCollision.down = false;
      body.checkCollision.left = false;
      body.checkCollision.right = false;
    }
  }

  private createPlatformArtwork(x: number, y: number, width: number, height: number): Phaser.GameObjects.Graphics | Phaser.GameObjects.Image | Phaser.GameObjects.TileSprite | Phaser.GameObjects.Container {
    // Use the same seamless rock pattern on BOTH banks. The old left bank
    // stretched the original screenshot; the right repeated non-matching crops.
    if (height >= 100 && this.textures.exists('painted-ground-strip')) {
      const top = y - height / 2;
      const left = x - width / 2;
      // The second island receives an irregular silhouette at its left edge.
      const edgeWidth = width > 900 && this.textures.exists('painted-ground-edge') ? 75 : 0;
      const bodyWidth = width - edgeWidth;
      const body = this.add.tileSprite(left + edgeWidth + bodyWidth / 2, top + 50, bodyWidth, 112, 'painted-ground-strip');
      if (!edgeWidth) return body.setDepth(0);
      const cliff = this.add.image(left + edgeWidth / 2, top + 68, 'painted-ground-edge')
        .setDisplaySize(edgeWidth + 12, 148);
      return this.add.container(0, 0, [body, cliff]).setDepth(0);
    }
    const painted = height >= 100 ? 'painted-ground'
      : (this.textures.exists('painted-platform-soft') ? 'painted-platform-soft' : 'painted-platform');
    if (this.textures.exists(painted)) {
      // Align the painted moss edge with the invisible physics surface.
      const artHeight = height >= 100 ? Math.max(height + 62, width * 0.25) : Math.max(height + 64, width * 0.35);
      const top = y - height / 2;
      return this.add.image(x, top - 6 + artHeight / 2, painted)
        .setDisplaySize(width, artHeight).setDepth(0);
    }

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
    const paintedKey = `painted-${id}`;
    const hasPainted = this.textures.exists(paintedKey);
    const sprite = this.physics.add.sprite(x, y, hasPainted ? paintedKey : id).setDepth(10);
    if (hasPainted) sprite.setDisplaySize(108, 152);
    else sprite.setScale(0.84);
    sprite.setCollideWorldBounds(true);
    // Hitbox stays compact, even for high-resolution transparent art.
    if (hasPainted) {
      const image = this.textures.get(paintedKey).getSourceImage() as HTMLImageElement;
      sprite.setSize(image.width * 0.55, image.height * 0.86)
        .setOffset(image.width * 0.225, image.height * 0.12);
    } else sprite.setSize(56, 114).setOffset(30, 20);
    // Do not transform the collision body when animating. Separate artwork
    // remains bottom-aligned with the physics body so feet meet the ground.
    const frameAtlas = `ninja-frames-${id}`;
    const hasFrameAtlas = this.textures.exists(frameAtlas);
    const visual = this.add.image(x, y,
      hasFrameAtlas ? frameAtlas : (hasPainted ? paintedKey : id),
      hasFrameAtlas ? 'idle0' : undefined)
      .setDisplaySize(hasPainted ? 108 : 97, hasPainted ? 152 : 123)
      .setOrigin(0.5, 1)
      .setDepth(10);
    sprite.setVisible(false);
    sprite.setBounce(0);
    sprite.setMaxVelocity(245, 900);
    const kb = this.input.keyboard;
    if (!kb) throw new Error('Brak obsługi klawiatury');
    const key = (name: string): Phaser.Input.Keyboard.Key => kb.addKey(name, false);
    const controls = id === 'tosia'
      ? { left: key('A'), right: key('D'), jump: key('SPACE'), attack: key('Q') }
      : { left: key('LEFT'), right: key('RIGHT'), jump: key('ENTER'), attack: key('SHIFT') };
    return { id, sprite, visual, controls, spawnX: x, spawnY: y, facing: 1 };
  }

  update(time: number): void {
    if (this.ended) return;
    for (const hero of this.heroes) {
      const body = hero.sprite.body as Phaser.Physics.Arcade.Body;
      const { left, right, jump, attack } = hero.controls;
      const axis = Number(right.isDown) - Number(left.isDown);
      // Each ninja controls only their own movement. If the partner is
      // almost a screen away, stop the ninja moving farther OUTWARD.
      // Never change the stationary partner's position (old tether bug).
      const partner = this.heroes.find(other => other.id !== hero.id)!;
      const distance = hero.sprite.x - partner.sprite.x;
      const movingAway = axis !== 0 && Math.sign(axis) === Math.sign(distance);
      const available = Math.max(0, MAX_PARTY_DISTANCE - Math.abs(distance));
      const maxOutwardSpeed = available * 1000 / Math.max(1, this.game.loop.delta);
      const speed = movingAway ? Math.min(240, maxOutwardSpeed) : 240;
      hero.sprite.setVelocityX(axis * speed);
      if (axis) {
        hero.facing = axis;
        hero.visual.setFlipX(axis < 0);
      }
      // A forgiving jump, plus coyote time and input buffering for two kids on one keyboard.
      if (body.blocked.down || body.touching.down) this.lastGrounded[hero.id] = time;
      if (Phaser.Input.Keyboard.JustDown(jump)) this.queuedJump[hero.id] = time;
      if (time - this.queuedJump[hero.id] <= JUMP_BUFFER_MS
          && time - this.lastGrounded[hero.id] <= COYOTE_TIME_MS) {
        hero.sprite.setVelocityY(JUMP_VELOCITY);
        this.queuedJump[hero.id] = -Infinity;
        this.lastGrounded[hero.id] = -Infinity;
      }
      const jumping = !body.blocked.down && !body.touching.down;
      // Display animated frames independently from the collision body.
      // A painted sprite is split into four limb layers when its atlas is built.
      const visual = hero.visual;
      const frameAtlas = `ninja-frames-${hero.id}`;
      const hasFrames = this.textures.exists(frameAtlas);
      const running = Math.abs(body.velocity.x) > 7 && !jumping;
      const attacking = time - this.lastAttack[hero.id] < 270;
      const cycle = time * 0.017 + (hero.id === 'gucio' ? 1.2 : 0);
      if (hasFrames) {
        if (visual.texture.key !== frameAtlas) visual.setTexture(frameAtlas, 'idle0');
        const animationFrame = attacking
          ? `attack${Math.min(2, Math.floor((time - this.lastAttack[hero.id]) / 90))}`
          : jumping
            ? (body.velocity.y < 0 ? 'jump0' : 'jump1')
            : running
              ? `run${Math.floor(time / 75) % 8}`
              : `idle${Math.floor(time / 320) % 4}`;
        if (visual.frame.name !== animationFrame) visual.setFrame(animationFrame);
      } else {
        const sourceKey = this.textures.exists(`painted-${hero.id}`) ? `painted-${hero.id}` : hero.id;
        if (visual.texture.key !== sourceKey) visual.setTexture(sourceKey);
      }
      const runBob = running ? Math.abs(Math.sin(cycle)) * 2 : 0;
      const idleBreath = !jumping && !running ? Math.sin(time * 0.0035) * 0.004 : 0;
      const stretch = jumping ? 1.025 : running ? 1 + Math.sin(cycle * 2) * 0.009 : 1 + idleBreath;
      const squash = jumping ? 0.98 : running ? 1 - Math.sin(cycle * 2) * 0.007 : 1;
      visual.setScale((visual.width > 150 ? 108 : 97) / visual.width * squash,
        (visual.height > 160 ? 152 : 123) / visual.height * stretch);
      const attackLean = attacking ? Math.sin((time - this.lastAttack[hero.id]) / 270 * Math.PI) * 4 : 0;
      visual.setAngle(jumping ? hero.facing * (body.velocity.y < 0 ? -4 : 3)
        : running ? Math.sin(cycle) * 1.5 - hero.facing * attackLean
          : Math.sin(time * 0.002) * 0.5 - hero.facing * attackLean);
      visual.setPosition(hero.sprite.x, body.bottom + (running ? runBob : 0) + 2);
      if (Phaser.Input.Keyboard.JustDown(attack) && time - this.lastAttack[hero.id] > 240) {
        this.lastAttack[hero.id] = time;
        this.attack(hero);
      }
      // Respawn before the ninja disappears below the visible playfield.
      if (hero.sprite.y > 740) this.resetHero(hero);
    }

    // The previous implementation shifted BOTH heroes here whenever their
    // separation exceeded the limit, so the leading ninja dragged the other.
    // Movement is now bounded per controller above; no teleporting either hero.

    // Simultaneous occupancy: no permanent gate state until both cooperate.
    if (!this.gateOpen) {
      const standing = this.heroes.map(hero => this.plates.findIndex(plate =>
        Math.abs(hero.sprite.x - plate.x) < 37 && Math.abs(hero.sprite.y - (GROUND_Y - 58)) < 72));
      if (standing.includes(0) && standing.includes(1)) this.unlockBridge();
    }

    for (const coin of this.coins) {
      if (coin.collected) continue;
      coin.sprite.y = coin.y + Math.sin(time / 300 + coin.x) * 5;
      coin.sprite.setScale(0.55 + Math.sin(time / 260 + coin.x) * 0.022);
      // A seal can be grabbed with any part of the character's visible body,
      // not only near the sprite pivot (which made elevated badges seem broken).
      const sealArea = new Phaser.Geom.Rectangle(coin.x - 24, coin.sprite.y - 28, 48, 56);
      if (this.heroes.some(hero => {
        const body = hero.sprite.body as Phaser.Physics.Arcade.Body;
        const reach = new Phaser.Geom.Rectangle(body.x - 8, body.y - 8, body.width + 16, body.height + 16);
        return Phaser.Geom.Intersects.RectangleToRectangle(reach, sealArea);
      })) {
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
    const body = hero.sprite.body as Phaser.Physics.Arcade.Body;
    hero.visual.setPosition(hero.spawnX, body.bottom + 2);
  }

  private unlockBridge(): void {
    this.gateOpen = true;
    this.bridge?.enableBody(false, 850, GROUND_Y + 50, true, true);
    this.bridge?.setVisible(false);
    if (this.bridgeArtwork) {
      this.bridgeArtwork.setVisible(true);
      this.tweens.add({ targets: this.bridgeArtwork, alpha: 1, duration: 400, ease: 'Sine.easeOut' });
    }
    for (const plate of this.plates) plate.setTint(0xb9ffe5);
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
          nearby.t.body.setTint(0x79f2b5);
          this.refreshHud();
        }
      } });
  }

  private refreshHud(): void {
    if (this.hud) this.hud.textContent = `💠 ${this.coinCount}/9   🎯 ${this.targets.filter(t => t.hit).length}/2`;
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
