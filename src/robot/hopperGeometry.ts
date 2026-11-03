import type { Vec3 } from '../field/types';
import type { HopperObstacle } from './types';

/** Signed sphere-center distance and outward normal for a local box. Optional
 * rotation about Z represents inclined fixed panels without browser geometry. */
export function hopperObstacleContact(point: Vec3, box: HopperObstacle): { normal: Vec3; distance: number } {
  const c = Math.cos(box.angle ?? 0), s = Math.sin(box.angle ?? 0);
  const dx = point[0]-box.center[0], dy = point[1]-box.center[1];
  const local = [c*dx+s*dy,-s*dx+c*dy,point[2]-box.center[2]];
  const delta = local.map((x,k) => x-Math.max(-box.halfExtents[k],Math.min(box.halfExtents[k],x)));
  let distance = Math.hypot(...delta);
  let normal: Vec3;
  if (distance > 1e-9) normal = delta.map(x => x/distance) as Vec3;
  else {
    const gaps = local.map((x,k) => box.halfExtents[k]-Math.abs(x)), axis = gaps.indexOf(Math.min(...gaps));
    normal = [0,0,0]; normal[axis] = local[axis] < 0 ? -1 : 1; distance = -gaps[axis];
  }
  return { normal: [c*normal[0]-s*normal[1],s*normal[0]+c*normal[1],normal[2]], distance };
}
