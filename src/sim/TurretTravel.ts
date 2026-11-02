/** Select an equivalent target inside physical cable stops. Crossing a stop
 * reverses through the allowed range instead of wrapping through the cable. */
export function turretTravelError(current: number, wrappedError: number, limits?: readonly [number, number]): number {
  if (!limits) return wrappedError;
  const target = current + wrappedError, turn = 2 * Math.PI;
  const first = Math.ceil((limits[0] - target) / turn), last = Math.floor((limits[1] - target) / turn);
  if (first <= last) {
    const k = Math.max(first, Math.min(last, Math.round((current - target) / turn)));
    return target + k * turn - current;
  }
  // A narrower-than-360° turret may have an unreachable target. Approach the
  // nearest physical end; the existing yaw-readiness gate prevents firing.
  const distance = (stop: number) => Math.abs(Math.atan2(Math.sin(target-stop), Math.cos(target-stop)));
  return (distance(limits[0]) < distance(limits[1]) ? limits[0] : limits[1]) - current;
}
