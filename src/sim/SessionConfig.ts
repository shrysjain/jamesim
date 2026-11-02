import type { Alliance } from '../field/targets';

export type StartPosition = { x: number; z: number; yaw: number };
export function defaultStart(alliance: Alliance, spot: 'left' | 'center' | 'right' = 'left'): StartPosition {
  const sign = alliance === 'red' ? -1 : 1;
  return { x: sign * 6.1, z: sign * (spot === 'right' ? -2.1 : spot === 'center' ? -.288925 : 2.1), yaw: sign === 1 ? 0 : Math.PI };
}
/** Keep custom starts in the clear alliance staging area, away from hubs, walls and tower uprights. */
export function normalizeStart(start: StartPosition | undefined, alliance: Alliance, spot?: 'left' | 'center' | 'right'): StartPosition {
  const fallback = defaultStart(alliance, spot), sign = alliance === 'red' ? -1 : 1;
  if (!start || ![start.x, start.z, start.yaw].every(Number.isFinite)) return fallback;
  return { x: sign * Math.max(5.45, Math.min(6.9, sign * start.x)), z: Math.max(-3.3, Math.min(3.3, start.z)), yaw: Math.atan2(Math.sin(start.yaw), Math.cos(start.yaw)) };
}

/** The same alliance-relative driver axes as the match, without running field physics during setup. */
export function driveStart(position: StartPosition, input: { forward: number; strafe: number; turn: number }, alliance: Alliance, dt: number): StartPosition {
  const sign = alliance === 'red' ? -1 : 1, length = Math.max(1, Math.hypot(input.forward, input.strafe));
  return normalizeStart({ x: position.x - sign * input.forward / length * 2.4 * dt, z: position.z - sign * input.strafe / length * 2.4 * dt, yaw: position.yaw + input.turn * 2.2 * dt }, alliance);
}
