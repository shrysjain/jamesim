import type {Vec3} from '../../../field/types';
import type {RobotDefinition,RobotCollider} from '../../types';
import {STANDARD_SWERVE,swerveModules} from '../../defaults';
import {TIM_VISUAL} from './visual';
const DEG=Math.PI/180;
export const TIM_TRAVEL=.34417,TIM_RISE=.057;
// CAD-fitted full-size FCC seeds. The sliding polycarbonate shell occupies the rear of the
// hopper; its low extending mouth is deliberately not filled to roof height.
const seeds:Vec3[]=[];
for(let layer=0;layer<4;layer++)for(let row=0;row<5;row++)for(let col=0;col<5;col++){
 const p:Vec3=[-.53+row*.151+(col%2)*.0755+(layer%2)*.0755,-.005+layer*.151*Math.sqrt(2/3),(col-2)*.151*Math.sqrt(3)/2+((layer%2)-.5)*.151*Math.sqrt(3)/6];
 if(p[0]+.075>.10||Math.abs(p[2])+.075>.351||p[1]+.075>.515||(p[1]>.16&&p[0]<-.24))continue;
 seeds.push(p);
}
// Prefer the central compact volume for the legal eight-fuel starting preload.
seeds.sort((a,b)=>Math.abs(a[0]+.12)-Math.abs(b[0]+.12)||a[1]-b[1]);
export const SIMBOT_TIM:RobotDefinition={
 ...STANDARD_SWERVE,id:'1114-simbot-tim',teamNumber:'1114',name:'1114 Simbotics · Simbot Tim',summary:'Wide fixed drum · sliding intake · tall hopper',
 model:'/assets/robots/1114-simbot-tim/robot.glb',visual:TIM_VISUAL,
 mass:64,inertia:[4.4,6.8,4.1],length:.76,width:.92,bumperCenterY:.102-.223,springLength:.1122,
 modules:swerveModules(.24765,.3175),drive:{maxSpeed:4.02,acceleration:9.5,brakeAcceleration:19,grip:1.05},
 intake:{pivot:[0,0,0],stowedAngle:0,stowTravel:TIM_TRAVEL,stowRise:TIM_RISE,manualRetraction:true,shootingMinExtension:6.4/13.55},
 hopper:{stowTravel:0,entry:[-.34,-.005,0],entryHalfWidth:.25,
  volume:{frontX:-.65,backX:.10,halfWidth:.351,floorY:-.08,ceilingY:.47,frontTravel:TIM_TRAVEL,rim:{front:.47,back:.515,sides:.47}}},
 hood:{pivot:[.01757,.3485,0],maxAngle:-32*DEG},
 shooterGeometry:{pivot:[.01757,.3485,0],drumRadius:.0381,guideLength:.09,turretRadiansPerSecond:1,minElevation:42*DEG,maxElevation:74*DEG,
  yawOffset:Math.PI,passRange:12.6,movingAccuracy:.86,spread:{yaw:.032,elevation:.035,speed:.038,flyerChance:.10,backspin:28},
  feedAcrossLanes:true,feedPath:[[-.20,-.015,0],[.10,.015,0],[.12,.18,0],[.10,.28,0]]},
 cargoSlots:seeds,pickup:{minX:-.68,maxX:-.45,halfWidth:.32,mouthX:-.59,ejectX:-.70},
 mechanisms:{capacity:seeds.length,intakeRate:38,compress:true,lanes:[-.151,0,.151],fireRate:18,feedSeconds:.28,turret:false,movingShots:false,simultaneousIntake:true,climb:false},
 colliders:[
  ...[-1,1].flatMap((sign):RobotCollider[]=>[
   {part:'chassis',center:[sign*(.76/2-.03175),.102-.223,0],halfExtents:[.03175,.0635,.92/2],radius:.008},
   {part:'chassis',center:[0,.102-.223,sign*(.92/2-.03175)],halfExtents:[.3165,.0635,.03175],radius:.008},
   {part:'intake',center:[-.34343,.25692,sign*.375],halfExtents:[.31274,.21592,.001]},
   {part:'intake',center:[-.34,.06,sign*.365],halfExtents:[.30,.09,.004]},
  ]),
  {part:'chassis',center:[0,-.18,0],halfExtents:[.305,.004,.38],radius:.006},
  {part:'chassis',center:[.22,.12,0],halfExtents:[.07,.30,.23],radius:.008},
  {part:'intake',center:[-.59587,.2182-.223-TIM_RISE,0],halfExtents:[.0254,.0254,.32],radius:.004},
 ],
};
