/** Offline adaptation of the pinned team 26c CAD tessellation. Run from repo root:
 * node src/robot/robots/1678-limestone/prepare.mjs [--download]
 * Only geometry is reused; articulation, batching and Jamesim frames are authored here. */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { Document, NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { weld, prune, meshopt } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptDecoder } from 'meshoptimizer';
import { Matrix4, Matrix3, Vector3, BoxGeometry, CylinderGeometry } from 'three';
const id = '1678-limestone', input = `assets/source/robots/${id}`;
const sources = JSON.parse(await readFile(`assets/robots/${id}/sources.json`, 'utf8'));
await mkdir(input, { recursive: true });
if (process.argv.includes('--download')) for (const f of sources.files) {
  const response = await fetch(f.url); if (!response.ok) throw new Error(`CAD download ${f.part}: ${response.status}`);
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (hash(bytes) !== f.sha256) throw new Error(`CAD integrity ${f.part}`);
  await writeFile(`${input}/${f.part}.glb`, bytes);
}
function hash(b) { return createHash('sha256').update(b).digest('hex'); }
await Promise.all([MeshoptEncoder.ready, MeshoptDecoder.ready]);
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder });
const doc = new Document(), buffer = doc.createBuffer(), scene = doc.createScene('1678 Citrus Circuits · Limestone');
const groups = new Map(), batches = new Map(), materials = new Map(), report = { inputs: {}, solids: {}, assignments: {} };
const rollerShells = new Map();
const offset = .223, pivot = [.30465, .1689, 0], drum = [-.28815, .47685, 0];
const frame = new Matrix4().makeRotationY(Math.PI).setPosition(0, -offset, 0);
// CAD has a 132° folded intake. Bake the collecting pose; the runtime folds it back exactly once.
const down = new Matrix4().makeTranslation(...pivot).multiply(new Matrix4().makeRotationZ(-132 * Math.PI / 180)).multiply(new Matrix4().makeTranslation(-pivot[0], -pivot[1], 0));
function group(name, position = [0, 0, 0], parent) {
  const node = doc.createNode(name).setTranslation(position).setExtras({ mechanism: name });
  (parent ? groups.get(parent) : scene).addChild(node); groups.set(name, node); return node;
}
const runtime = p => new Vector3(...p).applyMatrix4(frame).toArray();
group('chassis'); group('intake', runtime(pivot)); group('hopper'); group('hood', runtime(drum)); group('climber');
function material(key, rgba, metallic = .35, roughness = .65) {
  if (!materials.has(key)) {
    const m = doc.createMaterial(key).setBaseColorFactor(rgba).setMetallicFactor(metallic).setRoughnessFactor(roughness).setDoubleSided(true);
    if (rgba[3] < 1) m.setAlphaMode('BLEND'); materials.set(key, m);
  }
  return materials.get(key);
}
function sourceMaterial(m) {
  const rgba = [...(m?.getBaseColorFactor() ?? [.6, .62, .65, 1])];
  const glass = m?.getName() === 'poly' || m?.getAlphaMode() === 'BLEND'; if (glass) rgba[3] = .20;
  return material(`CAD ${m?.getName()} ${rgba.join(',')}`, rgba, glass ? 0 : m?.getMetallicFactor() ?? .35, glass ? .25 : .65);
}
function append(parent, positions, normals, indices, mat) {
  const key = `${parent}/${mat.getName()}`;
  if (!batches.has(key)) batches.set(key, { parent, positions: [], normals: [], indices: [], mat });
  const b = batches.get(key), base = b.positions.length / 3;
  for (const v of positions) b.positions.push(v); for (const n of normals) b.normals.push(n); for (const i of indices) b.indices.push(i + base);
}
// Split disconnected solids by welded position. Exporter names combine unrelated assemblies.
function solids(p, world) {
  const a = p.getAttribute('POSITION'), n = p.getAttribute('NORMAL'), idx = Array.from(p.getIndices()?.getArray() ?? Array.from({ length: a.getCount() }, (_, i) => i));
  const pts = [], normals = [], parent = [], keys = new Map(), nm = new Matrix3().getNormalMatrix(world);
  const root = i => { while (parent[i] !== i) { parent[i] = parent[parent[i]]; i = parent[i]; } return i; };
  const join = (a, b) => { a = root(a); b = root(b); if (a !== b) parent[b] = a; };
  for (let i = 0; i < a.getCount(); i++) {
    const v = new Vector3(...a.getElement(i, [])).applyMatrix4(world).toArray(); pts.push(v);
    normals.push(new Vector3(...n.getElement(i, [])).applyMatrix3(nm).normalize().toArray()); parent.push(i);
    const key = v.map(v => Math.round(v * 1e5)).join(','); if (keys.has(key)) join(i, keys.get(key)); else keys.set(key, i);
  }
  for (let i = 0; i < idx.length; i += 3) { join(idx[i], idx[i + 1]); join(idx[i], idx[i + 2]); }
  const components = new Map();
  for (let i = 0; i < idx.length; i += 3) { const r = root(idx[i]); if (!components.has(r)) components.set(r, []); components.get(r).push(idx[i], idx[i + 1], idx[i + 2]); }
  return [...components.values()].map(indices => {
    const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
    for (const i of indices) for (let k = 0; k < 3; k++) { min[k] = Math.min(min[k], pts[i][k]); max[k] = Math.max(max[k], pts[i][k]); }
    return { indices, pts, normals, min, max, center: min.map((v, i) => (v + max[i]) / 2) };
  });
}
function put(s, parent, transform, mat) {
  const origin = new Vector3().fromArray(groups.get(parent).getWorldTranslation()), nm = new Matrix3().getNormalMatrix(transform);
  const unique = [...new Set(s.indices)], map = new Map(unique.map((v, i) => [v, i])), p = [], n = [];
  for (const i of unique) {
    p.push(...new Vector3(...s.pts[i]).applyMatrix4(transform).sub(origin).toArray());
    n.push(...new Vector3(...s.normals[i]).applyMatrix3(nm).normalize().toArray());
  }
  // The two thin bars and three hood rollers contain coincident long shells,
  // with different triangulations. Face deduplication alone cannot remove
  // their depth fighting. Rebuild only those cylindrical surfaces from their
  // measured envelope; keep the original short end hardware and axle frames.
  if (/^(intake-roller-[12]|hood-roller-[012])$/.test(parent) && s.max[2] - s.min[2] > .5) {
    const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
    for (let i = 0; i < p.length; i += 3) for (let k = 0; k < 3; k++) {
      lo[k] = Math.min(lo[k], p[i + k]); hi[k] = Math.max(hi[k], p[i + k]);
    }
    const diameter = Math.max(hi[0] - lo[0], hi[1] - lo[1]);
    if (diameter > (parent.startsWith('intake') ? .025 : .05)) throw new Error(`Unexpected roller envelope: ${parent}`);
    const shell = rollerShells.get(parent) ?? { lo: [...lo], hi: [...hi], mat, diameter, replacedSolids: 0 };
    for (let k = 0; k < 3; k++) { shell.lo[k] = Math.min(shell.lo[k], lo[k]); shell.hi[k] = Math.max(shell.hi[k], hi[k]); }
    if (diameter > shell.diameter) { shell.diameter = diameter; shell.mat = mat; }
    shell.replacedSolids++; rollerShells.set(parent, shell);
  } else append(parent, p, n, s.indices.map(i => map.get(i)), mat);
  report.assignments[parent] = (report.assignments[parent] ?? 0) + 1;
}
function axle(name, parent, position, transform = frame) {
  if (!groups.has(name)) {
    const world = new Vector3(...position).applyMatrix4(transform), origin = new Vector3(...groups.get(parent).getWorldTranslation());
    group(name, world.sub(origin).toArray(), parent);
  }
  return name;
}
const hoodRollers = [[-.0944, .4475], [-.0927, .4901], [-.1013, .5358]];
const floorRollers = [[.323,.215],[.262,.208],[.214,.202],[.159,.179],[.101,.160],[.042,.142],[-.015,.126],[-.075,.115],[-.147,.122],[-.201,.154],[-.247,.212],[-.266,.284],[-.266,.346],[-.266,.408],[-.090,.346],[-.090,.408],[-.082,.294]];
function nearbyRoller(s, points, radius = .028) {
  return points.findIndex(([x,y]) => Math.hypot(s.center[0]-x,s.center[1]-y) < .008 && s.max[0]-s.min[0] < radius*2.5 && s.max[1]-s.min[1] < radius*2.5);
}
for (const part of ['body', 'intake', 'slide', 'lift']) {
  const bytes = await readFile(`${input}/${part}.glb`); if (hash(bytes) !== sources.files.find(s => s.part === part).sha256) throw new Error(`CAD integrity ${part}`);
  report.inputs[part] = hash(bytes); const source = await io.readBinary(bytes); let count = 0;
  for (const node of source.getRoot().listNodes()) if (node.getMesh()) {
    const matrix = new Matrix4().fromArray(node.getWorldMatrix());
    // Intake export is relative to an arbitrary recipe origin, not its actual hinge.
    if (part === 'intake') matrix.premultiply(new Matrix4().makeTranslation(.254, .194, 0));
    for (const [pi, p] of node.getMesh().listPrimitives().entries()) for (const [ci, s] of solids(p, matrix).entries()) {
      count++; let parent = 'chassis', transform = frame;
      if (part === 'body') {
        const h = nearbyRoller(s, hoodRollers);
        if (h >= 0) parent = axle(`hood-roller-${h}`, 'hood', [...hoodRollers[h], 0]);
        else if (Math.hypot(s.center[0]-drum[0], s.center[1]-drum[1]) < .006 && s.max[0]-s.min[0] < .10 && s.max[1]-s.min[1] < .10 && s.max[2]-s.min[2] > .45) parent = axle('shooter-drum', 'chassis', drum);
        else if (node.getName() === '1678-26c-1110' && pi === 1 && [9,12,16].includes(ci)
          || s.min[1] > .48 && s.min[0] > -.16 && s.max[0] < -.05
          || s.min[1] > .53 && s.min[0] > -.09) parent = 'hood';
        else { const r = nearbyRoller(s, floorRollers); if (r >= 0) parent = axle(`feeder-roller-${r}`, 'chassis', [...floorRollers[r], 0]); }
      } else if (part === 'slide') {
        parent = 'hopper'; transform = frame.clone().multiply(new Matrix4().makeTranslation(.303211, 0, 0));
      } else if (part === 'lift') {
        // The two long inner tubes/hooks and their lid move. Outer towers, motor and gears stay on chassis.
        if (node.getName() === 'Part 58' || node.getName() === '1678-26c-1924' || node.getName() === '1678-26c-1922'
          || node.getName() === '1678-26c-1943' && pi === 0 && [0,1,11,17,19].includes(ci)) parent = 'climber';
      } else {
        // The little cube at the document origin is a CAD datum, not robot geometry.
        if (node.getName() === 'Part 1' && ci === 0) continue;
        const kicker = node.getName() === '1678-26c-1506' && pi === 0 && ci === 1;
        const moving = !kicker && (s.min[1] > .23 || node.getName() === 'Part 1' && [1,3].includes(ci));
        if (moving) { parent = 'intake'; transform = frame.clone().multiply(down); }
        const rollers = [[.143, .3676], [.1311,.3287], [.2525,.2468]];
        const r = moving ? nearbyRoller(s, rollers) : -1;
        if (r >= 0) parent = axle(`intake-roller-${r}`, 'intake', [...rollers[r], 0], transform);
        if (kicker) parent = axle('intake-roller-kicker', 'chassis', [.31165,.3221,0]);
      }
      put(s, parent, transform, sourceMaterial(p.getMaterial()));
    }
  }
  report.solids[part] = count;
}
// Pinned source/algorithm changes must receive a geometry review.
if (report.solids.body !== 284 || report.solids.intake !== 64 || report.solids.slide !== 5 || report.solids.lift !== 42) throw new Error(`CAD solid count changed: ${JSON.stringify(report.solids)}`);
for (const name of ['hood','climber','shooter-drum','intake-roller-0']) if (!report.assignments[name]) throw new Error(`Missing moving CAD: ${name}`);
const rubber = material('tire rubber', [.025,.028,.03,1], 0, .95), metal = material('module aluminum', [.5,.54,.58,1], .7, .4);
function shape(parent, geometry, matrix, mat) {
  const a = geometry.getAttribute('position'), n = geometry.getAttribute('normal'), p = [], normals = [], nm = new Matrix3().getNormalMatrix(matrix);
  for (let i = 0; i < a.count; i++) { p.push(...new Vector3().fromBufferAttribute(a,i).applyMatrix4(matrix).toArray()); normals.push(...new Vector3().fromBufferAttribute(n,i).applyMatrix3(nm).normalize().toArray()); }
  append(parent, p, normals, Array.from(geometry.index.array), mat); geometry.dispose();
}
if (rollerShells.size !== 5) throw new Error('Expected two intake and three hood roller shells');
report.rebuiltRollerShells = {};
for (const [parent, shell] of rollerShells) {
  const size = shell.hi.map((v, k) => v - shell.lo[k]), center = shell.lo.map((v, k) => (v + shell.hi[k]) / 2);
  const radius = Math.max(size[0], size[1]) / 2;
  shape(parent, new CylinderGeometry(radius, radius, size[2], 48),
    new Matrix4().makeTranslation(...center).multiply(new Matrix4().makeRotationX(Math.PI / 2)), shell.mat);
  report.rebuiltRollerShells[parent] = { radius, length: size[2], center, replacedSolids: shell.replacedSolids };
}
// Bumpers are absent from both published CAD exports: explicit estimated 3.25-inch envelopes.
const bumper = material('bumper', [.025,.13,.52,1], 0, .95), frameHalf = 27*.0254/2, thickness = .08255, outside = frameHalf+thickness;
for (const sign of [-1,1]) {
  shape('chassis', new BoxGeometry(thickness,.1143,outside*2), new Matrix4().makeTranslation(sign*(frameHalf+thickness/2),-.12616,0), bumper);
  shape('chassis', new BoxGeometry(frameHalf*2,.1143,thickness), new Matrix4().makeTranslation(0,-.12616,sign*(frameHalf+thickness/2)), bumper);
}
// Actual MK5n geometry from the team's own public model. L plates stay on the chassis;
// the turret/fork and wheel are normalized from the exported 45° steering pose.
const officialBytes = await readFile(`${input}/official-complete.glb`);
if (hash(officialBytes) !== sources.files.find(f => f.part === 'official-complete').sha256) throw new Error('Official CAD integrity');
report.inputs['official-complete'] = hash(officialBytes);
const official = await io.readBinary(officialBytes);
const officialFrame = new Matrix4().set(1,0,0,0, 0,0,-1,-offset, 0,1,0,0, 0,0,0,1);
let modules = 0;
for (const module of official.getRoot().listNodes().filter(n => /^SDS MK5n </.test(n.getName()))) {
  const wheelNode = module.listChildren().find(n => n.getName() === 'SDS MK5 Molded Wheel');
  const wheelSolids = wheelNode.getMesh().listPrimitives().flatMap(p => solids(p, new Matrix4().fromArray(wheelNode.getWorldMatrix())));
  const min = [Infinity,Infinity,Infinity], max = [-Infinity,-Infinity,-Infinity];
  for (const s of wheelSolids) for(let k=0;k<3;k++){min[k]=Math.min(min[k],s.min[k]);max[k]=Math.max(max[k],s.max[k]);}
  const center = runtimeOfficial(min.map((v,k)=>(v+max[k])/2));
  const x = Math.sign(center[0])*.276225, z = Math.sign(center[2])*.276225;
  const name = `module-${x>0?'front':'rear'}-${z<0?'left':'right'}`, fork = `${name}-fork`, wheel = `${name}-wheel`;
  group(fork,[x,.0508-offset,z]); group(wheel,[x,.0508-offset,z]);
  const a=wheelNode.getMesh().listPrimitives()[0].getAttribute('POSITION'), lo=a.getMin([]), hi=a.getMax([]);
  const short=hi.map((v,k)=>v-lo[k]).indexOf(Math.min(...hi.map((v,k)=>v-lo[k])));
  const axis=new Vector3().setComponent(short,1).transformDirection(officialFrame.clone().multiply(new Matrix4().fromArray(wheelNode.getWorldMatrix())));
  const angle=Math.atan2(axis.x,axis.z);
  const neutral=new Matrix4().makeTranslation(...center).multiply(new Matrix4().makeRotationY(-angle)).multiply(new Matrix4().makeTranslation(...center.map(v=>-v))).multiply(officialFrame);
  for (const node of module.listChildren().filter(n=>['SDS MK5 Molded Wheel','SDS MK5 Turret Assembly','SDS MK5 L Plate'].includes(n.getName()))) {
    const parent=node===wheelNode?wheel:node.getName()==='SDS MK5 L Plate'?'chassis':fork;
    for(const p of node.getMesh().listPrimitives()) for(const s of solids(p,new Matrix4().fromArray(node.getWorldMatrix()))) put(s,parent,parent==='chassis'?officialFrame:neutral,
      parent===wheel?rubber:metal);
  }
  modules++;
}
if(modules!==4) throw new Error(`Expected four MK5n modules, found ${modules}`);
function runtimeOfficial(p){return new Vector3(...p).applyMatrix4(officialFrame).toArray();}
const accessor = (type, array) => doc.createAccessor().setType(type).setArray(array).setBuffer(buffer);
// The release tessellation repeats coincident surfaces on the thin intake bars.
// Remove duplicate roller faces across material batches to prevent depth fighting
// while retaining the original surfaces, dimensions, normals and axle frames.
let duplicateRollerFaces = 0;
const rollerFaces = new Map();
for (const b of [...batches.values()].sort((a,b) => {
  const luminance = batch => batch.mat.getBaseColorFactor().slice(0,3).reduce((s,v)=>s+v,0);
  return luminance(a)-luminance(b);
})) if (b.parent.includes('roller-')) {
  if (!rollerFaces.has(b.parent)) rollerFaces.set(b.parent,new Set());
  const seen = rollerFaces.get(b.parent), indices = [];
  const vertex = i => b.positions.slice(i*3,i*3+3).map(v=>Math.round(v*1e5)).join(',');
  for (let i=0;i<b.indices.length;i+=3) {
    const face=b.indices.slice(i,i+3), key=face.map(vertex).sort().join('|');
    if (seen.has(key)) { duplicateRollerFaces++; continue; }
    seen.add(key); indices.push(...face);
  }
  b.indices=indices;
}
report.duplicateRollerFacesRemoved = duplicateRollerFaces;
for (const [key,b] of batches) groups.get(b.parent).addChild(doc.createNode(key).setMesh(doc.createMesh(key).addPrimitive(doc.createPrimitive()
  .setAttribute('POSITION',accessor('VEC3',new Float32Array(b.positions))).setAttribute('NORMAL',accessor('VEC3',new Float32Array(b.normals)))
  .setIndices(accessor('SCALAR',new Uint32Array(b.indices))).setMaterial(b.mat))));
await doc.transform(weld(),prune(),meshopt({encoder:MeshoptEncoder,level:'high'}));
const bytes = await io.writeBinary(doc); await mkdir(`public/assets/robots/${id}`,{recursive:true}); await writeFile(`public/assets/robots/${id}/robot.glb`,bytes);
let triangles=0,primitives=0;for(const n of doc.getRoot().listNodes())for(const p of n.getMesh()?.listPrimitives()??[]){triangles+=(p.getIndices()?.getCount()??p.getAttribute('POSITION').getCount())/3;primitives++;}
Object.assign(report,{bytes:bytes.length,triangles,primitives,sha256:hash(bytes)}); await writeFile(`${input}/preparation-report.json`,JSON.stringify(report,null,2)+'\n');
await writeFile(`assets/robots/${id}/runtime.json`,JSON.stringify({schemaVersion:1,robotId:id,group:{name:'Team 1678 Limestone CAD',source:sources.onshape,redistribution:{status:'pending',evidence:[]},files:[{path:`public/assets/robots/${id}/robot.glb`,bytes:bytes.length,sha256:hash(bytes)}]}},null,2)+'\n');
console.log(JSON.stringify(report,null,2));
