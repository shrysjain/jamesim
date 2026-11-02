import { hopperObstacleContact } from '../../hopperGeometry';
import { packedCargo } from '../../cargoPacking';
import type { RobotDefinition } from '../../types';
/** Measured exterior skins and conservative local contact envelopes. The cone
 * and tower occupy real volume; full-size fuel must pack around/above them. */
export const ERA_HOPPER = {
  stowTravel: 0,
  volume: { frontX: -.61, backX: .345, halfWidth: .343, floorY: -.082, ceilingY: .327,
    frontTravel: .26, rim: { front: .255, back: .327, sides: .327 } },
  entry: [-.25,.035,0],
  entryHalfWidth: .23,
  indexer: { center: [-.038,-.0951,0], radius: .208, angularSpeed: 5, friction: .45 },
  obstacles: [
    // Continue fixed bases below the floor so contacts cannot push a ball into
    // a nonexistent sub-floor gap under the cone or tower. Top faces are unchanged.
    { center: [-.038,-.019,0], halfExtents: [.081,.141,.081] },
    { center: [.15,.0215,-.15], halfExtents: [.16,.1815,.094] },
    // Inclined rear funnel: inner face X ≈ .82Y + .086 over the left rear quarter.
    { center: [.4446,-.0347,.1475], halfExtents: [.30,.22,.1475], angle: Math.atan2(.634,-.773) },
  ],
} satisfies RobotDefinition['hopper'];
export const ERA_CARGO = packedCargo(ERA_HOPPER.volume,[0,0,0,0]).filter(p =>
  ERA_HOPPER.obstacles.every(b => hopperObstacleContact(p,b).distance >= .0755));
