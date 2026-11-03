import {beforeAll,describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'meshoptimizer';
import {RobotView} from '../../../view/RobotView';
import {STARTING_POSE} from '../../poses';
import type {SwerveChassis} from '../../../sim/SwerveChassis';
import type {RobotSimulation} from '../../../sim/RobotSimulation';
import {ICARUS as D,ICARUS_TRAVEL,ICARUS_RISE,ICARUS_ROOF} from './definition';
let source:THREE.Group;
beforeAll(async()=>{
 await MeshoptDecoder.ready;const b=readFileSync(`public${D.model}`);
 source=(await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'')).scene;
});
function fixture(){
 const model=source.clone(true),view=new RobotView();view['models'].set(D.id,model);view.group.add(model);view.setDefinition(D);
 const nodes=new Map<string,THREE.Object3D>();model.traverse(n=>{if(n.userData.mechanism)nodes.set(n.userData.mechanism,n);});
 const robot={definition:D,pose:{...STARTING_POSE},renderRotation:new THREE.Quaternion(),
  body:{translation:()=>({x:0,y:.223,z:0}),rotation:()=>({x:0,y:0,z:0,w:1})},
  modules:D.modules.map(m=>({...m,angle:0,speed:0,suspension:.1122}))} as unknown as SwerveChassis;
 const mechanisms={rollerAngle:0,kickerDeployment:0,
  shooter:{alliance:'blue',drumAngle:0,feederAngle:0,turretYaw:0,elevation:D.shooterGeometry.maxElevation},
  climber:{telemetry:{extension:0}}} as unknown as RobotSimulation;
 return{view,robot,mechanisms,nodes};
}
describe('Icarus actual CAD articulation',()=>{
 it('keeps only four plain source-sized padding bars so game labels cannot overlap embossed numbers',()=>{
  const padding:THREE.Mesh[]=[];source.traverse(n=>{if(n instanceof THREE.Mesh&&(n.userData.padding==='derived-plain'||n.parent?.userData.padding==='derived-plain'))padding.push(n);});
  expect(padding).toHaveLength(4);
  const box=new THREE.Box3();let triangles=0;
  for(const mesh of padding){box.union(new THREE.Box3().setFromObject(mesh,true));triangles+=(mesh.geometry.index?.count??0)/3;
   expect(mesh.geometry.getAttribute('color')).toBeUndefined();expect((mesh.material as THREE.Material).name).toBe('bumper');}
  expect(triangles).toBe(48);const size=box.getSize(new THREE.Vector3());
  // Meshopt vertex quantization can shift a face by tens of micrometers.
  expect(Math.abs(size.x-D.length)).toBeLessThan(.0001);expect(Math.abs(size.z-D.width)).toBeLessThan(.0001);expect(Math.abs(size.y-.128397)).toBeLessThan(.0001);
 });
 it('keeps the real roof and three exposed structural panels with planar face normals instead of dark diagonal smoothing',()=>{
  const panels:THREE.Mesh[]=[];source.traverse(n=>{if(n instanceof THREE.Mesh&&n.userData.flatCadNormals)panels.push(n);});
  expect(panels).toHaveLength(5);
  expect(panels.some(m=>m.userData.sourceSurface==='Upper Top Plate')).toBe(true);
  const roof=panels.find(m=>m.userData.sourceSurface==='top plate shell - FusionComponent')!;expect(roof).toBeDefined();
  source.updateMatrixWorld(true);const roofBox=new THREE.Box3().setFromObject(roof,true),roofSize=roofBox.getSize(new THREE.Vector3());
  expect(Math.abs(roofSize.x-2*ICARUS_ROOF.halfLength)).toBeLessThan(.0001);expect(Math.abs(roofSize.z-2*ICARUS_ROOF.halfWidth)).toBeLessThan(.0001);
  expect(Math.abs(roofBox.min.y-(ICARUS_ROOF.centerY-ICARUS_ROOF.halfThickness))).toBeLessThan(.0001);let checked=0;
  for(const mesh of panels){const geometry=mesh.geometry,position=geometry.getAttribute('position'),normal=geometry.getAttribute('normal'),index=geometry.index!;
   for(let i=0;i<index.count;i+=3){const ids=[0,1,2].map(k=>index.getX(i+k)),p=ids.map(j=>new THREE.Vector3().fromBufferAttribute(position,j));
    const cross=p[1].clone().sub(p[0]).cross(p[2].clone().sub(p[0]));if(cross.length()/2<.0001)continue;cross.normalize();
    for(const j of ids)expect(cross.dot(new THREE.Vector3().fromBufferAttribute(normal,j).normalize())).toBeGreaterThan(.995);checked++;
   }
  }
  expect(checked).toBeGreaterThan(100);
 });
 it('uses two distinct hood shafts without a cylinder orbiting about the other shaft',()=>{
  const {view,robot,mechanisms,nodes}=fixture();
  try{
   const upper=nodes.get('hood-roller-upper')!,lower=nodes.get('hood-roller-lower')!;
   expect(upper.position.distanceTo(lower.position)).toBeGreaterThan(.035);
   view.update(robot,0,mechanisms);view.group.updateMatrixWorld(true);
   const pivots=[upper,lower].map(n=>n.getWorldPosition(new THREE.Vector3()));
   for(const angle of [0,.4,Math.PI/2,Math.PI,Math.PI*1.5,Math.PI*2]){
    mechanisms.shooter.drumAngle=angle;view.update(robot,0,mechanisms);view.group.updateMatrixWorld(true);
    for(const [i,node] of [upper,lower].entries()){
     expect(node.getWorldPosition(new THREE.Vector3()).distanceTo(pivots[i])).toBeLessThan(1e-12);
     const center=new THREE.Box3().setFromObject(node,true).getCenter(new THREE.Vector3());
     expect(Math.hypot(center.x-pivots[i].x,center.y-pivots[i].y)).toBeLessThan(.007);
    }
   }
  }finally{view.dispose();}
 });
 it('moves each real carriage from its own independent physics pose',()=>{
  const {view,robot,mechanisms,nodes}=fixture();
  try{for(const extension of [1,.6,0,1]){
   robot.pose.intake=extension;robot.pose.opposedIntake=1-extension;view.update(robot,0,mechanisms);
   expect(nodes.get('intake')!.position.x).toBeCloseTo(ICARUS_TRAVEL*(1-extension));
   expect(nodes.get('opposed-intake')!.position.x).toBeCloseTo(-ICARUS_TRAVEL*extension);
   expect(nodes.get('intake')!.position.y).toBeCloseTo(ICARUS_RISE*(1-extension));
   expect(nodes.get('opposed-intake')!.position.y).toBeCloseTo(ICARUS_RISE*extension);
  }}finally{view.dispose();}
 });
 it('keeps all swerve axles fixed to the chassis despite the ground-support solution',()=>{
  const {view,robot,mechanisms,nodes}=fixture();
  const roots=D.modules.flatMap(m=>[nodes.get(m.name+'-wheel')!,nodes.get(m.name+'-fork')!]);
  const original=roots.map(n=>n.position.clone());
  try{for(const support of [0,.04,.1122,.25]){
   for(const m of robot.modules){m.suspension=support;m.angle=.7;m.speed=2;}
   view.update(robot,1/120,mechanisms);
   roots.forEach((n,i)=>expect(n.position.distanceTo(original[i])).toBeLessThan(1e-12));
  }}finally{view.dispose();}
 });
});
