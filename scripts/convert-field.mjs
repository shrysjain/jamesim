import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { gunzipSync } from 'node:zlib';
import { deserialize } from 'node:v8';
import { Document, NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { weld, simplify, meshopt, prune } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptSimplifier } from 'meshoptimizer';
import { Vector3, Color } from 'three';
import { ConvexGeometry } from 'three/addons/geometries/ConvexGeometry.js';

// Intermediate tessellation is generated offline; the browser only loads GLB and colliders.
const binary = await readFile('assets/intermediate/field-meshes.bin');
const meshes = [];
for (let offset = 0; offset < binary.length;) {
  const length = binary.readUInt32LE(offset); offset += 4;
  meshes.push(deserialize(gunzipSync(binary.subarray(offset, offset + length))));
  offset += length;
}
const raw = { meshes, root: JSON.parse(await readFile('assets/intermediate/field-root.json', 'utf8')) };
const source = await readFile('assets/source/field.step');
await mkdir('public/assets', { recursive: true });
const sourceHash = createHash('sha256').update(source).digest('hex');
const emptyBounds = () => ({ min: [Infinity, Infinity, Infinity], max: [-Infinity, -Infinity, -Infinity] });
function expand(bounds, point) {
  for (let a = 0; a < 3; a++) { bounds.min[a] = Math.min(bounds.min[a], point[a]); bounds.max[a] = Math.max(bounds.max[a], point[a]); }
}
function boundsOf(mesh) {
  const bounds = emptyBounds(), positions = mesh.attributes.position.array;
  for (let i = 0; i < positions.length; i += 3) expand(bounds, positions.slice(i, i + 3));
  return bounds;
}
const centerOf = (b) => b.min.map((v, i) => (v + b.max[i]) / 2);
const sizeOf = (b) => b.min.map((v, i) => b.max[i] - v);
const kindOf = (name) => {
  if (/GE-26900|\bFuel\b/i.test(name)) return 'fuel';
  if (/Playing Field Carpet/i.test(name)) return 'carpet';
  if (/Gaffer|\bTape\b/i.test(name)) return 'markings';
  for (const [code, kind] of [['26300', 'hub'], ['26100', 'bump'], ['26200', 'trench'], ['26500', 'tower'], ['26600', 'depot'], ['26000', 'outpost']]) {
    if (name.includes(`GE-${code}`)) return kind;
  }
  if (/SCORING TABLE/i.test(name)) return 'arena';
  if (/Perimeter|Driver Station|Alliance Wall|Guardrail/i.test(name)) return 'perimeter';
  return null;
};

const memberships = new Map(), groups = new Map();
let groupSerial = 0;
function visit(node, parent = null, path = '') {
  const kind = kindOf(node.name);
  let group = parent;
  if (kind && (!parent || ['perimeter', 'arena'].includes(parent.kind) || ['fuel', 'carpet', 'markings'].includes(kind))) {
    group = { id: `${kind}-${groupSerial++}`, kind, sourceName: node.name, path: `${path}/${node.name}`, meshes: [] };
    groups.set(group.id, group);
  }
  for (const index of node.meshes) {
    const mesh = raw.meshes[index];
    const ownKind = kindOf(mesh.name);
    let assigned = group;
    if (!assigned || ownKind === 'fuel' || ownKind === 'carpet' || ownKind === 'markings') {
      if (!assigned || assigned.kind !== ownKind) {
        assigned = { id: `${ownKind ?? 'perimeter'}-${groupSerial++}`, kind: ownKind ?? 'perimeter', sourceName: mesh.name, path: `${path}/${node.name}/${mesh.name}`, meshes: [] };
        groups.set(assigned.id, assigned);
      }
    }
    assigned.meshes.push(index);
    memberships.set(index, assigned);
  }
  for (const child of node.children) visit(child, group, `${path}/${node.name}`);
}
visit(raw.root);
for (let i = 0; i < raw.meshes.length; i++) {
  if (!memberships.has(i)) throw new Error(`Unassigned mesh ${i}`);
}
// Each CAD trench assembly contains the two arms for an alliance. Expose each arm.
for (const group of [...groups.values()]) {
  if (group.kind !== 'trench') continue;
  groups.delete(group.id);
  for (const side of [-1, 1]) {
    const split = { ...group, id: `${group.id}-${side < 0 ? 'near' : 'far'}`,
      meshes: group.meshes.filter((i) => Math.sign(centerOf(boundsOf(raw.meshes[i]))[1]) === side) };
    groups.set(split.id, split);
  }
}
for (const kind of ['markings', 'carpet']) {
  const same = [...groups.values()].filter((group) => group.kind === kind);
  same.forEach((group) => groups.delete(group.id));
  groups.set(kind, { id: kind, kind, sourceName: kind, path: kind, meshes: same.flatMap((group) => group.meshes) });
}
const carpet = [...groups.values()].filter((g) => g.kind === 'carpet');
if (!carpet.length) throw new Error('Carpet mesh not found: cannot establish field frame.');
const carpetBounds = emptyBounds();
for (const g of carpet) for (const index of g.meshes) {
  const b = boundsOf(raw.meshes[index]); expand(carpetBounds, b.min); expand(carpetBounds, b.max);
}
const origin = centerOf(carpetBounds); origin[2] = carpetBounds.max[2];
const transform = ([x, y, z]) => [x - origin[0], z - origin[2], -(y - origin[1])];
const transformNormal = ([x, y, z]) => [x, z, -y];
const round = (n) => Math.round(n * 1e6) / 1e6;
const hardware = /screw|bolt|washer|rivet|\bnut\b|locknut|zip tie|cable tie|cotter|set screw|pop rivet/i;
const doc = new Document(), buffer = doc.createBuffer(), scene = doc.createScene('REBUILT 2026');
const opaque = doc.createMaterial('Field surfaces').setBaseColorFactor([1, 1, 1, 1]).setMetallicFactor(0.12).setRoughnessFactor(0.72).setDoubleSided(true);
const transparent = doc.createMaterial('Transparent panels').setBaseColorFactor([0.6, 0.75, 0.85, 0.19]).setMetallicFactor(0).setRoughnessFactor(0.3).setAlphaMode('BLEND').setDoubleSided(true);
const fuel = [], elements = [], collisions = { boxes: [], meshes: [] };
let triangles = 0, excluded = 0;
await Promise.all([MeshoptEncoder.ready, MeshoptSimplifier.ready]);

for (const group of groups.values()) {
  if (!group.meshes.length) continue;
  if (group.kind === 'fuel') {
    for (const index of group.meshes) {
      const position = transform(centerOf(boundsOf(raw.meshes[index]))).map(round);
      if (position[1] < 0.11) position[1] = 0.0755;
      fuel.push(position);
    }
    continue;
  }
  const bounds = emptyBounds(), batches = new Map();
  const collisionVertices = [], collisionIndices = [];
  for (const index of group.meshes) {
    const mesh = raw.meshes[index], b = boundsOf(mesh), size = sizeOf(b);
    if (hardware.test(mesh.name) || /vinyl/i.test(mesh.name) || Math.max(...size) < 0.018) { excluded++; continue; }
    const windowPanel = ['perimeter', 'outpost'].includes(group.kind)
      && Math.min(size[0], size[1]) < 0.02 && Math.max(size[0], size[1]) > 0.5
      && ((b.min[2] > 0.85 && size[2] > 0.6) || (b.max[2] < 0.65 && size[2] > 0.35));
    const glass = windowPanel || (/polycarb|clear plastic|plastic sheet|DS-.*Plastic/i.test(mesh.name) && group.kind !== 'bump');
    const isNet = /GE-26318|Net \(Aesthetic\)/i.test(mesh.name);
    const batchKey = glass ? 'glass' : isNet ? 'net' : 'opaque';
    if (!batches.has(batchKey)) batches.set(batchKey, { positions: [], normals: [], colors: [], indices: [] });
    const batch = batches.get(batchKey);
    const positions = mesh.attributes.position.array, normals = mesh.attributes.normal?.array;
    const faceColors = new Map();
    for (const face of mesh.brep_faces) if (face.color) {
      for (let triangle = face.first; triangle <= face.last; triangle++) faceColors.set(triangle, face.color);
    }
    const vertexMap = new Map();
    const collides = !['carpet', 'markings', 'arena'].includes(group.kind) && !/vinyl/i.test(mesh.name);
    if (collides) {
      // Treat individual beams/panels as convex contact solids, omitting bolt holes
      // and extrusion slots. Preserve concave fuel passages and trench risers.
      // The thin net-base frame has an open center. Its convex hull creates
      // an invisible horizontal shelf that traps missed fuel above the carpet.
      const netBase = group.kind === 'hub' && size[2] < .04 && size[0] > .6 && size[1] > 1.3
        && b.min[2] - origin[2] > 1.6 && b.max[2] - origin[2] < 1.7;
      const preserveConcavity = netBase || /Hub Base|Hub Net \(Aesthetic\)|Funnel|Chute|Trench.*Riser.*Body/i.test(mesh.name);
      const worldPositions = [];
      for (let p = 0; p < positions.length; p += 3) worldPositions.push(...transform(positions.slice(p, p + 3)).map(round));
      let contactPositions = worldPositions, contactIndices = mesh.index.array;
      if (!preserveConcavity && Math.min(...size) > 0.00001) {
        const points = [], used = new Set();
        for (let p = 0; p < worldPositions.length; p += 3) {
          const point = worldPositions.slice(p, p + 3), key = point.join(',');
          if (!used.has(key)) { used.add(key); points.push(new Vector3(...point)); }
        }
        const hull = new ConvexGeometry(points);
        const values = hull.getAttribute('position')?.array;
        if (values?.length) { contactPositions = Array.from(values, round); contactIndices = Array.from({ length: values.length / 3 }, (_, i) => i); }
        hull.dispose();
      }
      const base = collisionVertices.length / 3;
      for (const value of contactPositions) collisionVertices.push(value);
      for (const vertex of contactIndices) collisionIndices.push(base + vertex);
    }
    for (let t = 0; t < mesh.index.array.length; t += 3) {
      let color = faceColors.get(t / 3) ?? mesh.color ?? [0.55, 0.58, 0.62];
      if (color[0] > 0.8 && color[1] < 0.05 && color[2] < 0.05) color = new Color('#c53443').toArray();
      if (color[2] > 0.8 && color[0] < 0.05 && color[1] < 0.05) color = new Color('#2e65ce').toArray();
      if (/Hub (Side|Front|Rear) Panel|Tower (Upper|Lower) Plastic/i.test(mesh.name)) color = [0.025, 0.03, 0.04];
      const keyColor = color.map((v) => Math.round(v * 255)).join(',');
      for (let corner = 0; corner < 3; corner++) {
        const original = mesh.index.array[t + corner];
        const key = `${original}/${keyColor}`;
        let vertex = vertexMap.get(key);
        if (vertex === undefined) {
          vertex = batch.positions.length / 3; vertexMap.set(key, vertex);
          const p = transform(positions.slice(original * 3, original * 3 + 3)); expand(bounds, p);
          batch.positions.push(...p);
          batch.normals.push(...(normals ? transformNormal(normals.slice(original * 3, original * 3 + 3)) : [0, 1, 0]));
          // OpenCascade's Quantity_Color values are already linear RGB.
          batch.colors.push(...color.map((v) => Math.round(v * 255)), 255);
        }
        batch.indices.push(vertex);
      }
    }
  }
  if (!Number.isFinite(bounds.min[0])) continue;
  const center = centerOf(bounds).map(round);
  let alliance = /RED/i.test(group.path) ? 'red' : /BLUE/i.test(group.path) ? 'blue' : undefined;
  if (!alliance && ['hub', 'tower', 'outpost', 'depot', 'bump', 'trench'].includes(group.kind)) alliance = center[0] < 0 ? 'red' : 'blue';
  const names = { hub: 'hub', tower: 'tower', outpost: 'outpost', depot: 'depot', bump: 'bump', trench: 'trench', carpet: 'Carpet', markings: 'Field markings', perimeter: 'Field perimeter', arena: 'Scoring table' };
  const name = alliance ? `${alliance === 'red' ? 'Red' : 'Blue'} ${names[group.kind]}` : names[group.kind];
  elements.push({ id: group.id, kind: group.kind, alliance, name, bounds: { min: bounds.min.map(round), max: bounds.max.map(round) }, center });
  for (const [style, batch] of batches) {
    if (!batch.indices.length) continue;
    const accessor = (type, array, normalized = false) => doc.createAccessor().setType(type).setArray(array).setBuffer(buffer).setNormalized(normalized);
    const primitive = doc.createPrimitive()
      .setAttribute('POSITION', accessor('VEC3', new Float32Array(batch.positions)))
      .setAttribute('NORMAL', accessor('VEC3', new Float32Array(batch.normals)))
      .setAttribute('COLOR_0', accessor('VEC4', new Uint8Array(batch.colors), true))
      .setIndices(accessor('SCALAR', new Uint32Array(batch.indices))).setMaterial(style === 'glass' ? transparent : opaque);
    const mesh = doc.createMesh(`${group.id}-${style}`).addPrimitive(primitive);
    const node = doc.createNode(`${group.id}-${style}`).setMesh(mesh).setExtras({ elementId: group.id, kind: group.kind, transparent: style === 'glass', net: style === 'net' });
    scene.addChild(node);
    triangles += batch.indices.length / 3;
  }
  if (collisionIndices.length) {
    const positions = new Float32Array(collisionVertices);
    const remap = MeshoptSimplifier.generatePositionRemap(positions, 3);
    const welded = new Uint32Array(collisionIndices.map((index) => remap[index]));
    const [reduced] = MeshoptSimplifier.simplify(welded, positions, 3,
      Math.floor(welded.length * 0.2 / 3) * 3, 0.001, ['ErrorAbsolute']);
    const compactPositions = [], compactIndices = [], lookup = new Map();
    for (const index of reduced) {
      if (!lookup.has(index)) { lookup.set(index, compactPositions.length / 3); compactPositions.push(...collisionVertices.slice(index * 3, index * 3 + 3)); }
      compactIndices.push(lookup.get(index));
    }
    collisions.meshes.push({ element: group.id, vertices: compactPositions, indices: compactIndices });
  }
}

// The CAD carpet's top establishes y=0. One solid floor avoids seams in collision queries.
const sourceSize = sizeOf(carpetBounds);
collisions.boxes.push({ element: 'floor', center: [0, -0.05, 0], halfExtents: [sourceSize[0] / 2, 0.05, sourceSize[1] / 2] });
// The source CAD includes 456 fuel, leaving 48 robot preloads unmodeled. With no
// robots yet, the unused preloads belong in the neutral zone (manual 6.3.4).
if (fuel.length === 456) {
  for (let row = 0; row < 12; row++) for (const z of [-2.54, -2.3876, 2.3876, 2.54]) {
    fuel.push([round(-0.8382 + row * 0.1524), 0.0755, z]);
  }
}
if (fuel.length !== 504) throw new Error(`Expected 504 fuel balls, found ${fuel.length}.`);
const counts = new Map();
const nameCounts = new Map();
elements.forEach((element) => nameCounts.set(element.name, (nameCounts.get(element.name) ?? 0) + 1));
for (const element of elements) {
  if (nameCounts.get(element.name) > 1) { const count = (counts.get(element.name) ?? 0) + 1; counts.set(element.name, count); element.name += ` ${count}`; }
}
await doc.transform(weld(), simplify({ simplifier: MeshoptSimplifier, ratio: 0.4, error: 0.0005 }), prune(), meshopt({ encoder: MeshoptEncoder, level: 'high' }));
triangles = doc.getRoot().listMeshes().reduce((sum, m) => sum + m.listPrimitives().reduce((n, p) => n + p.getIndices().getCount() / 3, 0), 0);
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder });
const glb = await io.writeBinary(doc);
await writeFile('public/assets/rebuilt-field.glb', glb);
await writeFile('public/assets/field-collisions.json', JSON.stringify(collisions));
const manifest = {
  source: 'https://firstfrc.blob.core.windows.net/frc2026/FieldAssets/FE-2026-rev-rebuilt-playing-field.step',
  sourceSha256: sourceHash, model: '/assets/rebuilt-field.glb', collisions: '/assets/field-collisions.json', triangles, bytes: glb.length,
  field: { length: 16.54048, width: 8.06958, bounds: { min: [-8.27024, 0, -4.03479], max: [8.27024, 2.5, 4.03479] } },
  elements, fuel,
};
await writeFile('public/assets/field-manifest.json', JSON.stringify(manifest, null, 2));
console.log(JSON.stringify({ bytes: glb.length, triangles, elementCount: elements.length, colliders: collisions.meshes.length + collisions.boxes.length, collisionTriangles: collisions.meshes.reduce((n, mesh) => n + mesh.indices.length / 3, 0), fuel: fuel.length, excluded, origin, elements: elements.filter((e) => e.kind !== 'markings' && e.kind !== 'carpet').map(({name, kind}) => ({name, kind})) }, null, 2));
