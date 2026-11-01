import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import { serialize } from 'node:v8';
import { createWriteStream } from 'node:fs';
import { once } from 'node:events';
import occtFactory from 'occt-import-js';

await mkdir('assets/intermediate', { recursive: true });
console.log('Loading OpenCascade and tessellating official STEP…');
const occt = await occtFactory();
const source = await readFile('assets/intermediate/field-visual.step');
const result = occt.ReadStepFile(source, {
  linearUnit: 'meter',
  linearDeflectionType: 'absolute_value',
  linearDeflection: 0.006,
  angularDeflection: 0.8,
});
if (!result.success) throw new Error('STEP tessellation failed');
const boundsOf = (array) => {
  const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < array.length; i++) {
    const a = i % 3;
    min[a] = Math.min(min[a], array[i]);
    max[a] = Math.max(max[a], array[i]);
  }
  return { min, max };
};
const meshes = result.meshes.map((mesh, index) => ({ index, name: mesh.name, color: mesh.color,
  vertices: mesh.attributes.position.array.length / 3, triangles: mesh.index.array.length / 3,
  bounds: boundsOf(mesh.attributes.position.array),
}));
const summary = { root: result.root, meshes,
  vertices: meshes.reduce((sum, mesh) => sum + mesh.vertices, 0),
  triangles: meshes.reduce((sum, mesh) => sum + mesh.triangles, 0),
};
await writeFile('assets/intermediate/field-summary.json', JSON.stringify(summary, null, 2));
await writeFile('assets/intermediate/field-root.json', JSON.stringify(result.root));
const output = createWriteStream('assets/intermediate/field-meshes.bin');
for (const mesh of result.meshes) {
  const data = gzipSync(serialize(mesh), { level: 1 });
  const length = Buffer.alloc(4); length.writeUInt32LE(data.length);
  output.write(length);
  if (!output.write(data)) await once(output, 'drain');
}
output.end();
await once(output, 'finish');
console.log(JSON.stringify({ meshes: meshes.length, vertices: summary.vertices, triangles: summary.triangles,
  root: result.root.name, children: result.root.children.map(({name,meshes,children})=>({name,meshes,children:children.length})),
  largest: [...meshes].sort((a,b)=>b.triangles-a.triangles).slice(0,8),
}, null, 2));
