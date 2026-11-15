import Phaser from 'phaser';

/**
 * Builds a tiny frame-by-frame animation atlas from the existing painted ninja.
 * Four limbs are masked from the character illustration and rotated around
 * elbows/ankles while the original painting supplies the still torso and head.
 * This keeps the approved character artwork without new binary assets.
 *
 * The atlas is generated once at scene creation, not on every game frame.
 */
type Point = readonly [number, number];
type Limb = { outline: readonly Point[]; pivot: Point };
type CharacterRig = Record<'leftArm' | 'rightArm' | 'leftFoot' | 'rightFoot', Limb>;

const RIGS: Record<'tosia' | 'gucio', CharacterRig> = {
  tosia: {
    leftArm: { outline: [[65,157],[96,153],[101,182],[83,194],[65,179]], pivot: [79,156] },
    rightArm: { outline: [[148,155],[177,151],[183,177],[159,192],[144,170]], pivot: [157,154] },
    leftFoot: { outline: [[63,218],[100,217],[104,256],[58,256]], pivot: [84,219] },
    rightFoot: { outline: [[115,215],[159,210],[167,256],[116,256]], pivot: [130,219] }
  },
  gucio: {
    leftArm: { outline: [[46,155],[76,153],[78,184],[53,190]], pivot: [62,156] },
    rightArm: { outline: [[149,151],[173,150],[179,181],[153,192]], pivot: [158,155] },
    leftFoot: { outline: [[50,214],[96,215],[94,257],[46,256]], pivot: [70,217] },
    rightFoot: { outline: [[106,214],[153,216],[161,256],[109,256]], pivot: [125,219] }
  }
};

const FRAME_NAMES = [
  'idle0', 'idle1', 'idle2', 'idle3',
  'run0', 'run1', 'run2', 'run3', 'run4', 'run5', 'run6', 'run7',
  'jump0', 'jump1',
  'attack0', 'attack1', 'attack2'
] as const;

const makeCanvas = (width: number, height: number): HTMLCanvasElement => {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
};

function traceOutline(ctx: CanvasRenderingContext2D, outline: readonly Point[]): void {
  ctx.beginPath();
  ctx.moveTo(outline[0][0], outline[0][1]);
  for (const [x, y] of outline.slice(1)) ctx.lineTo(x, y);
  ctx.closePath();
}

function makeLayer(source: HTMLImageElement, size: Point, limb: Limb): HTMLCanvasElement {
  const layer = makeCanvas(size[0], size[1]);
  const ctx = layer.getContext('2d');
  if (!ctx) return layer;
  ctx.drawImage(source, 0, 0, size[0], size[1]);
  ctx.globalCompositeOperation = 'destination-in';
  traceOutline(ctx, limb.outline);
  ctx.fill();
  ctx.globalCompositeOperation = 'source-over';
  return layer;
}

function drawRotated(
  ctx: CanvasRenderingContext2D,
  layer: HTMLCanvasElement,
  pivot: Point,
  degrees: number
): void {
  ctx.save();
  ctx.translate(pivot[0], pivot[1]);
  ctx.rotate(degrees * Math.PI / 180);
  ctx.drawImage(layer, -pivot[0], -pivot[1]);
  ctx.restore();
}

function drawFrame(
  ctx: CanvasRenderingContext2D,
  source: HTMLImageElement,
  body: HTMLCanvasElement,
  parts: Record<keyof CharacterRig, HTMLCanvasElement>,
  rig: CharacterRig,
  name: string,
  id: 'tosia' | 'gucio',
  width: number,
  height: number
): void {
  if (name.startsWith('idle')) {
    // Keep the full source illustration at rest: no masking or seams.
    const phase = Number(name.slice(-1)) / 4 * Math.PI * 2;
    const breathing = 1 + Math.sin(phase) * 0.006;
    ctx.save();
    ctx.translate(width / 2, height);
    ctx.scale(1, breathing);
    ctx.drawImage(source, -width / 2, -height);
    ctx.restore();
    return;
  }

  const run = name.startsWith('run');
  const jump = name.startsWith('jump');
  const attack = name.startsWith('attack');
  const step = run ? Math.sin(Number(name.slice(-1)) / 8 * Math.PI * 2) : 0;
  const lifting = jump ? (name.endsWith('0') ? 1 : -1) : 0;
  // Nya's sword slash and Lloyd's dual-sword strike have different arm poses.
  const strike = attack
    ? (id === 'tosia' ? [14, 46, -18] : [9, 33, -16])[Number(name.slice(-1))]
    : 0;

  // Exaggerated silhouettes keep leg motion readable at gameplay scale (108px).
  const footSwing = run ? step * 23 : lifting * 12;
  const armSwing = run ? step * 19 : jump ? -11 : 0;
  drawRotated(ctx, parts.leftFoot, rig.leftFoot.pivot, footSwing);
  drawRotated(ctx, parts.rightFoot, rig.rightFoot.pivot, -footSwing);
  drawRotated(ctx, parts.leftArm, rig.leftArm.pivot, -armSwing);
  drawRotated(ctx, parts.rightArm, rig.rightArm.pivot, armSwing + strike);
  ctx.drawImage(body, 0, 0);
}

export function prepareNinjaFrameAtlas(
  scene: Phaser.Scene,
  id: 'tosia' | 'gucio'
): boolean {
  const sourceKey = `painted-${id}`;
  const atlasKey = `ninja-frames-${id}`;
  if (!scene.textures.exists(sourceKey)) return false;
  if (scene.textures.exists(atlasKey)) return true;

  const source = scene.textures.get(sourceKey).getSourceImage() as HTMLImageElement;
  const width = source.naturalWidth || source.width;
  const height = source.naturalHeight || source.height;
  if (!width || !height) return false;

  const rig = RIGS[id];
  const size: Point = [width, height];
  const parts = {} as Record<keyof CharacterRig, HTMLCanvasElement>;
  const body = makeCanvas(width, height);
  const bodyCtx = body.getContext('2d');
  if (!bodyCtx) return false;
  bodyCtx.drawImage(source, 0, 0, width, height);
  for (const key of Object.keys(rig) as (keyof CharacterRig)[]) {
    parts[key] = makeLayer(source, size, rig[key]);
    // Remove the original limb before drawing its rotated copy.
    bodyCtx.save();
    bodyCtx.globalCompositeOperation = 'destination-out';
    traceOutline(bodyCtx, rig[key].outline);
    bodyCtx.fill();
    bodyCtx.restore();
  }

  const columns = 5;
  const sheet = makeCanvas(width * columns, height * Math.ceil(FRAME_NAMES.length / columns));
  const ctx = sheet.getContext('2d');
  if (!ctx) return false;
  for (const [i, frame] of FRAME_NAMES.entries()) {
    ctx.save();
    ctx.translate((i % columns) * width, Math.floor(i / columns) * height);
    drawFrame(ctx, source, body, parts, rig, frame, id, width, height);
    ctx.restore();
  }

  const texture = scene.textures.addCanvas(atlasKey, sheet);
  if (!texture) return false;
  for (const [i, frame] of FRAME_NAMES.entries()) {
    texture.add(frame, 0, (i % columns) * width, Math.floor(i / columns) * height, width, height);
  }
  return true;
}
