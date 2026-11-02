import type { ShotSpread } from '../robot/types';

export const DEFAULT_SHOT_SPREAD: ShotSpread = { yaw: .026, elevation: .030, speed: .030, flyerChance: .08, backspin: 30 };
const clamp = (v: number, low: number, high: number) => Math.max(low, Math.min(high, v));

/** Launch uncertainty only. Misses, rim bounces and later flight remain physical.
 * Ratings scale motion sensitivity; they are not a forced hit/miss percentage. */
export function sampleShotScatter(profile: ShotSpread, movingAccuracy: number, speed: number, turnRate: number, random: () => number) {
  const normal = () => clamp(Math.sqrt(-2 * Math.log(Math.max(1e-9, random()))) * Math.cos(2 * Math.PI * random()), -3, 3);
  const motion = 1 + (1 - clamp(movingAccuracy, .05, 1)) * 6 * Math.min(2, Math.max(0, speed) / 1.5) + Math.min(.6, Math.abs(turnRate) * .12);
  // Occasional imperfect feeding/deformed fuel broadens the tails without
  // selecting a miss or changing a released projectile's trajectory.
  const tail = random() < profile.flyerChance ? 3.5 : 1;
  return {
    yaw: clamp(normal() * profile.yaw * motion * tail, -.16, .16),
    elevation: clamp(normal() * profile.elevation * motion * tail, -.16, .16),
    speedFactor: 1 + clamp(normal() * profile.speed * motion * Math.sqrt(tail), -.15, .15),
    spin: { x: profile.backspin * .12 * normal(), y: profile.backspin * .12 * normal(), z: profile.backspin * clamp(1 + .25 * normal(), .25, 1.75) },
  };
}
