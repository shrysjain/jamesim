export type Vector = { x: number; y: number; z: number };
export type Rotation = Vector & { w: number };
export const v3 = (x = 0, y = 0, z = 0): Vector => ({ x, y, z });
export const add = (a: Vector, b: Vector) => v3(a.x + b.x, a.y + b.y, a.z + b.z);
export const sub = (a: Vector, b: Vector) => v3(a.x - b.x, a.y - b.y, a.z - b.z);
export const scale = (v: Vector, s: number) => v3(v.x * s, v.y * s, v.z * s);
export const lerp = (a: Vector, b: Vector, t: number) => add(scale(a, 1 - t), scale(b, t));
export function rotate(v: Vector, q: Rotation): Vector {
  const tx = 2 * (q.y * v.z - q.z * v.y), ty = 2 * (q.z * v.x - q.x * v.z), tz = 2 * (q.x * v.y - q.y * v.x);
  return v3(v.x + q.w * tx + q.y * tz - q.z * ty, v.y + q.w * ty + q.z * tx - q.x * tz, v.z + q.w * tz + q.x * ty - q.y * tx);
}
export const unrotate = (v: Vector, q: Rotation) => rotate(v, { x: -q.x, y: -q.y, z: -q.z, w: q.w });
