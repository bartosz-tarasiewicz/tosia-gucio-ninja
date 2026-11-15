import Phaser from 'phaser';

/**
 * Give Gucio a distinct green energy-ninja outfit while keeping his face,
 * hair and the approved original painted silhouette intact.
 *
 * Changes only saturated gold fabric pixels, preserving transparency and the
 * illustration's shading. No network request or extra binary asset is needed.
 */
export function prepareGreenNinjaOutfit(scene: Phaser.Scene): void {
  const key = 'painted-gucio';
  if (!scene.textures.exists(key)) return;
  const source = scene.textures.get(key).getSourceImage() as HTMLImageElement;
  const width = source.naturalWidth || source.width;
  const height = source.naturalHeight || source.height;
  if (!width || !height) return;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return;
  ctx.drawImage(source, 0, 0, width, height);

  const pixels = ctx.getImageData(0, 0, width, height);
  const data = pixels.data;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 12) continue;
    const x = (i / 4) % width;
    const y = Math.floor(i / 4 / width);
    const [r, g, b] = [data[i], data[i + 1], data[i + 2]];
    const goldenFabric = r > g * 1.09 && g > b * 1.39
      && r - b > 42 && g - b > 19;
    // The illustrated face is between the headband and neck scarf.
    const exposedFace = x > width * 0.35 && x < width * 0.66
      && y > height * 0.35 && y < height * 0.50;
    if (!goldenFabric || exposedFace) continue;
    const lum = 0.30 * r + 0.59 * g + 0.11 * b;
    data[i] = Math.min(255, Math.round(lum * 0.50));
    data[i + 1] = Math.min(255, Math.round(lum * 1.18));
    data[i + 2] = Math.min(255, Math.round(lum * 0.55));
  }
  ctx.putImageData(pixels, 0, 0);
  // No sprites use the source yet: replace the key before generating the rig.
  scene.textures.remove(key);
  scene.textures.addCanvas(key, canvas);
}
