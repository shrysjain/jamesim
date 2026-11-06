import RAPIER from '@dimforge/rapier3d-compat';
import { linkedHopperExtension, partTransform } from '../robot/poses';
import type { RobotCollider, RobotDefinition, RobotPose } from '../robot/types';
import { add, sub, rotate, v3 } from './vector';

type Proxy = { collider: RAPIER.Collider; definition: RobotCollider };
const keys = ['intake', 'opposedIntake', 'hopper'] as const;
const interpolate = (definition: RobotDefinition, from: RobotPose, to: RobotPose, t: number): RobotPose => {
  const pose = { ...to };
  for (const key of keys) if (from[key] !== undefined || to[key] !== undefined) pose[key] = (from[key] ?? 0) + ((to[key] ?? 0) - (from[key] ?? 0)) * t;
  if (definition.hopper.intakeCurve
    && Math.abs(from.hopper - linkedHopperExtension(definition, from.intake)) < 1e-6
    && Math.abs(to.hopper - linkedHopperExtension(definition, to.intake)) < 1e-6) {
    pose.hopper = linkedHopperExtension(definition, pose.intake);
  }
  return pose;
};

/** Same local collider pose for inspection and contact-constrained actuation. */
export function mechanismColliderPose(definition: RobotDefinition, shape: RobotCollider, pose: RobotPose) {
  const { angle, pivot, shift, rise } = partTransform(definition, shape.part, pose);
  const x = shape.center[0] - pivot[0], y = shape.center[1] - pivot[1];
  return { angle, position: v3(pivot[0] + Math.cos(angle) * x - Math.sin(angle) * y + shift,
    pivot[1] + Math.sin(angle) * x + Math.cos(angle) * y + rise, shape.center[2]),
  rotation: { x: 0, y: 0, z: Math.sin(angle / 2), w: Math.cos(angle / 2) } };
}

/** Sweep the commanded intake/hopper path before moving attached colliders.
 * Rapier CCD tracks the parent body, not changes to a collider's local pose.
 * A blocked actuator stalls; normal rigid-body contacts and tires still move
 * the chassis. Inspection, hood aiming and managed climbing are separate.
 */
export function constrainMechanismPose(world: RAPIER.World, body: RAPIER.RigidBody, definition: RobotDefinition,
  proxies: Proxy[], fieldElements: Map<number, string>, from: RobotPose, to: RobotPose): RobotPose {
  if (keys.every(key => (from[key] ?? 0) === (to[key] ?? 0))) return to;
  const moving = proxies.filter(p => p.definition.part === 'intake' || p.definition.part === 'opposedIntake' || p.definition.part === 'hopper');
  const q = body.rotation(), origin = body.translation();
  const worldPose = (shape: RobotCollider, pose: RobotPose) => {
    const local = mechanismColliderPose(definition, shape, pose), r = local.rotation;
    return { ...local, position: add(origin, rotate(local.position, q)), rotation: {
      x: q.w*r.x + q.x*r.w + q.y*r.z - q.z*r.y,
      y: q.w*r.y - q.x*r.z + q.y*r.w + q.z*r.x,
      z: q.w*r.z + q.x*r.y - q.y*r.x + q.z*r.w,
      w: q.w*r.w - q.x*r.x - q.y*r.y - q.z*r.z,
    } };
  };
  // Translation is swept continuously. Split rotating joints so conservative
  // angular padding stays within 2 mm, including a long part's pivot offset.
  const steps = Math.max(1, ...moving.map(({ definition: shape }) => {
    const a = partTransform(definition, shape.part, from), b = partTransform(definition, shape.part, to);
    const radius = Math.hypot(...shape.halfExtents) + Math.hypot(shape.center[0] - a.pivot[0], shape.center[1] - a.pivot[1]);
    return Math.ceil(Math.abs(b.angle - a.angle) * radius / .002);
  }));
  for (let step = 0; step < steps; step++) {
    const begin = interpolate(definition, from, to, step / steps), end = interpolate(definition, from, to, (step + 1) / steps);
    let fraction = 1;
    for (const { collider, definition: shape } of moving) {
      const a = worldPose(shape, begin), b = worldPose(shape, end), delta = sub(b.position, a.position);
      const angle = Math.abs(b.angle - a.angle);
      if (angle < 1e-10 && Math.hypot(delta.x, delta.y, delta.z) < 1e-10) continue;
      const padding = .0005 + Math.hypot(...shape.halfExtents) * angle;
      // Non-stopping initial penetration lets separating/tangential motion
      // withdraw without excluding an entire concave field collider.
      const hit = world.castShape(a.position, a.rotation, delta, collider.shape, padding, 1, false,
        RAPIER.QueryFilterFlags.EXCLUDE_DYNAMIC | RAPIER.QueryFilterFlags.EXCLUDE_SENSORS,
        collider.collisionGroups(), undefined, body, other => {
          const element = fieldElements.get(other.handle);
          return !!element && element !== 'floor';
        });
      if (hit) fraction = Math.min(fraction, Math.max(0, hit.time_of_impact));
    }
    if (fraction < 1) return interpolate(definition, from, to, (step + fraction) / steps);
  }
  return to;
}
