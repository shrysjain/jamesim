import RAPIER from '@dimforge/rapier3d-compat';
import type { SwerveChassis } from './SwerveChassis';
import { add, rotate, v3 } from './vector';
import type { Alliance } from '../field/targets';

/** Deploy a hook, approach the actual own-alliance rung, then retract to winch up.
 * C toggles deployment everywhere; tower support only exists after a geometry-backed capture. */
export class Climber {
  private anchor: RAPIER.RigidBody | null = null;
  private lift = 0;
  private baseY = 0;
  private raised = false;
  private extension = 0;
  private held = false;
  private toggles = 0;
  private releaseAtBottom = false;
  private captureArmed = false;
  private status = 'Climber down';
  constructor(private world: RAPIER.World, private chassis: SwerveChassis, private fieldElements: Map<number, string>) {}
  get attached() { return this.anchor !== null; }
  requestToggle() { this.toggles++; }
  clearInput() { this.toggles = 0; this.held = false; }
  get level(): 0 | 1 | 2 | 3 {
    if (!this.attached) return 0;
    let supported = false;
    for (let i = 0; i < this.chassis.body.numColliders(); i++) this.world.contactPairsWith(this.chassis.body.collider(i), collider => {
      const element = this.fieldElements.get(collider.handle);
      if (!element || element.startsWith('tower')) return;
      this.world.contactPair(this.chassis.body.collider(i), collider, manifold => {
        for (let c = 0; c < manifold.numContacts(); c++) if (manifold.contactDist(c) <= .001) supported = true;
      });
    });
    const bottom = this.chassis.body.translation().y + this.chassis.definition.bumperCenterY - .05715;
    const wheelBottom = this.chassis.body.translation().y + this.chassis.definition.mountY - Math.max(...this.chassis.modules.map(m => m.suspension)) - this.chassis.definition.wheelRadius;
    return supported ? 0 : bottom > 1.164082 ? 3 : bottom > .706882 ? 2 : wheelBottom > .01 ? 1 : 0;
  }
  step(dt: number, pressed: boolean, enabled: boolean, alliance: Alliance) {
    const config = this.chassis.definition.climb;
    if (!config) { this.clearInput(); return; }
    if (!enabled) { this.clearInput(); this.status = 'Disabled for assessment'; return; }
    const toggle = this.toggles + Number(pressed && !this.held);
    this.toggles = 0; this.held = pressed;
    if (toggle % 2) { this.raised = !this.raised; if (this.raised) this.captureArmed = true; if (this.attached && this.raised) this.releaseAtBottom = true; }
    const target = this.raised ? 1 : 0;
    const extensionStep = this.attached ? dt * config.rate / config.travel : dt / config.deploySeconds;
    this.extension += Math.max(-extensionStep, Math.min(extensionStep, target - this.extension));
    this.status = this.raised ? 'Climber up · approach your tower' : 'Climber down';
    const p = this.chassis.body.translation(), sign = alliance === 'blue' ? 1 : -1;
    // Kepler approaches along the rung. Limestone faces it with either outer
    // hook over a rung end, matching the team's A/E approach outside the uprights.
    const hooks = (config.hookOffsetsZ ?? [0]).map(z => add(p, rotate(v3(config.hook[0], config.hook[1] + this.extension * config.travel, config.hook[2] + z), this.chassis.body.rotation())));
    const rungX = sign * 7.208488, rungZ = -sign * .288925;
    const hook = hooks.find(h => Math.abs(h.x - rungX) < .035 && Math.abs(h.z - rungZ) < .5969 && h.y > .73);
    if (!this.attached && this.captureArmed && this.raised && this.extension > .85
      && hook
      && Math.abs(config.approachAxis === 'x' ? Math.cos(this.chassis.telemetry.heading) : Math.sin(this.chassis.telemetry.heading)) > .97
      && this.chassis.telemetry.speed < .5 && this.chassis.telemetry.grounded >= 3) {
      const hit = this.world.castRay(new RAPIER.Ray(v3(rungX, .8, hook.z), v3(0, -1, 0)), .16, true,
        RAPIER.QueryFilterFlags.EXCLUDE_DYNAMIC, undefined, undefined, this.chassis.body,
        c => this.fieldElements.get(c.handle)?.startsWith('tower') ?? false);
      if (hit && Math.abs(.8 - hit.timeOfImpact - .706882) < .01) {
        this.baseY = p.y; this.lift = 0; this.chassis.stopDrive();
        this.chassis.body.resetForces(true); this.chassis.body.resetTorques(true);
        this.anchor = this.world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(p.x, p.y, p.z).setRotation(this.chassis.body.rotation()));
        const q = { x: 0, y: 0, z: 0, w: 1 };
        this.world.createImpulseJoint(RAPIER.JointData.fixed(v3(), q, v3(), q), this.anchor, this.chassis.body, true);
      }
    }
    if (!this.anchor) return;
    this.status = this.raised ? this.lift > .001 ? 'Lowering' : 'Hook engaged · toggle to climb' : this.lift < config.maxLift - .001 ? 'Climbing' : 'Hanging · level 1';
    this.lift = Math.max(0, Math.min(config.maxLift, .6858 - this.baseY - config.hook[1] - this.extension * config.travel));
    const a = this.anchor.translation();
    this.anchor.setNextKinematicTranslation({ x: a.x, y: this.baseY + this.lift, z: a.z });
    // A fresh deployment from a hanging position lowers and releases, rather than immediately recapturing.
    if (this.raised && this.lift === 0 && this.extension > .99 && this.releaseAtBottom) this.detach();
  }
  private detach() { if (this.anchor) this.world.removeRigidBody(this.anchor); this.anchor = null; this.lift = 0; this.releaseAtBottom = false; this.captureArmed = false; }
  reset() { this.detach(); this.clearInput(); this.raised = false; this.extension = 0; this.status = 'Climber down'; }
  get telemetry() { return { status: this.status, attached: this.attached, level: this.level, lift: this.lift, extension: this.extension, raised: this.raised, attachment: this.anchor ? { ...this.anchor.translation() } : null }; }
}
