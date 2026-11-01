import RAPIER from '@dimforge/rapier3d-compat';
import type { SwerveChassis } from './SwerveChassis';
import { sub, unrotate, v3 } from './vector';
import type { Alliance } from '../field/targets';

/** Managed winch with a physical fixed joint to a moving tower support.
 * The attachment corridor and lift rates are gameplay approximations of the CAD tower. */
export class Climber {
  private anchor: RAPIER.RigidBody | null = null;
  private joint: RAPIER.ImpulseJoint | null = null;
  private lift = 0;
  private baseY = 0;
  private status = 'Approach your tower';
  constructor(private world: RAPIER.World, private chassis: SwerveChassis, private fieldElements: Map<number, string>) {}
  get attached() { return this.joint !== null; }
  get level(): 0 | 1 | 2 | 3 {
    if (!this.attached) return 0;
    // A tower attachment cannot earn points while another field element supports the chassis.
    let illegalContact = false;
    for (let i = 0; i < this.chassis.body.numColliders(); i++) this.world.contactPairsWith(this.chassis.body.collider(i), collider => {
      const element = this.fieldElements.get(collider.handle);
      if (!element || element.startsWith('tower')) return;
      this.world.contactPair(this.chassis.body.collider(i), collider, manifold => {
        for (let contact = 0; contact < manifold.numContacts(); contact++) if (manifold.contactDist(contact) <= .001) illegalContact = true;
      });
    });
    if (illegalContact) return 0;
    const bottom = this.chassis.body.translation().y + this.chassis.definition.bumperCenterY - 0.05715;
    const wheelBottom = this.chassis.body.translation().y + this.chassis.definition.mountY - Math.max(...this.chassis.modules.map(m => m.suspension)) - this.chassis.definition.wheelRadius;
    // Covers must clear the upper edge of the 1.66 in outside-diameter rung.
    return bottom > 1.143 + .021082 ? 3 : bottom > .6858 + .021082 ? 2 : wheelBottom > .01 ? 1 : 0;
  }
  step(dt: number, raise: boolean, lower: boolean, enabled: boolean, alliance: Alliance) {
    if (!this.chassis.definition.mechanisms.climb) { this.status = 'This robot has no climber'; return; }
    if (!enabled) { this.status = 'Disabled for assessment'; return; }
    const p = this.chassis.body.translation(), sign = alliance === 'blue' ? 1 : -1;
    if (!this.attached) {
      if (!(p.x * sign > 6.35 && p.x * sign < 7.05 && Math.abs(p.z + sign * 0.288925) < .32)) { this.status = 'Approach your own tower'; return; }
      if (this.chassis.telemetry.speed >= .2 || this.chassis.telemetry.grounded < 3) { this.status = 'Stop before attaching'; return; }
      if (Math.cos(this.chassis.telemetry.heading) * sign < .85) { this.status = 'Turn toward the tower'; return; }
      this.status = 'Hold Climb to attach';
      if (!raise) return;
      const origin = v3(p.x, .6858, p.z);
      const hit = this.world.castRay(new RAPIER.Ray(origin, v3(sign, 0, 0)), 1.5, true,
        RAPIER.QueryFilterFlags.EXCLUDE_DYNAMIC, undefined, undefined, this.chassis.body,
        collider => this.fieldElements.get(collider.handle)?.startsWith('tower') ?? false);
      if (!hit) { this.status = 'No rung within reach'; return; }
      const attachment = v3(origin.x + sign * hit.timeOfImpact, origin.y, origin.z);
      this.baseY = attachment.y; this.lift = 0; this.chassis.stopDrive();
      this.anchor = this.world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(attachment.x, attachment.y, attachment.z).setRotation(this.chassis.body.rotation()));
      const q = { x: 0, y: 0, z: 0, w: 1 }, zero = { x: 0, y: 0, z: 0 };
      this.joint = this.world.createImpulseJoint(RAPIER.JointData.fixed(zero, q, unrotate(sub(attachment, p), this.chassis.body.rotation()), q), this.anchor, this.chassis.body, true);
    }
    if (!this.anchor) return;
    const maxLift = this.chassis.definition.climb?.maxLift ?? 1.14, rate = this.chassis.definition.climb?.rate ?? .3;
    this.status = lower ? 'Lowering' : raise && this.lift < maxLift ? 'Raising' : 'Holding';
    // Keep the managed support below the top of the 1.831 m tower uprights.
    this.lift = Math.max(0, Math.min(maxLift, this.lift + (lower ? -1 : raise ? 1 : 0) * dt * rate));
    const a = this.anchor.translation();
    this.anchor.setNextKinematicTranslation({ x: a.x, y: this.baseY + this.lift, z: a.z });
    if (lower && this.lift === 0) { this.reset(); this.status = 'Lowered and released'; }
  }
  reset() {
    if (this.anchor) this.world.removeRigidBody(this.anchor);
    this.anchor = null; this.joint = null; this.lift = 0; this.status = 'Approach your own tower';
  }
  get telemetry() { return { status: this.status, attached: this.attached, level: this.level, lift: this.lift, attachment: this.anchor ? { ...this.anchor.translation() } : null }; }
}
