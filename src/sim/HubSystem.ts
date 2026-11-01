import RAPIER from '@dimforge/rapier3d-compat';
import { HUBS, HUB_MOUTH_Y, insideHubMouth } from '../field/hubs';
import type { HubDefinition } from '../field/hubs';
import type { Alliance } from '../field/targets';
import type { ProcessedFuel } from './MatchRules';
import { FuelSystem, FUEL_RADIUS } from './FuelSystem';
import { sub, lerp, v3 } from './vector';
import type { Vector } from './vector';

export const HUB_RETURN = { processingSeconds: 0.35, transitSeconds: 0.65, outletInterval: 0.125, seed: 2026 };
export type HubTelemetry = {
  enabled: boolean; blue: { hits: number; processed: number; returned: number; queued: number; blocked: number };
  red: { hits: number; processed: number; returned: number; queued: number; blocked: number }; inTransit: number; returned: number;
};
type HubState = { definition: HubDefinition; hits: number; processed: number; returned: number; availableAt: number[]; blocked: boolean[] };
type Transit = { sequence: number; id: number; hub: HubState; enteredAt: number; preferredLane: number; processed: boolean };

/** Physical downward entries, managed internal transit, and collision-checked physical returns.
 * Entry/processing counters stay separate; match rules consume timestamped sensor events. */
export class HubSystem {
  private hubs: HubState[] = HUBS.map(definition => ({ definition, hits: 0, processed: 0, returned: 0, availableAt: [0, 0, 0, 0], blocked: [false, false, false, false] }));
  private previous: (Vector | null)[];
  private transit: Transit[] = [];
  private seed = HUB_RETURN.seed;
  private sequence = 0;
  readonly processedEvents: ProcessedFuel[] = [];
  readonly events: { id: number; alliance: Alliance; time: number; position: Vector }[] = [];

  constructor(private world: RAPIER.World, readonly fuel: FuelSystem, readonly enabled: boolean, private onProcessed?: (event: ProcessedFuel) => void) {
    this.previous = fuel.records.map(() => null);
  }
  private random() {
    this.seed = (Math.imul(this.seed, 1664525) + 1013904223) >>> 0;
    return this.seed / 4294967296;
  }
  beforeStep() {
    if (!this.enabled) return;
    for (const f of this.fuel.records) {
      if (f.owner !== null || !f.body.isEnabled()) { this.previous[f.id] = null; continue; }
      const p = f.body.translation(), previous = this.previous[f.id];
      if (previous) { previous.x = p.x; previous.y = p.y; previous.z = p.z; }
      else this.previous[f.id] = { ...p };
    }
  }
  postStep(dt: number) {
    if (!this.enabled) return;
    for (const h of this.hubs) h.blocked.fill(false);
    for (const f of this.fuel.records) {
      const before = this.previous[f.id];
      if (!before || f.owner !== null || !f.body.isEnabled() || before.y <= HUB_MOUTH_Y) continue;
      const after = f.body.translation();
      if (after.y > HUB_MOUTH_Y || after.y >= before.y) continue;
      const fraction = (before.y - HUB_MOUTH_Y) / (before.y - after.y);
      const crossing = lerp(before, after, fraction);
      const hub = this.hubs.find(h => insideHubMouth(crossing, h.definition, FUEL_RADIUS));
      if (!hub || !this.fuel.enterHub(f, hub.definition.owner, after)) continue;
      const enteredAt = this.fuel.time - dt + fraction * dt;
      hub.hits++;
      this.transit.push({ sequence: ++this.sequence, id: f.id, hub, enteredAt, preferredLane: Math.floor(this.random() * 4), processed: false });
      this.events.push({ id: f.id, alliance: hub.definition.alliance, time: enteredAt, position: crossing });
      if (this.events.length > 64) this.events.shift();
    }
    // Assess in timestamp order, including the last auto arrivals before teleop resolves its winner.
    const due = this.transit.filter(item => !item.processed && this.fuel.time >= item.enteredAt + HUB_RETURN.processingSeconds)
      .sort((a, b) => a.enteredAt - b.enteredAt || a.sequence - b.sequence);
    for (const item of due) {
      item.processed = true; item.hub.processed++;
      const event: ProcessedFuel = { sequence: item.sequence, id: item.id, alliance: item.hub.definition.alliance,
        enteredAt: item.enteredAt, processedAt: item.enteredAt + HUB_RETURN.processingSeconds };
      this.processedEvents.push(event); if (this.processedEvents.length > 64) this.processedEvents.shift();
      this.onProcessed?.(event);
    }
    const waiting: Transit[] = [];
    for (const item of this.transit) {
      const f = this.fuel.records[item.id], { definition } = item.hub;
      const age = this.fuel.time - item.enteredAt, t = Math.min(1, age / HUB_RETURN.transitSeconds);
      const outlet = definition.outlets[item.preferredLane].inside;
      // Queued balls stay inside the covered hub, including when an exit is blocked.
      const end = v3(definition.center.x + (outlet.x - definition.center.x) * 0.4, 1.1, outlet.z * 0.6);
      const control = v3(definition.center.x, 1.15, end.z * 0.5);
      f.age = age; f.local = lerp(lerp(f.start, control, t), lerp(control, end, t), t);
      if (age < HUB_RETURN.transitSeconds || !this.tryReturn(item)) waiting.push(item);
    }
    this.transit = waiting;
  }
  private tryReturn(item: Transit) {
    const hub = item.hub, q = { x: 0, y: 0, z: 0, w: 1 }, shape = new RAPIER.Ball(FUEL_RADIUS + 0.003);
    for (let offset = 0; offset < 4; offset++) {
      const lane = (item.preferredLane + offset) % 4;
      if (hub.blocked[lane] || this.fuel.time + 1e-9 < hub.availableAt[lane]) continue;
      const outlet = hub.definition.outlets[lane];
      // The full route out of the exit is checked against field, robots and loose balls.
      const hit = this.world.castShape(outlet.inside, q, sub(outlet.position, outlet.inside), shape, 0, 1, true,
        RAPIER.QueryFilterFlags.EXCLUDE_SENSORS);
      let overlap = false;
      this.world.intersectionsWithShape(outlet.position, q, shape, () => { overlap = true; return false; }, RAPIER.QueryFilterFlags.EXCLUDE_SENSORS);
      if (hit || overlap) { hub.blocked[lane] = true; continue; }
      const speed = 1.5 + this.random() * 0.7;
      const velocity = v3(outlet.direction.x * speed, 0.05 + this.random() * 0.15, outlet.direction.z * speed + (this.random() - 0.5) * 0.25);
      if (!this.fuel.release(this.fuel.records[item.id], outlet.position, velocity)) return false;
      hub.returned++; hub.availableAt[lane] = this.fuel.time + HUB_RETURN.outletInterval;
      return true;
    }
    return false;
  }
  reset() {
    this.transit.length = this.events.length = this.processedEvents.length = 0; this.previous.fill(null); this.seed = HUB_RETURN.seed; this.sequence = 0;
    for (const h of this.hubs) { h.hits = h.processed = h.returned = 0; h.availableAt.fill(0); h.blocked.fill(false); }
  }
  get telemetry(): HubTelemetry {
    const read = (h: HubState) => ({ hits: h.hits, processed: h.processed, returned: h.returned, queued: this.transit.filter(t => t.hub === h).length, blocked: h.blocked.filter(Boolean).length });
    return { enabled: this.enabled, blue: read(this.hubs[0]), red: read(this.hubs[1]), inTransit: this.transit.length, returned: this.hubs.reduce((sum, h) => sum + h.returned, 0) };
  }
}
