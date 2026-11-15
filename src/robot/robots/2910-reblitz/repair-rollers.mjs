/** Recenter the retained feeder rollers without changing any mesh/BIN data.
 * Run from the repository root after scripts/convert-robot.mjs, or on the
 * existing prepared asset. Repeating the repair is a no-op. */
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'meshoptimizer';
import { Box3, Matrix4, Vector3 } from 'three';

const path = 'public/assets/robots/2910-reblitz/robot.glb';
const bytes = await readFile(path);
if (bytes.readUInt32LE(0) !== 0x46546c67 || bytes.readUInt32LE(4) !== 2
  || bytes.readUInt32LE(8) !== bytes.length || bytes.readUInt32LE(16) !== 0x4e4f534a) throw Error('Expected a valid GLB v2 JSON chunk');
const jsonLength = bytes.readUInt32LE(12), doc = JSON.parse(bytes.subarray(20, 20 + jsonLength).toString('utf8'));
await MeshoptDecoder.ready;
const { scene } = await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder)
  .parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
scene.updateMatrixWorld(true);
const roots = [];
scene.traverse(node => { if (/^feeder-roller-[1-7]$/.test(node.userData.mechanism ?? '')) roots.push(node); });
if (roots.length !== 7) throw Error(`Expected seven feeder rollers, found ${roots.length}`);
let changed = 0;
for (const root of roots) {
  const frame = new Matrix4().copy(root.matrixWorld).invert(), bounds = new Box3();
  root.traverse(node => {
    if (!node.isMesh) return;
    const position = node.geometry.getAttribute('position'), matrix = new Matrix4().multiplyMatrices(frame, node.matrixWorld);
    for (let i = 0; i < position.count; i++) bounds.expandByPoint(new Vector3().fromBufferAttribute(position, i).applyMatrix4(matrix));
  });
  const size = bounds.getSize(new Vector3()), center = bounds.getCenter(new Vector3());
  if (size.x < .03 || size.x > .04 || size.y < .03 || size.y > .04 || size.z < .60 || size.z > .64) throw Error(`Unexpected roller envelope: ${root.userData.mechanism}`);
  const matches = doc.nodes.filter(node => node.extras?.mechanism === root.userData.mechanism);
  if (matches.length !== 1) throw Error(`Nonunique roller frame: ${root.userData.mechanism}`);
  const node = matches[0];
  if (node.matrix || node.rotation?.some((v, i) => Math.abs(v - (i === 3 ? 1 : 0)) > 1e-10)
    || node.scale?.some(v => Math.abs(v - 1) > 1e-10) || !node.children?.length) throw Error('Expected identity roller rotation/scale and mesh children');
  // Z is the shaft axis. Retain the original axial origin and all zero-angle
  // world positions by applying the opposite offset to each direct child.
  const delta = [center.x, center.y, 0];
  if (Math.hypot(delta[0], delta[1]) < .00005) continue;
  if (Math.hypot(delta[0], delta[1]) > .012) throw Error('Unexpected roller pivot error');
  node.translation = (node.translation ?? [0, 0, 0]).map((v, i) => v + delta[i]);
  for (const index of node.children) {
    const child = doc.nodes[index];
    if (child.matrix) for (let i = 0; i < 3; i++) child.matrix[12 + i] -= delta[i];
    else child.translation = (child.translation ?? [0, 0, 0]).map((v, i) => v - delta[i]);
  }
  changed++;
}
let output = bytes;
if (changed) {
  const json = Buffer.from(JSON.stringify(doc)), padded = Buffer.alloc(Math.ceil(json.length / 4) * 4, 0x20); json.copy(padded);
  const header = Buffer.alloc(20), remaining = bytes.subarray(20 + jsonLength);
  header.writeUInt32LE(0x46546c67, 0); header.writeUInt32LE(2, 4); header.writeUInt32LE(20 + padded.length + remaining.length, 8);
  header.writeUInt32LE(padded.length, 12); header.writeUInt32LE(0x4e4f534a, 16);
  output = Buffer.concat([header, padded, remaining]);
  await writeFile(path, output);
}
const recordPath = 'assets/robots/2910-reblitz/runtime.json', record = JSON.parse(await readFile(recordPath, 'utf8'));
const file = record.group.files.find(file => file.path === path); if (!file) throw Error('Missing runtime record');
const hash = createHash('sha256').update(output).digest('hex');
if (file.bytes !== output.length || file.sha256 !== hash) {
  file.bytes = output.length; file.sha256 = hash;
  await writeFile(recordPath, JSON.stringify(record, null, 2) + '\n');
}
console.log(`Recentered ${changed} Re•Blitz feeder rollers; embedded geometry is unchanged.`);
