import type { RobotDefinition, RobotCollider } from '../../types';
import { STANDARD_SWERVE, swerveModules } from '../../defaults';
import { DARWIN_VISUAL } from './visual';
import { DARWIN_CARGO } from './cargo';

/** Official 6328-26C export, CAD frame normalized to shooter +X / intake −X.
 * CAD dimensions and team-code targets are separated from gameplay estimates in README.md. */
export const DARWIN: RobotDefinition = {
  ...STANDARD_SWERVE,
  id: '6328-darwin', teamNumber: '6328', name: '6328 Mechanical Advantage · Darwin',
  summary: 'Chassis aim · three shooting lanes · linked hopper',
  model: '/assets/robots/6328-darwin/robot.glb', visual: DARWIN_VISUAL,
  mass: 150 * .45359237, inertia: [3.4, 6, 3.7], length: .8763, width: .8509,
  bumperCenterY: -.12685,
  drive: { maxSpeed: 4.2, acceleration: 10, grip: 1.5 },
  // Actual exported wheel centers; the team code uses its own calibration axes/track dimensions.
  modules: swerveModules(.282575, .269875),
  intake: { pivot: [-.317, -.0375, 0], stowedAngle: -128.408204 * Math.PI / 180, manualRetraction: true },
  hopper: { stowTravel: .30847875377311085,
    // Normalized slot linkage from the team's CAD calibration, sampled at eighth-travel intervals.
    intakeCurve: [0, .1559289534, .3285020976, .5042641953, .6695113717, .8113595830, .9187491631, .9833071273, 1],
    volume: { frontX: -.65773, backX: .22, halfWidth: .310, floorY: -.035, floorSlope: -.10, ceilingY: .328, frontTravel: .30847875377311085 },
  },
  hood: { pivot: [.26392, .26307, 0], maxAngle: 31.2 * Math.PI / 180 },
  shooterGeometry: { pivot: [.26392, .26307, 0], drumRadius: .0508, guideLength: .155, turretRadiansPerSecond: 3,
    minElevation: 48.8 * Math.PI / 180, maxElevation: 80 * Math.PI / 180, passRange: 17.16, movingAccuracy: .93,
    spread: { yaw: .032, elevation: .034, speed: .035, flyerChance: .10, backspin: 32 } },
  // No climber is present in the supplied Darwin exports/published subsystem tree.
  mechanisms: { capacity: 48, intakeRate: 40, compress: true, lanes: [-.17, 0, .17], fireRate: 24,
    turret: false, movingShots: true, simultaneousIntake: true, climb: false },
  cargoSlots: DARWIN_CARGO,
  pickup: { minX: -.72, maxX: -.50, halfWidth: .29, mouthX: -.60, ejectX: -.74 },
  colliders: [
    ...[-1,1].flatMap((sign): RobotCollider[]=>[
      {part:'chassis',center:[sign*.3973,-.12685,0],halfExtents:[.033,.0555,.416],radius:.008},
      {part:'chassis',center:[0,-.12685,sign*.3842],halfExtents:[.365,.0555,.033],radius:.008},
      {part:'chassis',center:[.03,.09,sign*.321],halfExtents:[.29,.23,.004]},
      {part:'hopper',center:[-.34,.13,sign*.343],halfExtents:[.315,.15,.002]},
      {part:'intake',center:[-.47,-.025,sign*.322],halfExtents:[.16,.075,.006],radius:.004},
    ]),
    {part:'chassis',center:[0,-.182,0],halfExtents:[.33,.003,.32],radius:.006},
    {part:'chassis',center:[-.18,.329,0],halfExtents:[.16,.001,.305]},
    {part:'hopper',center:[-.657,.145,0],halfExtents:[.002,.14,.33]},
    {part:'intake',center:[-.603,-.069,0],halfExtents:[.027,.027,.31],radius:.004},
  ],
};
