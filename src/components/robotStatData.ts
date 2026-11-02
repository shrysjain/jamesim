import type { RobotDefinition } from '../robot/types';
/** Display fallback matching the simulator baseline; robot-owned drive tuning takes precedence. */
const DEFAULT_DRIVE = { maxSpeed: 16.7 * .3048, acceleration: 33 * .3048, grip: 1.05 };

export type RobotStat = { label: string; value: string; amount: number | null; maximum: number; note?: string };
const feet = (meters: number) => meters / .3048;

/** Display configured gameplay values, never a measured real-world ranking. */
export function robotStats(robot: RobotDefinition): RobotStat[] {
  const drive = robot.drive ?? DEFAULT_DRIVE;
  const moving = robot.mechanisms.movingShots;
  const accuracy = robot.shooterGeometry.movingAccuracy;
  return [
    { label: 'Speed', value: `${feet(drive.maxSpeed).toFixed(1)} ft/s`, amount: feet(drive.maxSpeed), maximum: 20 },
    { label: 'Acceleration', value: `${feet(drive.acceleration).toFixed(1)} ft/s²`, amount: feet(drive.acceleration), maximum: 40, note: 'Wheel command; traction and load affect acceleration.' },
    { label: 'Push', value: `~${Math.round(robot.mass * 9.81 * drive.grip / 4.4482216152605)} lbf`, amount: robot.mass * 9.81 * drive.grip / 4.4482216152605, maximum: 200, note: 'Estimated empty-robot traction.' },
    { label: 'Fire rate', value: `${robot.mechanisms.fireRate} bps`, amount: robot.mechanisms.fireRate, maximum: 40, note: 'Nominal rate; aim, spin-up and feeding affect throughput.' },
    { label: 'Intake rate', value: `${robot.mechanisms.intakeRate} bps`, amount: robot.mechanisms.intakeRate, maximum: 60 },
    { label: 'Capacity', value: `${robot.mechanisms.capacity} fuel`, amount: robot.mechanisms.capacity, maximum: 80 },
    { label: 'Shoot on move', value: moving ? accuracy === undefined ? 'Enabled' : `${Math.round(accuracy * 100)}/100 est.` : 'Stationary', amount: moving && accuracy !== undefined ? accuracy * 100 : null, maximum: 100, note: 'Estimated hub-shot motion quality, not a hit percentage. Speed and turn limits still apply.' },
  ];
}

export function robotFeatures(robot: RobotDefinition): string[] {
  return [
    robot.mechanisms.turret ? 'Turret' : 'Chassis aim',
    robot.hood.maxAngle > 0 ? 'Adjustable hood' : 'Fixed hood',
    `${robot.mechanisms.lanes.length} ${robot.mechanisms.lanes.length === 1 ? 'lane' : 'lanes'}`,
    ...(robot.mechanisms.movingShots ? ['Shoots on move'] : []),
    ...(robot.mechanisms.movingPasses && !robot.mechanisms.movingShots ? ['Passes on move'] : []),
    ...(robot.mechanisms.simultaneousIntake ? ['Intake + shoot'] : []),
    ...(robot.mechanisms.climb ? ['L1 climb'] : []),
  ];
}

export function robotIdentity(robot: RobotDefinition) {
  const name = robot.name.replace(new RegExp(`^${robot.teamNumber}\\s*`), '');
  const [team, machine] = name.split(' · ');
  return { team, machine };
}
