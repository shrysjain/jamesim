import type { RobotDefinition, RobotPose } from './types';
import type { Vec3 } from '../field/types';
export type NetPanel = [Vec3, Vec3, Vec3, Vec3];
/** Fitted fabric panels follow the same moving bounds as owned cargo. */
export function retainingNetPanels(definition: RobotDefinition, pose: RobotPose): NetPanel[] {
  const net = definition.hopper.retainingNet, v = definition.hopper.volume;
  if (!net || !v) return [];
  const front = v.frontX + v.frontTravel * (1 - (definition.hopper.intakeCurve ? pose.hopper : pose.intake));
  const back = v.backX - (v.backTravel ?? 0) * (1 - (pose.opposedIntake ?? 0));
  const top = v.ceilingY + (v.ceilingTravel ?? 0) * (pose.climber ?? 0), bottom = net.bottomY, w = v.halfWidth;
  const spans = net.centerGap ? [[front, Math.min(back, net.centerGap[0])], [Math.max(front, net.centerGap[1]), back]] : [[front, back]];
  const panels: NetPanel[] = [];
  for (const [a, b] of spans) {
    if (b - a < .001) continue;
    panels.push([[a, top, -w], [b, top, -w], [b, top, w], [a, top, w]]);
    for (const z of [-w, w]) panels.push([[a, bottom, z], [b, bottom, z], [b, top, z], [a, top, z]]);
    if (a === front) panels.push([[a, bottom, -w], [a, bottom, w], [a, top, w], [a, top, -w]]);
    if (b === back) panels.push([[b, bottom, -w], [b, bottom, w], [b, top, w], [b, top, -w]]);
  }
  return panels;
}
