import type {Vec3} from '../../../field/types';
import type {RobotDefinition,RobotCollider,HopperFloorPoint,HopperVolume,HopperObstacle} from '../../types';
import {hopperFloorContact,hopperObstacleContact} from '../../hopperGeometry';
import {STANDARD_SWERVE,swerveModules} from '../../defaults';
import {TIM_VISUAL} from './visual';
import {TIM_CARGO} from './cargo';
const DEG=Math.PI/180;
export const TIM_TRAVEL=.34417,TIM_RISE=.057;
// Actual CAD roller-cover tops. The moving pickup rises with the slide; the
// fixed bed descends into the rear trough, rather than a flat imaginary floor.
export const TIM_FLOOR_PROFILE:HopperFloorPoint[]=[
 {x:-.59587,y:-.0356,part:'intake'},
 {x:-.28565,y:-.0395},{x:-.22765,y:-.0606},{x:-.16965,y:-.0818},
 {x:-.1116,y:-.1029},{x:-.05355,y:-.1240},{x:.03257,y:-.1344},{x:.11443,y:-.1056},
];
export const TIM_VOLUME:HopperVolume={frontX:-.65,backX:.10,halfWidth:.3725,floorY:-.1344,
 // Nominal full-pile envelope only: the finite .47m rim remains open above it.
 ceilingY:.545,frontTravel:TIM_TRAVEL,rim:{front:.47,back:.515,sides:.47}};
// Fixed drum and swept42..74deg hood envelope from the complete CAD. Leave its
// lower feed entrance open while protecting the real upper rear machinery.
export const TIM_HEAD:HopperObstacle={center:[.11463,.366425,-.02187],halfExtents:[.17693,.171035,.32128]};
// Original P330 is a U-shaped 0.79mm cap. These conservative strips follow
// its measured rounded opening and move with the intake, rather than becoming
// an invisible full lid or letting upper cargo pass through the lip.
const rimBox=(x0:number,x1:number,z0:number,z1:number):HopperObstacle=>({part:'intake',
 center:[(x0+x1)/2,.47285,(z0+z1)/2],halfExtents:[(x1-x0)/2,.0005,(z1-z0)/2]});
export const TIM_RIM_CONTACTS:HopperObstacle[]=[rimBox(-.649,-.547,-.376,.376),
 ...[-1,1].flatMap(sign=>[
  rimBox(-.547,-.166,sign<0?-.376:.351,sign<0?-.351:.376),
  ...[[.27,.30,-.533],[.30,.33,-.507],[.33,.351,-.453]].map(([z0,z1,x1])=>
   rimBox(-.547,x1,sign<0?-z1:z0,sign<0?-z0:z1)),
 ])];
const seeds=TIM_CARGO,radius=.075;
// Prefer points that clear BOTH the deployed bed and the raised retracted pickup
// for the legal eight-fuel preload. Stored cargo then moves through the solver.
const closedFloor=TIM_FLOOR_PROFILE.map(p=>({x:p.x+(p.part==='intake'?TIM_TRAVEL:0),y:p.y+(p.part==='intake'?TIM_RISE:0)})).sort((a,b)=>a.x-b.x);
const preloadFits=(p:Vec3)=>p[0]-radius>=TIM_VOLUME.frontX+TIM_TRAVEL&&hopperFloorContact(p,TIM_VOLUME,closedFloor).distance>=radius&&
 TIM_RIM_CONTACTS.every(box=>hopperObstacleContact(p,{...box,center:[box.center[0]+TIM_TRAVEL,box.center[1]+TIM_RISE,box.center[2]]}).distance>=radius);
seeds.sort((a,b)=>Number(preloadFits(b))-Number(preloadFits(a))||Math.abs(a[0]+.12)-Math.abs(b[0]+.12)||a[1]-b[1]);
export const SIMBOT_TIM:RobotDefinition={
 ...STANDARD_SWERVE,id:'1114-simbot-tim',teamNumber:'1114',name:'1114 Simbotics · Simbot Tim',summary:'Wide fixed drum · sliding intake · tall hopper',
 model:'/assets/robots/1114-simbot-tim/robot.glb',visual:TIM_VISUAL,
 mass:64,inertia:[4.4,6.8,4.1],length:.76,width:.92,bumperCenterY:.102-.223,springLength:.1122,
 modules:swerveModules(.24765,.3175),drive:{maxSpeed:4.02,acceleration:9.5,brakeAcceleration:19,grip:1.05},
 intake:{pivot:[0,0,0],stowedAngle:0,stowTravel:TIM_TRAVEL,stowRise:TIM_RISE,manualRetraction:true,shootingMinExtension:6.4/13.55},
 hopper:{stowTravel:0,entry:[-.34,.045,0],entryHalfWidth:.25,
  volume:TIM_VOLUME,floorProfile:TIM_FLOOR_PROFILE,obstacles:[TIM_HEAD,...TIM_RIM_CONTACTS],
  physics:{restitution:.22,friction:.15,linearDamping:.35}},
 hood:{pivot:[.01757,.3485,0],maxAngle:-32*DEG},
 shooterGeometry:{pivot:[.01757,.3485,0],drumRadius:.0381,guideLength:.09,turretRadiansPerSecond:1,minElevation:42*DEG,maxElevation:74*DEG,
  yawOffset:Math.PI,passRange:12.6,movingAccuracy:.86,spread:{yaw:.032,elevation:.035,speed:.038,flyerChance:.10,backspin:28},
  feedAcrossLanes:true,feedPath:[[-.20,.013,0],[-.05,-.045,0],[.0326,-.052,0],[.10,.08,0],[.10,.28,0]]},
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
