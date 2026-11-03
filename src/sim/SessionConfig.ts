import { ALLIANCE_LINE, FIELD_HALF_WIDTH } from '../field/targets';
import type { Alliance } from '../field/targets';
import { BLUE_START_OBSTACLES, START_LINE_WIDTH } from '../field/layout';
import { REBLITZ } from '../robot/robots/2910-reblitz/definition';
import { partTransform, STARTING_POSE } from '../robot/poses';
import type { RobotDefinition } from '../robot/types';

export type StartPosition = { x: number; z: number; yaw: number };
const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));
export const START_HEIGHT = .223; // prepared chassis/carpet reference; avoids spawning through a trench arm
export function startExtents(robot: RobotDefinition, yaw: number) {
  return { x: (Math.abs(Math.cos(yaw)) * robot.length + Math.abs(Math.sin(yaw)) * robot.width) / 2,
    z: (Math.abs(Math.sin(yaw)) * robot.length + Math.abs(Math.cos(yaw)) * robot.width) / 2 };
}
export function defaultStart(alliance: Alliance, spot: 'left' | 'center' | 'right' = 'left', robot: RobotDefinition = REBLITZ): StartPosition {
  const sign = alliance === 'red' ? -1 : 1;
  return { x: sign * (ALLIANCE_LINE + START_LINE_WIDTH * .75 + robot.length / 2),
    z: sign * (spot === 'right' ? -1.5 : spot === 'center' ? -.288925 : 1.5), yaw: sign === 1 ? 0 : Math.PI };
}
/** Keep bumpers overlapping their full-width starting tape, allowing actual wall contact.
 * Obstacle clearance is checked separately so placement never silently jumps sideways. */
export function normalizeStart(start: StartPosition | undefined, alliance: Alliance, spot?: 'left' | 'center' | 'right', robot: RobotDefinition = REBLITZ): StartPosition {
  if (!start || ![start.x, start.z, start.yaw].every(Number.isFinite)) return defaultStart(alliance, spot, robot);
  const sign = alliance === 'red' ? -1 : 1, yaw = Math.atan2(Math.sin(start.yaw), Math.cos(start.yaw)), half = startExtents(robot, yaw);
  return { x: sign * clamp(sign * start.x, ALLIANCE_LINE - half.x + .001, ALLIANCE_LINE + START_LINE_WIDTH + half.x - .001),
    z: clamp(start.z, -FIELD_HALF_WIDTH + half.z, FIELD_HALF_WIDTH - half.z), yaw };
}

/** Oriented rectangle vs field rectangle: rotated corners may clear a post. */
function overlaps(x: number, z: number, hx: number, hz: number, yaw: number, box: { minX: number; maxX: number; minZ: number; maxZ: number }, padding = 0) {
  const c = Math.cos(yaw), s = Math.sin(yaw), dx = x - (box.minX + box.maxX) / 2, dz = z - (box.minZ + box.maxZ) / 2;
  const bx = (box.maxX - box.minX) / 2 + padding, bz = (box.maxZ - box.minZ) / 2 + padding;
  return Math.abs(dx) < Math.abs(c) * hx + Math.abs(s) * hz + bx &&
    Math.abs(dz) < Math.abs(s) * hx + Math.abs(c) * hz + bz &&
    Math.abs(dx * c - dz * s) < hx + Math.abs(c) * bx + Math.abs(s) * bz &&
    Math.abs(dx * s + dz * c) < hz + Math.abs(s) * bx + Math.abs(c) * bz;
}
export function startProblem(start: StartPosition, alliance: Alliance, robot: RobotDefinition): string | null {
  if (![start.x, start.z, start.yaw].every(Number.isFinite)) return 'Choose a finite starting position.';
  const half = startExtents(robot, start.yaw), sign = alliance === 'red' ? -1 : 1;
  if (Math.abs(start.z) + half.z > FIELD_HALF_WIDTH + 1e-7) return 'Keep the bumpers inside the guardrails.';
  if (sign * start.x + half.x < ALLIANCE_LINE || sign * start.x - half.x > ALLIANCE_LINE + START_LINE_WIDTH) return 'Bumpers must overlap your starting line.';
  // A 180° rotation maps red's structures to blue's CAD geometry.
  const x = sign * start.x, z = sign * start.z, yaw = start.yaw + (sign < 0 ? Math.PI : 0), c = Math.cos(yaw), s = Math.sin(yaw);
  const shapes = [{ x, z, hx: robot.length / 2, hz: robot.width / 2, minY: .03, maxY: .19 }];
  for (const collider of robot.colliders) {
    const t = partTransform(robot, collider.part, STARTING_POSE), ca = Math.cos(t.angle), sa = Math.sin(t.angle);
    const lx = collider.center[0] - t.pivot[0], ly = collider.center[1] - t.pivot[1];
    const localX = t.pivot[0] + t.shift + lx * ca - ly * sa, localY = t.pivot[1] + t.rise + lx * sa + ly * ca;
    const hx = Math.abs(ca) * collider.halfExtents[0] + Math.abs(sa) * collider.halfExtents[1], hy = Math.abs(sa) * collider.halfExtents[0] + Math.abs(ca) * collider.halfExtents[1];
    shapes.push({ x: x + localX * c + collider.center[2] * s, z: z - localX * s + collider.center[2] * c,
      hx, hz: collider.halfExtents[2], minY: START_HEIGHT + localY - hy, maxY: START_HEIGHT + localY + hy });
  }
  for (const obstacle of BLUE_START_OBSTACLES) {
    if (shapes.some(shape => shape.maxY > obstacle.minY && shape.minY < obstacle.maxY &&
      overlaps(shape.x, shape.z, shape.hx, shape.hz, yaw, obstacle, obstacle.kind === 'bump' ? .001 : 0))) {
      return obstacle.kind === 'bump' ? 'Move clear of the bump; robots cannot start touching it.' :
        obstacle.kind === 'hub' ? 'Move clear of the hub.' : 'Move clear of the trench support or overhead arm.';
    }
  }
  return null;
}

/** The same alliance-relative driver axes as the match, without running field physics during setup. */
export function driveStart(position: StartPosition, input: { forward: number; strafe: number; turn: number }, alliance: Alliance, dt: number, robot: RobotDefinition = REBLITZ): StartPosition {
  const sign = alliance === 'red' ? -1 : 1, length = Math.max(1, Math.hypot(input.forward, input.strafe));
  return normalizeStart({ x: position.x - sign * input.forward / length * 2.4 * dt, z: position.z - sign * input.strafe / length * 2.4 * dt, yaw: position.yaw + input.turn * 2.2 * dt }, alliance, undefined, robot);
}
