import RAPIER from '@dimforge/rapier3d-compat';
import type { Vec3 } from '../field/types';
import type { Vector } from './vector';
import { v3 } from './vector';
import { CollisionGroups } from './collisionGroups';

export const FUEL_RADIUS = 0.075;
export const FUEL_MASS = 0.215;
export const FUEL_LINEAR_DAMPING = 0.15;
export const FUEL_RESTITUTION = 0.35;
export type FuelState = 'loose' | 'transferring' | 'stored' | 'feeding' | 'airborne' | 'hubTransit';
export type Fuel = {
  readonly id: number; readonly body: RAPIER.RigidBody;
  state: FuelState; owner: string | null; slot: number; age: number;
  local: Vector; start: Vector; availableAt: number;
};

/** Every field ball has one stable ID and one reusable body, including while carried. */
export class FuelSystem {
  readonly records: Fuel[];
  readonly bodies: RAPIER.RigidBody[];
  time = 0;
  constructor(private world: RAPIER.World, private initial: Vec3[]) {
    this.records = initial.map((position, id) => {
      const body = world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(...position)
        .setLinearDamping(FUEL_LINEAR_DAMPING).setAngularDamping(0.5).setCanSleep(true).setCcdEnabled(true));
      world.createCollider(RAPIER.ColliderDesc.ball(FUEL_RADIUS).setMass(FUEL_MASS)
        .setFriction(0.6).setRestitution(FUEL_RESTITUTION).setCollisionGroups(CollisionGroups.fuel), body);
      body.sleep();
      return { id, body, state: 'loose', owner: null, slot: -1, age: 0, local: v3(), start: v3(), availableAt: 0 };
    });
    this.bodies = this.records.map(f => f.body);
  }
  ownedBy(owner: string) { return this.records.filter(f => f.owner === owner); }
  renderPosition(fuel: Fuel) { return fuel.state === 'hubTransit' ? fuel.local : fuel.body.translation(); }
  enterHub(fuel: Fuel, owner: string, position: Vector) {
    if (fuel.owner !== null || (fuel.state !== 'loose' && fuel.state !== 'airborne')) return false;
    fuel.state = 'hubTransit'; fuel.owner = owner; fuel.slot = -1; fuel.age = 0;
    fuel.start = { ...position }; fuel.local = { ...position }; fuel.body.setEnabled(false);
    return true;
  }
  capture(fuel: Fuel, owner: string, slot: number, start: Vector) {
    if (fuel.state !== 'loose' || fuel.owner !== null || fuel.availableAt > this.time) return false;
    fuel.state = 'transferring'; fuel.owner = owner; fuel.slot = slot; fuel.age = 0;
    fuel.start = { ...start }; fuel.local = { ...start }; fuel.body.setEnabled(false);
    return true;
  }
  release(fuel: Fuel, position: Vector, velocity: Vector, airborne = false) {
    if (fuel.owner === null) return false;
    fuel.body.setTranslation(position, false); fuel.body.setLinvel(velocity, false);
    fuel.body.setAngvel(v3(), false); fuel.body.setRotation({ x: 0, y: 0, z: 0, w: 1 }, false);
    fuel.body.collider(0).setCollisionGroups(CollisionGroups.fuel);
    fuel.body.collider(0).setRestitution(FUEL_RESTITUTION);
    fuel.body.setEnabled(true); fuel.body.wakeUp();
    fuel.state = airborne ? 'airborne' : 'loose'; fuel.owner = null; fuel.slot = -1; fuel.age = 0; fuel.availableAt = this.time + 0.4;
    this.world.propagateModifiedBodyPositionsToColliders();
    return true;
  }
  postStep(dt: number) {
    for (const f of this.records) {
      if (f.state !== 'airborne') continue;
      f.age += dt;
      // Contact ends the free-flight label; the physical body continues unchanged.
      let contact = false;
      this.world.contactPairsWith(f.body.collider(0), other => {
        this.world.contactPair(f.body.collider(0), other, manifold => { if (manifold.numContacts() > 0) contact = true; });
      });
      if (contact) f.state = 'loose';
    }
  }
  reset() {
    this.time = 0;
    this.records.forEach((f, i) => {
      f.state = 'loose'; f.owner = null; f.slot = -1; f.age = 0; f.availableAt = 0;
      f.local = v3(); f.start = v3(); f.body.setEnabled(true);
      f.body.collider(0).setCollisionGroups(CollisionGroups.fuel);
      f.body.collider(0).setRestitution(FUEL_RESTITUTION);
      f.body.setTranslation(v3(...this.initial[i]), false); f.body.setLinvel(v3(), false); f.body.setAngvel(v3(), false);
      f.body.setRotation({ x: 0, y: 0, z: 0, w: 1 }, false); f.body.sleep();
    });
  }
  get counts() {
    const counts = { total: this.records.length, loose: 0, transferring: 0, stored: 0, feeding: 0, airborne: 0, hubTransit: 0 };
    for (const f of this.records) counts[f.state]++;
    return counts;
  }
}
