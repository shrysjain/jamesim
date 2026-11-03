import type {Vec3} from '../../../field/types';
import type {RobotDefinition,RobotCollider,HopperObstacle} from '../../types';
import {STANDARD_SWERVE,swerveModules} from '../../defaults';
import {hopperObstacleContact} from '../../hopperGeometry';
import {ICARUS_VISUAL} from './visual';
const DEG=Math.PI/180;
// Official 11.5in deployed minus.2in stowed rack travel, at21° below horizontal.
export const ICARUS_TRAVEL=(11.5-.2)*.0254*Math.cos(21*DEG);
export const ICARUS_RISE=(11.5-.2)*.0254*Math.sin(21*DEG);
// Measured coaxial feeder tower. Extend the contact box below the hopper floor
// so cargo cannot enter an impossible under-floor gap during compression.
export const ICARUS_ROOF={halfLength:.283845,halfWidth:.352425,centerY:.530225-.223,halfThickness:.003175/2,holeRadius:.22225};
// Four conservative cargo-only roof contact rails around an inscribed square in
// the measured circular turret opening. Outer intake cargo may rise above this
// localized roof; do not lower the entire hopper ceiling to the roof underside.
const hole=ICARUS_ROOF.holeRadius/Math.sqrt(2);
const roof:HopperObstacle[]=[-1,1].flatMap(sign=>[
 {center:[sign*(ICARUS_ROOF.halfLength+hole)/2,ICARUS_ROOF.centerY,0],halfExtents:[(ICARUS_ROOF.halfLength-hole)/2,ICARUS_ROOF.halfThickness,ICARUS_ROOF.halfWidth]} as HopperObstacle,
 {center:[0,ICARUS_ROOF.centerY,sign*(ICARUS_ROOF.halfWidth+hole)/2],halfExtents:[hole,ICARUS_ROOF.halfThickness,(ICARUS_ROOF.halfWidth-hole)/2]} as HopperObstacle,
]);
const obstacles:HopperObstacle[]=[{center:[0,.025,0],halfExtents:[.112,.225,.112]},...roof];
const seeds:Vec3[]=[];
for(let layer=0;layer<3;layer++)for(let row=0;row<7;row++)for(let column=0;column<5;column++){
 const p:Vec3=[-.48+row*.151+(column%2)*.0755+(layer%2)*.0755,-.005+layer*.151*Math.sqrt(2/3),(column-2)*.151*Math.sqrt(3)/2+(layer%2)*.151*Math.sqrt(3)/6];
 if(p[0]-.075>=-.585&&p[0]+.075<=.585-ICARUS_TRAVEL&&Math.abs(p[2])+.075<=.337&&obstacles.every(box=>hopperObstacleContact(p,box).distance>=.075))seeds.push(p);
}
// The first eight preload seeds must also fit the retracted starting volume.
seeds.sort((a,b)=>Math.abs(a[0])-Math.abs(b[0])||a[1]-b[1]||a[2]-b[2]);
/** Icarus2.0, official post-Championship AdvantageScope export. CAD/source-code
 * measurements are separated from simulator estimates in README and sources.json. */
export const ICARUS:RobotDefinition={
 ...STANDARD_SWERVE,id:'5000-icarus-2',teamNumber:'5000',name:'5000 Hammerheads · Icarus 2.0',
 model:'/assets/robots/5000-icarus-2/robot.glb',visual:ICARUS_VISUAL,
 summary:'Selectable intake side · dye rotor · moving-shot turret',
 mass:66,inertia:[4.0,7.2,4.3],length:.828875,width:.892375,bumperCenterY:.1038-.223,
 springLength:.1122,modules:swerveModules(.263525,.28575),
 drive:{maxSpeed:5.85,acceleration:10.0584,grip:1.05,brakeAcceleration:20.1168},
 intake:{pivot:[0,0,0],stowedAngle:0,stowTravel:ICARUS_TRAVEL,stowRise:ICARUS_RISE,manualRetraction:true,
  opposed:{pivot:[0,0,0],stowTravel:ICARUS_TRAVEL,stowRise:ICARUS_RISE}},
 hopper:{stowTravel:0,entry:[-.26,-.005,0],entryHalfWidth:.23,obstacles,
  volume:{frontX:-.585,backX:.585,halfWidth:.337,floorY:-.08,ceilingY:.322,frontTravel:ICARUS_TRAVEL,backTravel:ICARUS_TRAVEL}},
 hood:{pivot:[.0967212688,.2605249918,0],maxAngle:(47-6.24)*DEG},
 shooterGeometry:{pivot:[.0967212688,.2605249918,0],turretPivot:[0,.2883,0],drumRadius:.0381,guideLength:.09,
  turretRadiansPerSecond:5,minElevation:43*DEG,maxElevation:83.76*DEG,
  // Native neutral+X maps to simulator−Z. We bake−90° into only the turret;
  // the exported−250°..195° code stops are thus shifted+90° in this frame.
  turretLimits:[-160*DEG,285*DEG],passRange:12.6,movingAccuracy:.90,spread:{yaw:.028,elevation:.032,speed:.032,flyerChance:.08,backspin:28},
  feedPath:[[-.20,-.005,0],[0,-.005,0],[0,.10,0],[0,.22,0]]},
 cargoSlots:seeds,
 pickup:{minX:-.69,maxX:-.46,halfWidth:.30,mouthX:-.55,ejectX:-.71,
  opposed:{minX:.46,maxX:.69,halfWidth:.285,mouthX:.55,ejectX:.71}},
 mechanisms:{capacity:seeds.length,intakeRate:38,compress:true,lanes:[0],fireRate:12,feedSeconds:.28,turret:true,movingShots:true,simultaneousIntake:true,climb:false},
 colliders:[
  ...[-1,1].flatMap((sign):RobotCollider[]=>[
   {part:'chassis',center:[sign*(.828875/2-.0381),-.1192,0],halfExtents:[.0381,.0642,.892375/2],radius:.008},
   {part:'chassis',center:[0,-.1192,sign*(.892375/2-.0381)],halfExtents:[.3382,.0642,.0381],radius:.008},
   {part:'chassis',center:[0,.08,sign*.352],halfExtents:[.328,.245,.005]},
   {part:'intake',center:[-.35,.04,sign*.345],halfExtents:[.25,.125,.005]},
   {part:'opposedIntake',center:[.35,.04,sign*.324],halfExtents:[.25,.125,.005]},
  ]),
  {part:'chassis',center:[0,-.18,0],halfExtents:[.325,.004,.35],radius:.006},
  {part:'intake',center:[-.57,-.05,0],halfExtents:[.0254,.0254,.32],radius:.004},
  {part:'opposedIntake',center:[.57,-.05,0],halfExtents:[.0254,.0254,.30],radius:.004},
 ],
};
