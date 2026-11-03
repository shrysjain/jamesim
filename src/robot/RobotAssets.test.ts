import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer';
import { readRuntimeManifest } from '../../scripts/runtime-manifest';
import { ROBOTS } from './registry';

// Review new assets against these bounds; do not raise them just to make a submission pass.
const limits = { bytes: 6 * 1024 * 1024, triangles: 650_000, primitives: 160 };
const manifest = readRuntimeManifest(), robotAssets = manifest.groups.flatMap(g => g.files).filter(f => f.path.startsWith('public/assets/robots/'));
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder });
beforeAll(async () => { await MeshoptDecoder.ready; });
describe('prepared robot asset contract', () => {
  it('ships exactly the registered models, each through its own manifest', () => {
    expect(robotAssets.map(f => f.path).sort()).toEqual(Object.values(ROBOTS).map(d => `public${d.model}`).sort());
    for (const d of Object.values(ROBOTS)) {
      const record = JSON.parse(readFileSync(`assets/robots/${d.id}/runtime.json`, 'utf8'));
      expect(record.robotId).toBe(d.id);
    }
  });
  for (const d of Object.values(ROBOTS)) it(`${d.id}: embedded CAD, declared animation nodes and bounded payload`, async () => {
    const bytes = readFileSync(`public${d.model}`), doc = await io.readBinary(bytes);
    const nodes = doc.getRoot().listNodes().filter(n => n.getExtras().mechanism), names = nodes.map(n => n.getExtras().mechanism as string);
    expect(new Set(names).size).toBe(names.length);
    for (const name of [...d.visual.requiredNodes, ...d.modules.flatMap(m => [`${m.name}-fork`, `${m.name}-wheel`])]) expect(names, `missing ${name}`).toContain(name);
    expect(doc.getRoot().listMaterials().some(m => m.getName() === d.visual.bumperMaterial)).toBe(true);
    for (const resource of [...doc.getRoot().listBuffers(), ...doc.getRoot().listTextures()]) expect(resource.getURI()).toBe('');
    let triangles = 0, primitives = 0;
    for (const node of doc.getRoot().listNodes()) for (const p of node.getMesh()?.listPrimitives() ?? []) {
      expect(p.getMode()).toBe(4); // triangle primitives
      triangles += (p.getIndices()?.getCount() ?? p.getAttribute('POSITION')!.getCount()) / 3; primitives++;
    }
    expect(bytes.byteLength).toBeLessThanOrEqual(limits.bytes);
    expect(triangles).toBeLessThanOrEqual(limits.triangles);
    expect(primitives).toBeLessThanOrEqual(limits.primitives);
  });
});
