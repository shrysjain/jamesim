import { readdir, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve, relative } from 'node:path';
import { unpackCollisions } from '../src/field/collisionAsset.ts';

const root = resolve(import.meta.dirname, '..'), dist = resolve(root, 'dist');
const manifest = JSON.parse(await readFile(resolve(root, 'assets/runtime-manifest.json'), 'utf8'));
async function walk(dir) {
  const files = [];
  for (const item of await readdir(dir, { withFileTypes: true })) {
    const path = resolve(dir, item.name);
    if (item.isDirectory()) files.push(...await walk(path)); else files.push(path);
  }
  return files;
}
const files = await walk(dist), runtime = files.filter(p => p.includes('/assets/runtime/'));
const assets = manifest.groups.flatMap(g => g.files).filter(f => !f.path.startsWith('public/fonts/'));
if (runtime.length !== assets.length) throw Error('Runtime payload is incomplete or contains unexpected files.');
for (const path of runtime) {
  const bytes = await readFile(path), hash = createHash('sha256').update(bytes).digest('hex').slice(0, 12);
  if (!path.includes(`-${hash}.`)) throw Error(`Content hash mismatch: ${path}`);
  if (path.endsWith('.bin')) {
    const decoded = unpackCollisions(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
    const original = JSON.parse(await readFile(resolve(root, 'public/assets/field-collisions.json'), 'utf8'));
    if (JSON.stringify(decoded.boxes) !== JSON.stringify(original.boxes) || decoded.meshes.length !== original.meshes.length) throw Error('Packed collision structure differs.');
    decoded.meshes.forEach((mesh, i) => {
      if (mesh.element !== original.meshes[i].element || !Buffer.from(mesh.vertices.buffer, mesh.vertices.byteOffset, mesh.vertices.byteLength).equals(Buffer.from(new Float32Array(original.meshes[i].vertices).buffer))
        || !Buffer.from(mesh.indices.buffer, mesh.indices.byteOffset, mesh.indices.byteLength).equals(Buffer.from(new Uint32Array(original.meshes[i].indices).buffer))) throw Error('Packed collision geometry differs.');
    });
  }
}
for (const path of files) {
  const name = relative(dist, path);
  if (/asset-report|PROVENANCE|\.map$|\.step$|\.pdf$|\.env|DebugPanel|debug\.css/.test(name)) throw Error(`Preparation/development file in output: ${name}`);
  if (path.endsWith('.js') && /Drive testing|Inspection layers|Scene diagnostics|Choose your session|Free practice/.test(await readFile(path, 'utf8'))) throw Error(`Development interface in output: ${name}`);
}
for (const file of ['index.html', 'favicon.svg', 'social-card.png', 'licenses/dependencies.md', 'licenses/CHEESY_ARENA_LICENSE.txt', 'licenses/THIRD_PARTY_NOTICES.md']) {
  if (!files.includes(resolve(dist, file))) throw Error(`Missing release file: ${file}`);
}
console.log(`Production payload verified: ${runtime.length} content-hashed runtime assets; exact Rapier geometry; no development UI or preparation files.`);
console.log('This is a local build check, not redistribution clearance.');
