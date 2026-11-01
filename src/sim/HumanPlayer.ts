import RAPIER from '@dimforge/rapier3d-compat';
import type { FuelSystem } from './FuelSystem';
import type { Alliance } from '../field/targets';
import { v3 } from './vector';

/** Optional finite outpost stock, drawn from existing supply; no new IDs or bodies. */
export class HumanPlayer {
  private nextAt = 0;
  delivered = 0;
  blocked = false;
  private enabled = false;
  recovered = 0;
  constructor(private world: RAPIER.World, private fuel: FuelSystem) {}
  reset() { this.enabled = false; this.recovered = 0; this.nextAt = 0; this.delivered = 0; this.blocked = false; }
  stock() {
    this.enabled = true;
    for (const alliance of ['blue', 'red'] as const) {
      const sign = alliance === 'blue' ? 1 : -1;
      const candidates = this.fuel.records.filter(f => f.state === 'loose' && Math.abs(f.body.translation().x) < 1.1).slice(0, 12);
      for (const f of candidates) if (this.fuel.capture(f, `human-${alliance}`, f.id, v3())) {
        f.state = 'stored'; f.body.setTranslation(v3(sign * 8.8, 0.3, -sign * 3.45), false);
      }
    }
  }
  collectReturns() {
    if (!this.enabled) return;
    for (const f of this.fuel.records) {
      if (f.state !== 'loose' || f.owner !== null) continue;
      const p = f.body.translation(), sign = p.x > 0 ? 1 : -1;
      if (Math.abs(p.x) < 8.3 || Math.abs(p.x) > 9.2 || Math.abs(p.z + sign * 3.45) > .55 || p.y < -.1 || p.y > .5) continue;
      const alliance = sign === 1 ? 'blue' : 'red';
      if (this.fuel.capture(f, `human-${alliance}`, f.id, p)) { f.state = 'stored'; this.recovered++; }
    }
  }
  get telemetry() { return { blue: this.fuel.ownedBy('human-blue').length, red: this.fuel.ownedBy('human-red').length, delivered: this.delivered, recovered: this.recovered, blocked: this.blocked }; }
  step(requested: boolean, enabled: boolean, alliance: Alliance) {
    this.blocked = false;
    if (!requested || !enabled || this.fuel.time < this.nextAt) return;
    const f = this.fuel.ownedBy(`human-${alliance}`)[0]; if (!f) return;
    const sign = alliance === 'blue' ? 1 : -1, position = v3(sign * 8.05, 0.2, -sign * 3.45);
    this.world.intersectionsWithShape(position, { x: 0, y: 0, z: 0, w: 1 }, new RAPIER.Ball(0.08), () => { this.blocked = true; return false; });
    if (this.blocked) return;
    if (this.fuel.release(f, position, v3(-sign * 1.5, 0.3, 0))) { this.delivered++; this.nextAt = this.fuel.time + 0.5; }
  }
}
