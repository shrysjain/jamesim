export type Vec3 = [number, number, number];
export type Bounds = { min: Vec3; max: Vec3 };
export type FieldElement = {
  id: string;
  name: string;
  kind: string;
  alliance?: 'red' | 'blue';
  bounds: Bounds;
  center: Vec3;
};
export type FieldManifest = {
  source: string;
  sourceSha256: string;
  model: string;
  collisions: string;
  triangles: number;
  bytes: number;
  field: { length: number; width: number; bounds: Bounds };
  elements: FieldElement[];
  fuel: Vec3[];
};
export type CollisionAsset = {
  boxes: { element: string; center: Vec3; halfExtents: Vec3 }[];
  meshes: { element: string; vertices: number[] | Float32Array; indices: number[] | Uint32Array }[];
};
