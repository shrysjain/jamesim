/** Offline CAD adaptation. Inputs are pinned and attributed in docs/KEPLER.md.
 * Preserve source geometry/materials; build our own mechanism hierarchy in SI robot coordinates. */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { Document, NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { weld, prune, meshopt } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptDecoder } from 'meshoptimizer';
import { Matrix4, Matrix3, Vector3, BoxGeometry, CylinderGeometry } from 'three';
await Promise.all([MeshoptEncoder.ready, MeshoptDecoder.ready]);
const sources = JSON.parse(await readFile('assets/kepler-cad-sources.json', 'utf8'));
if (process.argv.includes('--download')) {
 await mkdir('assets/source/robots/1690-kepler', { recursive: true });
 for (const source of sources.files) {
  const response = await fetch(source.url); if (!response.ok) throw new Error(`CAD download: ${response.status}`);
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (createHash('sha256').update(bytes).digest('hex') !== source.sha256) throw new Error(`CAD integrity: ${source.part}`);
  await writeFile(`assets/source/robots/1690-kepler/${source.part}.glb`, bytes);
 }
}
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder });
const doc = new Document(), buffer = doc.createBuffer(), scene = doc.createScene('1690 Kepler');
const offset = .223, yawCorrection = 23.99 * Math.PI / 180;
const frame = new Matrix4().makeRotationY(Math.PI); frame.setPosition(0, -offset, 0);
const turretPosition = [.134, -offset, .1872], axle = [.070, .464, 0];
const groups = new Map(), hashes = {}, bounds = {};
const group = (name, translation = [0, 0, 0], parent) => {
 const node = doc.createNode(name).setTranslation(translation).setExtras({ mechanism: name });
 (parent ? groups.get(parent) : scene).addChild(node); groups.set(name, node); return node;
};
group('chassis'); group('intake'); group('turret', turretPosition); group('turret-hood', axle, 'turret');
group('passive-kicker', [-.2723, .1703 - offset, 0]);
const attribute = (type, array) => doc.createAccessor().setType(type).setArray(array).setBuffer(buffer);
const materials = new Map();
function material(key, rgba, metallic = .25, roughness = .7) {
 if (!materials.has(key)) {
  const m = doc.createMaterial(key).setBaseColorFactor(rgba).setMetallicFactor(metallic).setRoughnessFactor(roughness).setDoubleSided(true);
  if (rgba[3] < 1) m.setAlphaMode('BLEND'); materials.set(key, m);
 }
 return materials.get(key);
}
function primitive(parent, name, positions, normals, indices, mat) {
 const p = doc.createPrimitive().setAttribute('POSITION', attribute('VEC3', new Float32Array(positions))).setAttribute('NORMAL', attribute('VEC3', new Float32Array(normals)))
  .setIndices(attribute('SCALAR', new Uint32Array(indices))).setMaterial(mat);
 groups.get(parent).addChild(doc.createNode(name).setMesh(doc.createMesh(name).addPrimitive(p)));
}
async function cad(part, parent, transform) {
 const bytes = await readFile(`assets/source/robots/1690-kepler/${part}.glb`); hashes[part] = createHash('sha256').update(bytes).digest('hex');
 if (hashes[part] !== sources.files.find(s => s.part === part)?.sha256) throw new Error(`CAD source changed: ${part}`);
 const source = await io.readBinary(bytes), min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
 for (const node of source.getRoot().listNodes()) {
  if (!node.getMesh()) continue;
  const matrix = transform.clone().multiply(new Matrix4().fromArray(node.getWorldMatrix())), normalMatrix = new Matrix3().getNormalMatrix(matrix);
  for (const p of node.getMesh().listPrimitives()) {
   const a = p.getAttribute('POSITION'), n = p.getAttribute('NORMAL'), idx = p.getIndices(), positions = [], normals = [];
   for (let i = 0; i < a.getCount(); i++) {
    const v = new Vector3(...a.getElement(i, [])).applyMatrix4(matrix); positions.push(...v.toArray());
    for (let k = 0; k < 3; k++) { min[k] = Math.min(min[k], v.getComponent(k)); max[k] = Math.max(max[k], v.getComponent(k)); }
    normals.push(...new Vector3(...n.getElement(i, [])).applyMatrix3(normalMatrix).normalize().toArray());
   }
   const m = p.getMaterial(), rgba = m?.getBaseColorFactor() ?? [.6, .6, .6, 1];
   const glass = part === 'panels' || part === 'top' || m?.getAlphaMode() === 'BLEND';
   if (glass) rgba[3] = .24;
   primitive(parent, `${part}/${node.getName()}`, positions, normals, idx ? Array.from(idx.getArray()) : Array.from({ length: a.getCount() }, (_, i) => i),
    material(JSON.stringify([rgba, glass]), rgba, glass ? 0 : m?.getMetallicFactor() ?? .25, glass ? .2 : .7));
  }
 }
 bounds[part] = { min, max };
}
await cad('body', 'chassis', frame);
await cad('panels', 'chassis', frame); await cad('top', 'chassis', frame);
// Carriage inputs are CLOSED. Bake OPEN as the zero pose; simulation retracts along the same measured rail vector.
await cad('carriage', 'intake', frame.clone().multiply(new Matrix4().makeTranslation(.312, -.0691, 0)));
// The turret is authored at -23.99 degrees. Neutral here shoots +X; the chassis intake faces -X.
const turretFrame = new Matrix4().makeRotationY(yawCorrection);
await cad('turret', 'turret', turretFrame); await cad('hood', 'turret-hood', turretFrame);
await cad('pinions', 'turret-hood', turretFrame.clone().multiply(new Matrix4().makeTranslation(-.2552 + .0701, .4235 - .464, -.2412 + .1587)));
await cad('kick', 'passive-kicker', new Matrix4().makeRotationY(Math.PI));
const rubber = material('roller rubber', [.024, .028, .03, 1], 0, .95), metal = material('aluminum', [.55, .57, .61, 1], .7, .4);
function shape(parent, name, geometry, transform, mat) {
 const a = geometry.getAttribute('position'), n = geometry.getAttribute('normal'), p = [], normals = [], normalMatrix = new Matrix3().getNormalMatrix(transform);
 for (let i = 0; i < a.count; i++) { p.push(...new Vector3().fromBufferAttribute(a, i).applyMatrix4(transform).toArray()); normals.push(...new Vector3().fromBufferAttribute(n, i).applyMatrix3(normalMatrix).normalize().toArray()); }
 primitive(parent, name, p, normals, Array.from(geometry.index.array), mat); geometry.dispose();
}
function roller(parent, name, position, radius, width, mat = rubber, axis = 'z') {
 group(name, position, parent).setExtras({ mechanism: name, spinAxis: axis });
 const basis = axis === 'x' ? new Matrix4().makeRotationZ(Math.PI / 2) : axis === 'y' ? new Matrix4() : new Matrix4().makeRotationX(Math.PI / 2);
 shape(name, name, new CylinderGeometry(radius, radius, width, 20), basis, mat);
 // Small aluminum strip makes rotation visible.
 shape(name, `${name}-stripe`, new BoxGeometry(.006, .003, width), basis.clone().multiply(new Matrix4().makeRotationX(-Math.PI / 2)).setPosition(axis === 'y' ? radius : 0, axis === 'y' ? 0 : radius, 0), metal);
}
// Roller/tread solids omitted by the CAD tessellation are restored from measured axle dimensions.
for (const [i, [x, y]] of [[.2473, .2301], [.1993, .329]].entries()) roller('intake', `intake-roller-${i}`, [-x - .312, y - .0691 - offset, 0], .021, .647);
const floorAxles = [[.281,.1817],[.2335,.1749],[.186,.1681],[.1422,.1618],[.0984,.1556],[.0546,.1493],[.0071,.1425],[-.0409,.1425],[-.0874,.1425]];
const z0 = [-.322,-.322,-.322,-.322,-.322,-.322,-.132,-.132,-.132], z1 = [.31,.298,.298,.298,.298,.298,.298,.276,.276];
for (const [i, [x, y]] of floorAxles.entries()) roller('chassis', `feeder-roller-${i}`, [-x, y - offset, -(z0[i]+z1[i])/2], .0165, z1[i]-z0[i]);
for (const [i, [x, y]] of [[-.0409,.3191],[-.0874,.3183]].entries()) roller('chassis', `feeder-roller-top-${i}`, [-x, y-offset, -(.291-.066)/2], .016, .357);
// Cross-feed belts and the compliant feed wheels, deliberately separate from chassis solids.
for (const [name,y,zmin,zmax] of [['bottom',.1586,-.1158,.2742],['top',.3022,-.0423,.2977]]) {
 shape('chassis', `cross-feed-belt-${name}`, new BoxGeometry(.030, .006, zmax-zmin), new Matrix4().makeTranslation(.134,y-offset,-(zmin+zmax)/2), rubber);
}
roller('chassis', 'feeder-roller-vertical', [.0155, (.088+.367)/2-offset, .1525], .0125, .367-.088, metal, 'y');
const green = material('compliant tread', [.12,.46,.05,1],0,.9);
for (const [i,[z,y,r]] of [[-.1806,.160,.0286],[-.2358,.2031,.0286],[-.2721,.2629,.0286],[-.2837,.3319,.0254],[-.0909,.3319,.0254]].entries())
 roller('chassis', `feeder-roller-cross-${i}`, [.134,y-offset,-z], r, .05, green, 'x');
roller('turret', 'shooter-drum', axle, .0502, .05);
const hoodAngle = 172.47 * Math.PI / 180;
for (const [i, angle] of [hoodAngle, hoodAngle + 18.82 * Math.PI / 180].entries()) roller('turret-hood', `hood-roller-${i}`, [.2068 * Math.cos(angle), .2068 * Math.sin(angle), 0], .0254, .05);
// Bumpers are excluded from the source mesh pack. Reconstruct their measured frame envelope.
for (const sign of [-1, 1]) {
 shape('chassis', 'bumper-end', new BoxGeometry(.0762, .1143, .889), new Matrix4().makeTranslation(sign * .3556, -.12616, 0), material('bumper', [.025,.13,.52,1],0,.95));
 shape('chassis', 'bumper-side', new BoxGeometry(.635, .1143, .0762), new Matrix4().makeTranslation(0, -.12616, sign * .4064), materials.get('bumper'));
}
for (const [x, z, name] of [[.2505,-.3013,'front-left'],[.2505,.3013,'front-right'],[-.2505,-.3013,'rear-left'],[-.2505,.3013,'rear-right']]) {
 for (const suffix of ['fork', 'wheel']) {
  const id = `module-${name}-${suffix}`; group(id, [x, .0508 - offset, z]);
  // Export has its axle along X. Normalize to the simulation's wheel axle +Z.
  await cad(suffix, id, new Matrix4().makeRotationY(Math.PI / 2));
 }
}
await doc.transform(weld(), prune(), meshopt({ encoder: MeshoptEncoder, level: 'high' }));
await mkdir('public/assets/robots/1690-kepler', { recursive: true });
const bytes = await io.writeBinary(doc); await writeFile('public/assets/robots/1690-kepler/robot.glb', bytes);
await writeFile('public/assets/robots/1690-kepler/asset-report.json', JSON.stringify({ hashes, bounds, bytes: bytes.length }, null, 2));
console.log(`Prepared Kepler CAD: ${bytes.length} bytes`);
