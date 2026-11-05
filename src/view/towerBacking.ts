import type { Mesh } from 'three';

/** The retained field converter paints Tower Upper/Lower Plastic RGB 6/8/10.
 * Remove those triangles from tower rendering only; rungs, frame and contacts
 * keep their prepared geometry. Hub panels use the same paint and must remain. */
export function removeTowerBacking(mesh: Mesh): number {
  if (mesh.userData.kind !== 'tower') return 0;
  const geometry = mesh.geometry, color = geometry.getAttribute('color'), index = geometry.getIndex();
  if (!color || !index) return 0;
  const backing = (i: number) => Math.round(color.getX(i) * 255) === 6
    && Math.round(color.getY(i) * 255) === 8 && Math.round(color.getZ(i) * 255) === 10;
  const kept: number[] = []; let removed = 0;
  for (let i = 0; i < index.count; i += 3) {
    const a = index.getX(i), b = index.getX(i + 1), c = index.getX(i + 2);
    if (backing(a) && backing(b) && backing(c)) removed++;
    else kept.push(a, b, c);
  }
  if (removed) geometry.setIndex(kept);
  return removed;
}
