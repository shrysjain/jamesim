import RAPIER from '@dimforge/rapier3d-compat';
import type { SwerveChassis } from './SwerveChassis';
import { FUEL_MASS, FUEL_RADIUS } from './FuelSystem';
import type { Fuel, FuelSystem } from './FuelSystem';
import { add, sub, scale, rotate, unrotate, v3 } from './vector';
import { CollisionGroups } from './collisionGroups';

/** Loose floor fuel uses horizontal bumper contacts. Covered stored fuel
 * transfers field contacts to the chassis without adding payload mass. */
export class GameplayContacts {
  private coveredCargo = new Map<number, RAPIER.Collider>();
  constructor(private world: RAPIER.World, private chassis: SwerveChassis, private fuel: FuelSystem,
    private fieldElements: Map<number, string>) {}

  /** Original owned bodies stay disabled and payload mass is counted once.
   * Massless field-only spheres transfer contact through a retaining cover to
   * the chassis, rather than ejecting cargo through fabric or ignoring beams. */
  syncCoveredCargo(held: Fuel[]) {
    const stored = this.chassis.definition.hopper.retainingNet ? held.filter(f => f.state === 'stored') : [];
    if (!stored.length && !this.coveredCargo.size) return;
    const wanted = new Set(stored.map(f => f.id));
    for (const [id, collider] of this.coveredCargo) if (!wanted.has(id)) {
      this.world.removeCollider(collider, true); this.coveredCargo.delete(id);
    }
    const body = this.chassis.body, q = body.rotation(), render = this.chassis.renderRotation;
    for (const f of stored) {
      const offset = rotate(f.local, render), local = unrotate(offset, q);
      let collider = this.coveredCargo.get(f.id);
      if (!collider) {
        collider = this.world.createCollider(RAPIER.ColliderDesc.ball(FUEL_RADIUS).setDensity(0)
          .setTranslation(local.x, local.y, local.z)
          .setFriction(.05).setFrictionCombineRule(RAPIER.CoefficientCombineRule.Min)
          .setRestitution(.05).setContactSkin(.001).setCollisionGroups(CollisionGroups.coveredCargo), body);
        this.coveredCargo.set(f.id, collider);
      }
      collider.setTranslationWrtParent(local);
      // Keep the world pose current even for a proxy created after physics,
      // e.g. when a cancelled feed returns to storage this tick.
      collider.setTranslation(add(body.translation(), offset));
    }
    this.world.propagateModifiedBodyPositionsToColliders();
  }

  displaceFuel() {
    const robot = this.chassis.body, origin = robot.translation(), q = robot.rotation();
    const hx = this.chassis.definition.length / 2, hz = this.chassis.definition.width / 2;
    let moved = false;
    for (const f of this.fuel.records) {
      if (f.owner !== null) continue;
      const position = f.body.translation(), local = unrotate(sub(position, origin), q);
      const low = local.y < 0.06;
      // Filter CCD as well as solver contacts, so a ball trapped against a wall
      // cannot arrest the chassis vertically before horizontal displacement.
      const collider = f.body.collider(0), groups = low ? CollisionGroups.groundFuel : CollisionGroups.fuel;
      if (collider.collisionGroups() !== groups) collider.setCollisionGroups(groups);
      if (!low || local.y < -0.6 || Math.abs(local.x) > hx + FUEL_RADIUS || Math.abs(local.z) > hz + FUEL_RADIUS) continue;
      const closest = v3(Math.max(-hx, Math.min(hx, local.x)), local.y, Math.max(-hz, Math.min(hz, local.z)));
      const dx = local.x - closest.x, dz = local.z - closest.z, distance = Math.hypot(dx, dz);
      if (distance >= FUEL_RADIUS + 0.002) continue;
      const directions = distance > 1e-5 ? [v3(dx / distance, 0, dz / distance)]
        : [v3(1, 0, 0), v3(-1, 0, 0), v3(0, 0, 1), v3(0, 0, -1)].sort((a, b) =>
          (a.x ? hx - local.x * a.x : hz - local.z * a.z) - (b.x ? hx - local.x * b.x : hz - local.z * b.z));
      for (const n of directions) {
        const depth = distance > 1e-5 ? FUEL_RADIUS + 0.002 - distance
          : n.x ? hx + FUEL_RADIUS + 0.002 - local.x * n.x : hz + FUEL_RADIUS + 0.002 - local.z * n.z;
        const normal = rotate(n, q), delta = scale(normal, depth);
        // A trapped ball may overlap the underside briefly, but never gets
        // teleported through a wall or becomes support for the robot.
        if (this.world.castShape(position, q, delta, new RAPIER.Ball(FUEL_RADIUS * 0.96), 0, 1, true,
          RAPIER.QueryFilterFlags.EXCLUDE_DYNAMIC | RAPIER.QueryFilterFlags.EXCLUDE_SENSORS, undefined, undefined, robot,
          c => this.fieldElements.get(c.handle) !== 'floor')) continue;
        f.body.setTranslation(add(position, delta), true);
        const relative = sub(robot.velocityAtPoint(position), f.body.linvel());
        const closing = relative.x * normal.x + relative.z * normal.z;
        const impulse = scale(normal, Math.min(8, Math.max(0, closing * 1.05)) * FUEL_MASS);
        f.body.applyImpulse(impulse, true);
        robot.applyImpulseAtPoint(scale(impulse, -1), position, true);
        moved = true; break;
      }
    }
    if (moved) this.world.propagateModifiedBodyPositionsToColliders();
  }
}
