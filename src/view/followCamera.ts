import type { Vector3 } from 'three';

export const FOLLOW_FRAME = { back: 4.8, height: 2.9, ahead: .5, targetHeight: .25 } as const;

/** Keep the follow view's pitch and distance fixed after smoothing its motion. */
export function stabilizeFollowCamera(position: Vector3, target: Vector3, forward: Vector3) {
  let x = position.x - target.x, z = position.z - target.z;
  let length = Math.hypot(x, z);
  if (length < 1e-8) {
    x = -forward.x; z = -forward.z; length = Math.hypot(x, z);
  }
  const scale = (FOLLOW_FRAME.back + FOLLOW_FRAME.ahead) / length;
  position.set(target.x + x * scale, target.y + FOLLOW_FRAME.height - FOLLOW_FRAME.targetHeight, target.z + z * scale);
}
