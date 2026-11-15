import { Color3, Scene, StandardMaterial } from '@babylonjs/core';

export function material(scene: Scene, name: string, hex: string, emissive?: string): StandardMaterial {
  const result = new StandardMaterial(name, scene);
  result.diffuseColor = Color3.FromHexString(hex);
  result.specularColor = new Color3(0.13, 0.16, 0.19);
  if (emissive) result.emissiveColor = Color3.FromHexString(emissive);
  return result;
}
