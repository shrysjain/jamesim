import { describe, expect, it } from 'vitest';
import { packCollisions, unpackCollisions } from './collisionAsset';
import type { CollisionAsset } from './types';

const asset: CollisionAsset = { boxes: [{ element: 'floor', center: [0, -0.1, 0], halfExtents: [5, 0.1, 5] }], meshes: [
  { element: 'bump-blue', vertices: [0, 0.123456789, 0, 1, 0, 0, 0, 0, 1], indices: [0, 1, 2] },
  { element: 'hub-red', vertices: [2, 0, 0, 3, 0, 0, 2, 0, 1], indices: [2, 1, 0] },
] };
describe('production collision packing', () => {
  it('preserves boxes, element identities and exactly the typed geometry sent to Rapier', () => {
    const packed = packCollisions(asset), restored = unpackCollisions(packed.buffer as ArrayBuffer);
    expect(restored.boxes).toEqual(asset.boxes);
    restored.meshes.forEach((mesh, i) => {
      expect(mesh.element).toBe(asset.meshes[i].element);
      expect(mesh.vertices).toEqual(new Float32Array(asset.meshes[i].vertices));
      expect(mesh.indices).toEqual(new Uint32Array(asset.meshes[i].indices));
    });
  });
  it('rejects truncated, wrong-version and surplus payloads instead of constructing partial collisions', () => {
    const good = packCollisions(asset);
    expect(() => unpackCollisions(good.slice(0, -4).buffer)).toThrow();
    const bad = good.slice(); bad[0] = 0; expect(() => unpackCollisions(bad.buffer)).toThrow();
    const extra = new Uint8Array(good.length + 4); extra.set(good); expect(() => unpackCollisions(extra.buffer)).toThrow();
  });
});
