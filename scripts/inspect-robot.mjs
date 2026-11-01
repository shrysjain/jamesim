import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { Matrix4, Box3, Vector3, Quaternion } from 'three';
const pose = process.argv[2] ?? 'collecting';
if (!['collecting','starting'].includes(pose)) throw new Error('Expected collecting or starting configuration');
const source = `assets/source/robots/2910-reblitz/2910-reblitz-${pose}.glb`;
const bytes = await readFile(source);
const gltf = JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)));
const parts = [], assemblies = [];
function visit(index, parent = new Matrix4(), path = []) {
  const n = gltf.nodes[index];
  const local = n.matrix ? new Matrix4().fromArray(n.matrix) : new Matrix4().compose(new Vector3(...(n.translation ?? [0, 0, 0])), new Quaternion(...(n.rotation ?? [0, 0, 0, 1])), new Vector3(...(n.scale ?? [1, 1, 1])));
  const world = parent.clone().multiply(local), bounds = new Box3();
  if (n.mesh !== undefined) {
    let triangles = 0;
    for (const p of gltf.meshes[n.mesh].primitives) {
      const a = gltf.accessors[p.attributes.POSITION];
      const b = new Box3(new Vector3(...a.min), new Vector3(...a.max)); bounds.union(b.applyMatrix4(world));
      triangles += gltf.accessors[p.indices].count / 3;
    }
    parts.push({ index, mesh: n.mesh, name: n.name, path, bounds: { min: bounds.min.toArray(), max: bounds.max.toArray() }, center: bounds.getCenter(new Vector3()).toArray(), size: bounds.getSize(new Vector3()).toArray(), triangles, matrix: world.toArray() });
  }
  for (const c of n.children ?? []) bounds.union(visit(c, world, [...path, { index, name: n.name }]));
  if (n.children?.length > 1) assemblies.push({ index, name: n.name, children: n.children.length, bounds: {min:bounds.min.toArray(),max:bounds.max.toArray()}, center:bounds.getCenter(new Vector3()).toArray(), size:bounds.getSize(new Vector3()).toArray() });
  return bounds;
}
visit(0);
await mkdir('assets/intermediate/robots/2910-reblitz', {recursive:true});
await writeFile(`assets/intermediate/robots/2910-reblitz/inventory${pose === 'collecting' ? '' : '-starting'}.json`, JSON.stringify({parts,assemblies},null,2));
console.log(JSON.stringify(assemblies.filter(a=>a.index===0 || /R2 |Drivebase|Pivoting|Hood Assembly|SDS MK5n|Bumper Assembly|2" Roller Assembly/.test(a.name)),null,2));
console.log('Relevant axes',JSON.stringify(parts.filter(p=>/Drum|Flywheel|Roller|Bumper|Wheel|62-01|42-01|32-17/.test(p.name)).map(({index,name,center,size})=>({index,name,center,size})).slice(0,75),null,2));
