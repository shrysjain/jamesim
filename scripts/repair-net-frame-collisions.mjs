/** Restore the concave net-base frames from the retained prepared CAD.
 * The old per-part convex hull filled their openings with invisible shelves.
 * Run from the repo root; original rendering and all other contacts are retained. */
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer';
import { Matrix4, Vector3 } from 'three';

const path = 'public/assets/field-collisions.json';
const collisions = JSON.parse(await readFile(path, 'utf8'));
await MeshoptDecoder.ready;
const doc = await new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder }).read('public/assets/rebuilt-field.glb');
const round = x => Math.round(x * 1e6) / 1e6;
function components(vertices, indices) {
  const parent = vertices.map((_, i) => i), keys = new Map();
  const root = i => { while (parent[i] !== i) { parent[i] = parent[parent[i]]; i = parent[i]; } return i; };
  for (let i = 0; i < vertices.length; i++) {
    const key = vertices[i].map(x => Math.round(x * 1e5)).join(',');
    if (keys.has(key)) parent[root(i)] = root(keys.get(key)); else keys.set(key, i);
  }
  for (let i = 0; i < indices.length; i += 3) {
    const r = root(indices[i]); parent[root(indices[i + 1])] = r; parent[root(indices[i + 2])] = r;
  }
  const groups = new Map();
  for (let i = 0; i < indices.length; i += 3) {
    const r = root(indices[i]); if (!groups.has(r)) groups.set(r, []); groups.get(r).push(i);
  }
  return [...groups.values()].map(offsets => {
    const ids = offsets.flatMap(i => indices.slice(i, i + 3)), used = [...new Set(ids)];
    const min = [0, 1, 2].map(k => Math.min(...used.map(i => vertices[i][k])));
    const max = [0, 1, 2].map(k => Math.max(...used.map(i => vertices[i][k])));
    return { offsets, ids, used, min, max };
  });
}
// Measured GE-26300 net-base frame: thin, wide, immediately below the mouth.
const isFrame = ({ min, max }) => min[1] > 1.6 && max[1] < 1.7 && max[1] - min[1] < .04
  && max[0] - min[0] > .6 && max[2] - min[2] > 1.3;
const frames = new Map();
for (const node of doc.getRoot().listNodes()) {
  if (node.getExtras().kind !== 'hub' || node.getExtras().net) continue;
  for (const primitive of node.getMesh()?.listPrimitives() ?? []) {
    const matrix = new Matrix4().fromArray(node.getWorldMatrix()), position = primitive.getAttribute('POSITION');
    const vertices = Array.from({ length: position.getCount() }, (_, i) => new Vector3(...position.getElement(i, [])).applyMatrix4(matrix).toArray().map(round));
    const indices = Array.from(primitive.getIndices().getArray());
    for (const frame of components(vertices, indices).filter(isFrame)) {
      const id = node.getExtras().elementId;
      if (frames.has(id)) throw new Error(`Duplicate net frame: ${id}`);
      frames.set(id, { vertices, ...frame });
    }
  }
}
if (frames.size !== 2) throw new Error(`Expected two prepared net frames, found ${frames.size}`);
for (const [id, frame] of frames) {
  const mesh = collisions.meshes.find(m => m.element === id);
  if (!mesh) throw new Error(`Missing contact mesh: ${id}`);
  const vertices = Array.from({ length: mesh.vertices.length / 3 }, (_, i) => mesh.vertices.slice(i * 3, i * 3 + 3));
  const matches = components(vertices, mesh.indices).filter(isFrame);
  if (matches.length !== 1) throw new Error(`Expected one contact frame in ${id}`);
  const old = matches[0];
  if (old.min.some((v, k) => Math.abs(v - frame.min[k]) > .001) || old.max.some((v, k) => Math.abs(v - frame.max[k]) > .001)) throw new Error(`Frame bounds mismatch: ${id}`);
  const removed = new Set(old.offsets), kept = [];
  for (let i = 0; i < mesh.indices.length; i += 3) if (!removed.has(i)) kept.push(...mesh.indices.slice(i, i + 3));
  const output = [], remap = new Map();
  const indices = kept.map(i => { if (!remap.has(i)) { remap.set(i, output.length / 3); output.push(...vertices[i]); } return remap.get(i); });
  const base = output.length / 3, frameMap = new Map(frame.used.map((i, k) => [i, base + k]));
  for (const i of frame.used) output.push(...frame.vertices[i]);
  indices.push(...frame.ids.map(i => frameMap.get(i)));
  mesh.vertices = output; mesh.indices = indices;
  console.log(`${id}: ${old.ids.length / 3} contact triangles -> ${frame.ids.length / 3} concave CAD triangles`);
}
const bytes = Buffer.from(JSON.stringify(collisions));
await writeFile(path, bytes);
const manifestPath = 'assets/runtime-manifest.json', manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
const record = manifest.groups.flatMap(g => g.files).find(f => f.path === path);
if (!record) throw new Error('Missing runtime contact record');
record.bytes = bytes.length; record.sha256 = createHash('sha256').update(bytes).digest('hex');
await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
