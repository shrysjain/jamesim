import { HUB_CENTER_X } from './targets';
import type { Alliance } from './targets';
import { v3 } from '../sim/vector';
import type { Vector } from '../sim/vector';

// GE-26329 funnel top in the retained official CAD. These are practice entry gates.
export const HUB_MOUTH_Y = 1.8288;
export const HUB_APOTHEM = 0.52628;
export const HUBS = (['blue', 'red'] as const).map(alliance => {
  const sign = alliance === 'blue' ? 1 : -1;
  const center = v3(sign * HUB_CENTER_X, HUB_MOUTH_Y, 0);
  // GE-264 counter opening and flared deflectors face neutral. Handoff is beyond
  // the counter rollers, at sphere-clear points in the central/flared outer lanes.
  const outlets = [-0.48, -0.13375, 0.13375, 0.48].map(z => ({
    inside: v3(sign * (HUB_CENTER_X - (Math.abs(z) > 0.4 ? 0.65 : 0.55)), 0.87, z),
    position: v3(sign * (HUB_CENTER_X - 0.795), 0.87, z),
    direction: v3(-sign, 0, z * 1.6),
  }));
  return { alliance, owner: `hub-${alliance}`, center, outlets };
});
export type HubDefinition = typeof HUBS[number];
export const hubFor = (alliance: Alliance) => HUBS.find(h => h.alliance === alliance)!;

/** Shrink all six half-planes by the sphere radius, rather than using a bounding box. */
export function insideHubMouth(position: Vector, hub: HubDefinition, radius: number) {
  const x = Math.abs(position.x - hub.center.x), z = Math.abs(position.z - hub.center.z);
  const a = HUB_APOTHEM - radius - 0.002;
  return z <= a && Math.sqrt(3) / 2 * x + z * 0.5 <= a;
}
export function mouthVertices(hub: HubDefinition, radius = 0) {
  const a = HUB_APOTHEM - radius - 0.002, r = a * 2 / Math.sqrt(3);
  return Array.from({ length: 6 }, (_, i) => v3(hub.center.x + Math.cos(i * Math.PI / 3) * r, HUB_MOUTH_Y, Math.sin(i * Math.PI / 3) * r));
}
