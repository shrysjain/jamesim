import RAPIER from '@dimforge/rapier3d-compat';
import type { SwerveChassis } from './SwerveChassis';
import type { Alliance } from '../field/targets';

/** Managed winch with a physical fixed joint to a moving tower support.
 * The attachment corridor and lift rates are gameplay approximations of the CAD tower. */
export class Climber {
  private anchor: RAPIER.RigidBody | null = null;
  private joint: RAPIER.ImpulseJoint | null = null;
  private lift = 0;
  private baseY = 0;
  constructor(private world: RAPIER.World, private chassis: SwerveChassis) {}
  get attached() { return this.joint !== null; }
  get level(): 0 | 1 | 2 | 3 {
    if (!this.attached || Math.abs(this.chassis.body.linvel().y) > 0.15) return 0;
    const bottom = this.chassis.body.translation().y + this.chassis.definition.bumperCenterY - 0.05715;
    return bottom > 1.143 ? 3 : bottom > 0.6858 ? 2 : bottom > 0.1 ? 1 : 0;
  }
  step(dt: number, raise: boolean, lower: boolean, enabled: boolean, alliance: Alliance) {
    if (!enabled || !this.chassis.definition.mechanisms.climb) return;
    const p = this.chassis.body.translation(), sign = alliance === 'blue' ? 1 : -1;
    if (!this.attached && raise && p.x * sign > 6.35 && p.x * sign < 7.05 && Math.abs(p.z + sign * 0.288925) < 0.32 && this.chassis.telemetry.speed < 0.2 && this.chassis.telemetry.grounded >= 3) {
      this.baseY = p.y; this.lift = 0; this.chassis.stopDrive();
      this.anchor = this.world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(p.x, p.y, p.z).setRotation(this.chassis.body.rotation()));
      const q = { x: 0, y: 0, z: 0, w: 1 }, zero = { x: 0, y: 0, z: 0 };
      this.joint = this.world.createImpulseJoint(RAPIER.JointData.fixed(zero, q, zero, q), this.anchor, this.chassis.body, true);
    }
    if (!this.anchor) return;
    this.lift = Math.max(0, Math.min(1.5, this.lift + (lower ? -1 : raise ? 1 : 0) * dt * 0.3));
    const a = this.anchor.translation();
    this.anchor.setNextKinematicTranslation({ x: a.x, y: this.baseY + this.lift, z: a.z });
    if (lower && this.lift === 0) this.reset();
  }
  reset() {
    if (this.anchor) this.world.removeRigidBody(this.anchor);
    this.anchor = null; this.joint = null; this.lift = 0;
  }
  get telemetry() { return { attached: this.attached, level: this.level, lift: this.lift }; }
}
