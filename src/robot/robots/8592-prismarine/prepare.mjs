/** Reproducible offline Onshape GLB adaptation. Run from repository root. */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { Document, NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { prune, meshopt } from '@gltf-transform/functions';
import {
  MeshoptEncoder,
  MeshoptDecoder,
  MeshoptSimplifier,
} from 'meshoptimizer';
import { Matrix4, Matrix3, Vector3, Box3 } from 'three';
import { photoAppearance } from './appearance.mjs';
import { replacePrismarineBumpers } from './bumpers.mjs';
await Promise.all([
  MeshoptEncoder.ready,
  MeshoptDecoder.ready,
  MeshoptSimplifier.ready,
]);
const id = '8592-prismarine',
  input = process.argv[2] ?? `assets/source/robots/${id}/production-main.glb`;
const bytes = await readFile(input),
  hash = createHash('sha256').update(bytes).digest('hex');
const sources = JSON.parse(
  await readFile(`assets/robots/${id}/sources.json`, 'utf8'),
);
if (hash !== sources.input.sha256) throw new Error('CAD input hash mismatch');
const jsonLength = bytes.readUInt32LE(12),
  gltf = JSON.parse(bytes.subarray(20, 20 + jsonLength).toString());
const binary = bytes.subarray(28 + jsonLength),
  doc = new Document(),
  buffer = doc.createBuffer(),
  scene = doc.createScene('8592 Prismarine');
const appearance = photoAppearance(doc);
const groups = new Map(),
  batches = new Map(),
  removed = [],
  corrected = [];
function group(name, pivot = [0, 0, 0], parent) {
  const n = doc
    .createNode(name)
    .setTranslation(pivot)
    .setExtras({ mechanism: name });
  (parent ? groups.get(parent) : scene).addChild(n);
  groups.set(name, n);
  return n;
}
group('chassis');
group('intake');
group('feeder-rotor', [0, -0.0666, 0]);
group('turret', [0, 0.2997, 0]);
group('turret-hood', [0, 0, 0], 'turret');
const moduleData = [
  [1149, 0.30243474, -0.24580202, 'rear-right', Math.PI / 4],
  [1214, -0.30081525, -0.24580202, 'rear-left', (3 * Math.PI) / 4],
  [1279, -0.30081525, 0.25584799, 'front-left', (-3 * Math.PI) / 4],
  [1410, 0.30243474, 0.25584799, 'front-right', -Math.PI / 4],
];
for (const [, x, y, name] of moduleData)
  for (const suffix of ['fork', 'wheel'])
    group(`module-${name}-${suffix}`, [y - 0.005, 0.0508 - 0.223, x - 0.00081]);
// CAD uses Z-up and intake toward -Y. Right-handed mapping: (Y,Z,X).
const frame = new Matrix4().set(
  0,
  1,
  0,
  -0.005,
  0,
  0,
  1,
  -0.223,
  1,
  0,
  0,
  -0.00081,
  0,
  0,
  0,
  1,
);
// The upper rollers exit along CAD +X; correct the old backwards neutral heading by 180 degrees.
const turretCorrection = new Matrix4().makeRotationY(
  Math.PI / 2 - Math.asin(0.053823348),
);
function readAccessor(i) {
  const a = gltf.accessors[i],
    v = gltf.bufferViews[a.bufferView],
    n = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 }[a.type],
    types = {
      5126: Float32Array,
      5125: Uint32Array,
      5123: Uint16Array,
      5121: Uint8Array,
    },
    T = types[a.componentType];
  if (v.byteStride && v.byteStride !== n * T.BYTES_PER_ELEMENT)
    throw Error('Interleaved source');
  const offset = binary.byteOffset + (v.byteOffset ?? 0) + (a.byteOffset ?? 0);
  return new T(binary.buffer, offset, a.count * n);
}
const cache = new Map();
function boundsInfo(result) {
  return result.reduce((s, r) => s + r.i.length / 3, 0);
}
function sourceMesh(i) {
  if (cache.has(i)) return cache.get(i);
  const mats = new Map();
  for (const p of gltf.meshes[i].primitives) {
    const a = readAccessor(p.attributes.POSITION),
      idx = readAccessor(p.indices),
      key = p.material ?? 0;
    if (!mats.has(key)) mats.set(key, { p: [], n: [], i: [] });
    const b = mats.get(key),
      base = b.p.length / 3;
    b.p.push(...a);
    b.n.push(...readAccessor(p.attributes.NORMAL));
    for (const k of idx) b.i.push(k + base);
  }
  const result = [];
  for (const [mat, b] of mats) {
    const p = new Float32Array(b.p.map((v) => Math.round(v * 100000) / 100000)),
      remap = MeshoptSimplifier.generatePositionRemap(p, 3),
      indices = new Uint32Array(b.i.map((i) => remap[i]));
    let [reduced] = MeshoptSimplifier.simplify(
      indices,
      p,
      3,
      Math.min(
        indices.length,
        Math.max(24, Math.floor((indices.length * 0.04) / 3) * 3),
      ),
      0.003,
      ['ErrorAbsolute', 'Permissive'],
    );
    if (!reduced.length) continue;
    const [map, count] = MeshoptSimplifier.compactMesh(reduced),
      positions = new Float32Array(count * 3);
    for (let k = 0; k < map.length; k++)
      if (map[k] !== 0xffffffff)
        positions.set(p.subarray(k * 3, k * 3 + 3), map[k] * 3);
    const normals = new Float32Array(count * 3);
    for (let k = 0; k < map.length; k++)
      if (map[k] !== 0xffffffff)
        normals.set(b.n.slice(k * 3, k * 3 + 3), map[k] * 3);
    result.push({ mat, p: positions, n: normals, i: reduced });
  }
  if (process.env.INSPECT) console.log('mesh', i, boundsInfo(result));
  cache.set(i, result);
  return result;
}
function walk(i, m = new Matrix4(), path = []) {
  const n = gltf.nodes[i];
  path = [...path, i];
  m = m
    .clone()
    .multiply(n.matrix ? new Matrix4().fromArray(n.matrix) : new Matrix4());
  if (n.mesh !== undefined) {
    const name = n.name ?? '';
    if (/FRC Game Piece|CameraFOV|Shooter Ball Path|Origin Cat/.test(name)) {
      removed.push({ i, name });
      return;
    }
    // Retain recognizable panels, mechanisms and electronics; discard tiny fasteners/internal bearings.
    if (
      /Screw|SHCS|FHCS|BHCS|Locknut|Washer|Rivet|Bearing|Bushing|Shim|E Clip|Spacer|Standoff|Studs|Wing Nut/i.test(
        name,
      )
    ) {
      removed.push({ i, name, reason: 'small hardware' });
      return;
    }
    let correctedM = m.clone();
    // Detached feeder shaft/pulleys share a 520.7 mm height offset; small bearings/spacers are omitted.
    if ([204, 224, 291].includes(i)) {
      correctedM.premultiply(new Matrix4().makeTranslation(0, 0, -0.5207));
      corrected.push({ i, name, shift: [0, 0, -0.5207] });
    }
    // Detached camera mounts are placed opposite the seated pair around the chassis center.
    if ([24, 42].includes(i)) {
      const src = i === 24 ? 38 : 30,
        ref = gltf.nodes[src - 1];
      correctedM = new Matrix4()
        .makeTranslation(0.00081, 0.005, 0)
        .multiply(new Matrix4().makeRotationZ(Math.PI))
        .multiply(new Matrix4().makeTranslation(-0.00081, -0.005, 0))
        .multiply(new Matrix4().fromArray(ref.matrix));
      corrected.push({ i, name, reference: src });
    }
    if (i === 19) {
      correctedM.setPosition(0.17, 0.12, 0.54);
      corrected.push({ i, name, position: [0.17, 0.12, 0.54] });
    }
    if (i === 40) {
      correctedM.setPosition(0.17, 0.12, 0.51);
      corrected.push({ i, name, position: [0.17, 0.12, 0.51] });
    }
    let target = 'chassis',
      matrix = frame.clone().multiply(correctedM);
    if (path.includes(43) && !path.includes(121) && !path.includes(46)) {
      target = 'turret';
      matrix
        .premultiply(new Matrix4().makeTranslation(0, -0.2997, 0))
        .premultiply(turretCorrection);
    }
    if (path.includes(350)) target = 'turret-hood';
    if (path.includes(46)) {
      target = 'turret';
      matrix
        .premultiply(new Matrix4().makeTranslation(0, -0.2997, 0))
        .premultiply(turretCorrection);
    }
    // Intake moving rack/roller carriage. Fixed actuation mounts and pinions stay on chassis.
    if (
      path.includes(747) &&
      !/MountingPlate|MotorPlate|ActuationPulley|Pinion|BeltCover|MAXPlanetary|NEO Vortex|IN4-09|IN4-04|IN4-05|IN4-07/.test(
        name,
      )
    )
      target = 'intake';
    if (path.includes(610)) {
      target = 'feeder-rotor';
      matrix.premultiply(new Matrix4().makeTranslation(0, 0.0666, 0));
    }
    const module = moduleData.find(([root]) => path.includes(root));
    if (module) {
      const [, x, y, label, yaw] = module;
      target = `module-${label}-${/Tread|Wheel, SDS|Wheel Spacer/.test(name) ? 'wheel' : 'fork'}`;
      // Exported modules have four different steering angles. Normalize every fork and
      // tread together around the measured wheel center, with the neutral axle +Z.
      matrix
        .premultiply(
          new Matrix4().makeTranslation(
            -(y - 0.005),
            -(0.094106995 - 0.0476815 - 0.223),
            -(x - 0.00081),
          ),
        )
        .premultiply(new Matrix4().makeRotationY(yaw));
    }
    if (/PolycarbTube|IN4-XX-LiveRoller|Herringbone roller/i.test(name)) {
      const box = new Box3();
      for (const mesh of sourceMesh(n.mesh))
        box.union(new Box3().setFromArray(mesh.p).applyMatrix4(matrix));
      const pivot = box.getCenter(new Vector3()).toArray(),
        parent = target;
      target = `${path.includes(747) ? 'intake' : path.includes(350) ? 'shooter' : 'feeder'}-roller-${i}`;
      group(target, pivot, parent).setExtras({
        mechanism: target,
        spinAxis: target.startsWith('feeder-') ? 'x' : 'z',
      });
      matrix.premultiply(
        new Matrix4().makeTranslation(...pivot.map((v) => -v)),
      );
    }
    for (const mesh of sourceMesh(n.mesh)) {
      let matName = appearance.role(name, mesh.mat, path);
      if (/^\d+$/.test(matName)) {
        const rgba = gltf.materials[mesh.mat]?.pbrMetallicRoughness
          ?.baseColorFactor ?? [0.7, 0.7, 0.7, 1];
        matName = String(
          gltf.materials.findIndex((m) =>
            (
              m.pbrMetallicRoughness?.baseColorFactor ?? [0.7, 0.7, 0.7, 1]
            ).every((v, k) => Math.round(v * 5) === Math.round(rgba[k] * 5)),
          ),
        );
      }
      const key = target + '/' + matName;
      if (!batches.has(key))
        batches.set(key, { target, matName, p: [], n: [], uv: [], i: [] });
      const b = batches.get(key),
        base = b.p.length / 3,
        nm = new Matrix3().getNormalMatrix(matrix),
        v = new Vector3();
      const sheet = new Box3().setFromArray(mesh.p).applyMatrix4(matrix),
        size = sheet.getSize(new Vector3()).toArray();
      const axes = [0, 1, 2].sort((a, b) => size[b] - size[a]).slice(0, 2);
      // Project onto the two broad faces; panel cutouts and original silhouettes are retained.
      if (axes.includes(1)) {
        axes.splice(axes.indexOf(1), 1);
        axes.push(1);
      }
      for (let k = 0; k < mesh.p.length; k += 3) {
        v.fromArray(mesh.p, k).applyMatrix4(matrix);
        b.p.push(v.x, v.y, v.z);
        if (appearance.textured(matName))
          for (const axis of axes)
            b.uv.push(
              (v.getComponent(axis) - sheet.min.getComponent(axis)) /
                Math.max(size[axis], 1e-6),
            );
        v.fromArray(mesh.n, k).applyMatrix3(nm).normalize();
        b.n.push(v.x, v.y, v.z);
      }
      for (const k of mesh.i) b.i.push(k + base);
    }
  }
  for (const c of n.children ?? []) walk(c, m, path);
}
walk(0);
const materials = new Map();
function material(key) {
  if (materials.has(key)) return materials.get(key);
  const photo = appearance.material(key);
  if (photo) {
    materials.set(key, photo);
    return photo;
  }
  const src = gltf.materials[Number(key)],
    rgba =
      key === 'bumper'
        ? [0.025, 0.13, 0.52, 1]
        : (src?.pbrMetallicRoughness?.baseColorFactor ?? [0.7, 0.7, 0.7, 1]);
  const mat = doc
    .createMaterial(key === 'bumper' ? 'bumper' : `cad-${key}`)
    .setBaseColorFactor(rgba)
    .setMetallicFactor(0.2)
    .setRoughnessFactor(0.65)
    .setDoubleSided(true);
  materials.set(key, mat);
  return mat;
}
const accessor = (type, array) =>
  doc.createAccessor().setType(type).setArray(array).setBuffer(buffer);
let triangles = 0;
const bounds = {};
for (const b of batches.values()) {
  const p = doc
    .createPrimitive()
    .setAttribute('POSITION', accessor('VEC3', new Float32Array(b.p)))
    .setAttribute('NORMAL', accessor('VEC3', new Float32Array(b.n)))
    .setIndices(accessor('SCALAR', new Uint32Array(b.i)))
    .setMaterial(material(b.matName));
  if (b.uv.length)
    p.setAttribute('TEXCOORD_0', accessor('VEC2', new Float32Array(b.uv)));
  groups
    .get(b.target)
    .addChild(
      doc
        .createNode(b.target + ' CAD')
        .setMesh(doc.createMesh().addPrimitive(p)),
    );
  triangles += b.i.length / 3;
  const box = new Box3().setFromArray(b.p);
  if (!bounds[b.target]) bounds[b.target] = new Box3();
  bounds[b.target].union(box);
}
replacePrismarineBumpers(doc);
const primitives = doc.getRoot().listMeshes().flatMap(mesh => mesh.listPrimitives());
triangles = primitives.reduce((sum, primitive) => sum + primitive.getIndices().getCount() / 3, 0);
await doc.transform(
  prune(),
  meshopt({ encoder: MeshoptEncoder, level: 'high' }),
);
const io = new NodeIO()
    .registerExtensions(ALL_EXTENSIONS)
    .registerDependencies({
      'meshopt.encoder': MeshoptEncoder,
      'meshopt.decoder': MeshoptDecoder,
    }),
  output = await io.writeBinary(doc);
await mkdir(`public/assets/robots/${id}`, { recursive: true });
await writeFile(`public/assets/robots/${id}/robot.glb`, output);
const record = {
  schemaVersion: 1,
  robotId: id,
  group: {
    name: 'Team 8592 Prismarine CAD',
    source:
      'User-supplied ProductionMain (1).glb; input hash/provenance in assets/robots/8592-prismarine/sources.json',
    redistribution: { status: 'pending', evidence: [] },
    files: [
      {
        path: `public/assets/robots/${id}/robot.glb`,
        bytes: output.length,
        sha256: createHash('sha256').update(output).digest('hex'),
      },
    ],
  },
};
await writeFile(
  `assets/robots/${id}/runtime.json`,
  JSON.stringify(record, null, 2) + '\n',
);
await writeFile(
  `assets/source/robots/${id}/preparation-report.json`,
  JSON.stringify(
    {
      hash,
      bytes: output.length,
      triangles,
      primitives: primitives.length,
      removed,
      corrected,
      bounds: Object.fromEntries(
        Object.entries(bounds).map(([k, b]) => [
          k,
          { min: b.min.toArray(), max: b.max.toArray() },
        ]),
      ),
    },
    null,
    2,
  ),
);
console.log({
  bytes: output.length,
  triangles,
  primitives: primitives.length,
  removed: removed.length,
  corrected,
});
