import RAPIER from '@dimforge/rapier3d-compat';
import type { FuelSystem } from './FuelSystem';
import type { Alliance } from '../field/targets';
import { v3 } from './vector';

/** Optional finite outpost stock, drawn from existing supply; no new IDs or bodies. */
export class HumanPlayer {
  private nextAt = 0;
  delivered = 0;
  blocked = false;
  constructor(private world: RAPIER.World, private fuel: FuelSystem) {}
  reset() { this.nextAt = 0; this.delivered = 0; this.blocked = false; }
  stock() {
    for (const alliance of ['blue', 'red'] as const) {
      const sign = alliance === 'blue' ? 1 : -1;
      const candidates = this.fuel.records.filter(f => f.state === 'loose' && Math.abs(f.body.translation().x) < 1.1).slice(0, 12);
      for (const f of candidates) if (this.fuel.capture(f, `human-${alliance}`, f.id, v3())) {
        f.state = 'stored'; f.body.setTranslation(v3(sign * 8.8, 0.3, -sign * 3.45), false);
      }
    }
  }
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
