import { expect, it } from 'vitest';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer';
import { BufferAttribute, BufferGeometry, Mesh } from 'three';
import { removeTowerBacking } from './towerBacking';

it('removes only the painted backing of both prepared towers, preserving hubs and tower frame triangles', async () => {
  await MeshoptDecoder.ready;
  const doc = await new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder }).read('public/assets/rebuilt-field.glb');
  let towers = 0, hubs = 0;
  for (const node of doc.getRoot().listNodes()) {
    const kind = node.getExtras().kind;
    if (kind !== 'tower' && kind !== 'hub') continue;
    for (const primitive of node.getMesh()?.listPrimitives() ?? []) {
      const colors = primitive.getAttribute('COLOR_0')!, indices = primitive.getIndices()!.getArray()!;
      const values = new Float32Array(Array.from({ length: colors.getCount() }, (_, i) => colors.getElement(i, [])).flat());
      const mesh = new Mesh(new BufferGeometry().setAttribute('color', new BufferAttribute(values, 4)).setIndex(Array.from(indices)));
      mesh.userData.kind = kind;
      const before = Array.from(mesh.geometry.getIndex()!.array), removed = removeTowerBacking(mesh);
      if (kind === 'hub') { expect(removed).toBe(0); expect(Array.from(mesh.geometry.getIndex()!.array)).toEqual(before); hubs++; }
      else {
        expect(removed).toBeGreaterThan(0); expect(mesh.geometry.getIndex()!.count).toBe(before.length - removed * 3);
        expect(mesh.geometry.getIndex()!.count).toBeGreaterThan(1000);
        expect(removeTowerBacking(mesh)).toBe(0); towers++;
      }
      mesh.geometry.dispose();
    }
  }
  expect(towers).toBe(2); expect(hubs).toBeGreaterThanOrEqual(2);
});
