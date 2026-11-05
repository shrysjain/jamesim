import { FIELD_HALF_LENGTH } from '../field/targets';
import type { Alliance } from '../field/targets';

export const PLAYER_CAMERAS = [
  { id: 'follow', label: 'Follow', help: 'The standard view follows your robot.' },
  { id: 'station', label: 'Driver station', help: 'A fixed eye-level view from behind your alliance wall.' },
  { id: 'pov', label: 'Robot POV', help: 'Look forward with the chassis. Driving remains alliance-relative.' },
  { id: 'fly', label: 'Freecam', help: 'WASD move, Q/E down/up, Shift faster. Hold the right mouse button to look. Robot controls are suspended in this view.' },
] as const;
export type PlayerCamera = typeof PLAYER_CAMERAS[number]['id'];

/** Fitted player viewpoints, independent of simulation or the inspection camera. */
export function playerCameraFrame(view: 'station' | 'pov', position: { x: number; y: number; z: number }, heading: number, alliance: Alliance, eyeHeight: number) {
  if (view === 'station') {
    const side = alliance === 'red' ? -1 : 1;
    return { position: [side * (FIELD_HALF_LENGTH + .65), 1.7, side * 2.1] as const, target: [0, .65, 0] as const };
  }
  const forward = [Math.cos(heading), 0, -Math.sin(heading)] as const;
  const eye = [position.x, position.y + eyeHeight, position.z] as const;
  return { position: eye, target: [eye[0] + forward[0] * 5, eye[1], eye[2] + forward[2] * 5] as const };
}
