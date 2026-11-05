import type { Vec3 } from '../field/types';
import type { HopperObstacle, HopperVolume, RobotDefinition, RobotPose } from './types';
import { partTransform } from './poses';

export type HopperContact = { normal: Vec3; distance: number };
export type FloorPoint = { x: number; y: number };

/** Thin lips and trays attached to a moving carriage use its existing pose. */
export function hopperObstacles(definition: RobotDefinition, pose: RobotPose): HopperObstacle[] {
  return (definition.hopper.obstacles ?? []).map(box => {
    if (!box.part) return box;
    const {angle,pivot,shift,rise} = partTransform(definition,box.part,pose), c=Math.cos(angle),s=Math.sin(angle);
    const x=box.center[0]-pivot[0],y=box.center[1]-pivot[1];
    return {...box,center:[pivot[0]+c*x-s*y+shift,pivot[1]+s*x+c*y+rise,box.center[2]],angle:(box.angle ?? 0)+angle};
  });
}

function boxContact(local: number[], half: Vec3): HopperContact {
  const delta = local.map((x, k) => x - Math.max(-half[k], Math.min(half[k], x)));
  const distance = Math.hypot(...delta);
  if (distance > 1e-9) return { distance, normal: delta.map(x => x / distance) as Vec3 };
  const gaps = local.map((x, k) => half[k] - Math.abs(x)), axis = gaps.indexOf(Math.min(...gaps));
  const normal: Vec3 = [0, 0, 0]; normal[axis] = local[axis] < 0 ? -1 : 1;
  return { distance: -gaps[axis], normal };
}

/** Signed sphere-center distance and outward normal for a local box. Optional
 * rotation about Z represents inclined fixed panels without browser geometry. */
export function hopperObstacleContact(point: Vec3, box: HopperObstacle): HopperContact {
  const c = Math.cos(box.angle ?? 0), s = Math.sin(box.angle ?? 0);
  const dx = point[0]-box.center[0], dy = point[1]-box.center[1];
  const local = [c*dx+s*dy,-s*dx+c*dy,point[2]-box.center[2]];
  let contact: HopperContact;
  if (box.shape === 'cylinder' || box.shape === 'annulus') {
    const radius = Math.hypot(local[0], local[2]), outer = box.halfExtents[0];
    const middle = box.shape === 'annulus' ? (outer + box.innerRadius!) / 2 : 0;
    const radialSign = box.shape === 'annulus' && radius < middle ? -1 : 1;
    const radial = box.shape === 'annulus' ? Math.abs(radius - middle) - (outer - box.innerRadius!) / 2 : radius - outer;
    const vertical = Math.abs(local[1]) - box.halfExtents[1];
    const dr = Math.max(0, radial), dy = Math.max(0, vertical), outside = Math.hypot(dr, dy);
    const nr = outside > 1e-9 ? dr / outside : radial > vertical ? 1 : 0;
    const ny = outside > 1e-9 ? dy / outside : radial > vertical ? 0 : 1;
    contact = { distance: outside + Math.min(0, Math.max(radial, vertical)), normal: [
      nr * radialSign * (radius > 1e-9 ? local[0] / radius : 1), ny * (local[1] < 0 ? -1 : 1),
      nr * radialSign * (radius > 1e-9 ? local[2] / radius : 0),
    ] };
    if (box.clipHalfExtents) {
      // Intersection SDF is conservative at shared edges, avoiding a sphere
      // leaking through the seam of a round platform cropped to its real frame.
      const clip = boxContact(local, box.clipHalfExtents);
      if (clip.distance > contact.distance) contact = clip;
    }
  } else {
    contact = boxContact(local, box.halfExtents);
  }
  const [nx, ny, nz] = contact.normal;
  return { normal: [c*nx-s*ny,s*nx+c*ny,nz], distance: contact.distance };
}

/** Moving roller tops share the same transform as the rendered carriage. */
export function hopperFloorPoints(definition: RobotDefinition, pose: RobotPose): FloorPoint[] {
  const points = (definition.hopper.floorProfile ?? []).map(p => {
    if (!p.part) return { x: p.x, y: p.y };
    const { angle, pivot, shift, rise } = partTransform(definition, p.part, pose), c = Math.cos(angle), s = Math.sin(angle);
    const x = p.x - pivot[0], y = p.y - pivot[1];
    return { x: pivot[0] + c*x-s*y+shift, y: pivot[1]+s*x+c*y+rise };
  }).sort((a, b) => a.x-b.x);
  const result: FloorPoint[] = [];
  for (const p of points) {
    const last = result.at(-1);
    if (last && Math.abs(last.x-p.x) < 1e-8) last.y = Math.max(last.y, p.y);
    else result.push(p);
  }
  return result;
}

export function hopperFloorHeight(x: number, volume: HopperVolume, points: readonly FloorPoint[] = []): number {
  if (!points.length) return volume.floorY + (volume.floorSlope ?? 0)*x;
  if (x <= points[0].x) return points[0].y;
  for (let i = 1; i < points.length; i++) if (x <= points[i].x) {
    const a = points[i-1], b = points[i]; return a.y+(b.y-a.y)*(x-a.x)/(b.x-a.x);
  }
  return points.at(-1)!.y;
}

/** Sphere-to-polyline contact includes finite segment ends, so a roller peak
 * supports a ball even when its center has passed the peak's X coordinate. */
export function hopperFloorContact(point: Vec3, volume: HopperVolume, points: readonly FloorPoint[] = []): HopperContact {
  if (!points.length) {
    const slope = volume.floorSlope ?? 0, length = Math.sqrt(1+slope*slope);
    return { distance: (point[1]-hopperFloorHeight(point[0], volume))/length, normal: [-slope/length,1/length,0] };
  }
  let best = Infinity, closestX = 0, closestY = 0, nx = 0, ny = 1;
  const candidate = (x: number, y: number, normalX: number, normalY: number) => {
    const squared = (point[0]-x)**2+(point[1]-y)**2;
    if (squared < best) { best = squared; closestX = x; closestY = y; nx = normalX; ny = normalY; }
  };
  if (point[0] <= points[0].x) candidate(point[0], points[0].y, 0, 1);
  if (point[0] >= points.at(-1)!.x) candidate(point[0], points.at(-1)!.y, 0, 1);
  for (let i = 1; i < points.length; i++) {
    const a = points[i-1], b = points[i], dx = b.x-a.x, dy = b.y-a.y, length = Math.hypot(dx,dy);
    const t = Math.max(0, Math.min(1, ((point[0]-a.x)*dx+(point[1]-a.y)*dy)/(length*length)));
    candidate(a.x+t*dx,a.y+t*dy,-dy/length,dx/length);
  }
  const distance = Math.sqrt(best), sign = point[1] >= hopperFloorHeight(point[0],volume,points) ? 1 : -1;
  return { distance: sign*distance, normal: distance > 1e-9 ? [sign*(point[0]-closestX)/distance, sign*(point[1]-closestY)/distance, 0] : [nx,ny,0] };
}
