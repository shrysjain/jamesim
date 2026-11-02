import type {RobotDefinition,RobotCollider} from '../../types';
import {STANDARD_SWERVE,swerveModules} from '../../defaults';
import {MATTERHORN_VISUAL} from './visual';
import {MATTERHORN_CARGO} from './cargo';

/** Exact owner-supplied release CAD. Mass, rates, fixed launch fit and wall
 * contacts are gameplay estimates; measured dimensions and sources are in README. */
export const MATTERHORN: RobotDefinition = {
  ...STANDARD_SWERVE,
  id:'9496-matterhorn',teamNumber:'9496',name:'9496 LYNK · Matterhorn',
  summary:'Fixed hood · passive intake · three-wide shooter',
  model:'/assets/robots/9496-matterhorn/robot.glb',visual:MATTERHORN_VISUAL,
  mass:66,inertia:[3.5,6,3.8],length:.83185,width:.8382,bumperCenterY:.1003-.223,
  drive:{maxSpeed:14.4*.3048,acceleration:10,grip:1.05},modules:swerveModules(.276225,.276225),
  // Team confirms a passive drop: no powered retraction or climb is advertised.
  intake:{pivot:[-.32385,.18415-.223,0],stowedAngle:-115*Math.PI/180},
  // Keep stored spheres ahead of the shooter housing, including its side plates.
  // Finite CAD panel tops: fuel can roll over the rim and return to field physics.
  hopper:{stowTravel:.3048,entry:[-.45,.24,0],volume:{frontX:-.618,backX:-.006,halfWidth:.307,
    floorY:-.0705,floorSlope:-.1764,ceilingY:.44,frontTravel:.3048,
    rim:{front:.308,back:.34,sides:.31}}},
  hood:{pivot:[.127,.454025-.223,0],maxAngle:0},
  shooterGeometry:{pivot:[.127,.454025-.223,0],drumRadius:.0508,guideLength:.155,turretRadiansPerSecond:3,
    yawOffset:Math.PI,fixedElevation:56*Math.PI/180,passRange:9,movingAccuracy:.90,
    spread:{yaw:.030,elevation:.035,speed:.035,flyerChance:.10,backspin:30},
    // Fit full-size fuel inside the curved rear guide. Contact at the roller
    // nip approximates soft-fuel compression, not a rigid CAD contact solver.
    feedPath:[[.17,-.02,0],[.224,.2801-.223,0],[.224,.3881-.223,0],[.208,.523-.223,0]]},
  mechanisms:{capacity:MATTERHORN_CARGO.length,intakeRate:35,compress:false,lanes:[-.17,0,.17],fireRate:18,
    turret:false,movingShots:true,simultaneousIntake:true,climb:false},
  cargoSlots:MATTERHORN_CARGO,
  pickup:{minX:-.66,maxX:-.49,halfWidth:.29,mouthX:-.58,ejectX:-.70},
  colliders:[
    ...[-1,1].flatMap((sign):RobotCollider[]=>[
      {part:'chassis',center:[sign*.376,-.1227,0],halfExtents:[.04,.0617,.4191],radius:.008},
      {part:'chassis',center:[0,-.1227,sign*.3791],halfExtents:[.336,.0617,.04],radius:.008},
      {part:'chassis',center:[-.121,.1211,sign*.3251],halfExtents:[.2189,.1909,.009]},
      {part:'hopper',center:[-.4332,.158,sign*.335],halfExtents:[.20775,.1524,.00635]},
      {part:'intake',center:[-.4952,.014,sign*.3209],halfExtents:[.12725,.095,.0032],radius:.002},
    ]),
    {part:'chassis',center:[0,-.182,0],halfExtents:[.33,.003,.33],radius:.004},
    {part:'hopper',center:[-.6334,.1568,0],halfExtents:[.00955,.1512,.3393]},
    {part:'intake',center:[-.5763,-.0611,0],halfExtents:[.0191,.0191,.2856],radius:.004},
    {part:'chassis',center:[.127,.231025,0],halfExtents:[.0508,.0508,.26274],radius:.015},
  ],
};
