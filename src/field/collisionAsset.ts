import type { CollisionAsset } from './types.ts';

const MAGIC = 0x3143534a; // JSC1, little endian
const align = (n: number) => Math.ceil(n / 4) * 4;

/** The same float32/uint32 geometry Rapier already consumes, without JSON numbers. */
export function packCollisions(asset: CollisionAsset): Uint8Array {
  const header = new TextEncoder().encode(JSON.stringify({ boxes: asset.boxes,
    meshes: asset.meshes.map(m => ({ element: m.element, vertices: m.vertices.length, indices: m.indices.length })) }));
  const start = align(8 + header.length);
  const bytes = new Uint8Array(start + asset.meshes.reduce((n, m) => n + (m.vertices.length + m.indices.length) * 4, 0));
  const view = new DataView(bytes.buffer); view.setUint32(0, MAGIC, true); view.setUint32(4, header.length, true);
  bytes.set(header, 8);
  let offset = start;
  for (const mesh of asset.meshes) {
    mesh.vertices.forEach(v => { view.setFloat32(offset, v, true); offset += 4; });
    mesh.indices.forEach(i => { view.setUint32(offset, i, true); offset += 4; });
  }
  return bytes;
}

export function unpackCollisions(buffer: ArrayBuffer): CollisionAsset {
  const invalid = () => new Error('Collision data is incomplete or incompatible. Reload the game.');
  if (buffer.byteLength < 8) throw invalid();
  const view = new DataView(buffer), length = view.getUint32(4, true);
  if (view.getUint32(0, true) !== MAGIC || length > buffer.byteLength - 8) throw invalid();
  const header = JSON.parse(new TextDecoder().decode(new Uint8Array(buffer, 8, length))) as {
    boxes: CollisionAsset['boxes']; meshes: { element: string; vertices: number; indices: number }[];
  };
  let offset = align(8 + length);
  const meshes = header.meshes.map(mesh => {
    if (![mesh.vertices, mesh.indices].every(n => Number.isSafeInteger(n) && n >= 0 && n % 3 === 0) || offset + (mesh.vertices + mesh.indices) * 4 > buffer.byteLength) throw invalid();
    const vertices = new Float32Array(buffer, offset, mesh.vertices); offset += mesh.vertices * 4;
    const indices = new Uint32Array(buffer, offset, mesh.indices); offset += mesh.indices * 4;
    return { element: mesh.element, vertices, indices };
  });
  if (offset !== buffer.byteLength) throw invalid();
  return { boxes: header.boxes, meshes };
}
