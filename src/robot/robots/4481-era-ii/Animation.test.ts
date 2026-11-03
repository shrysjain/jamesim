import {beforeAll,describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'meshoptimizer';
import {RobotView} from '../../../view/RobotView';
import {STARTING_POSE} from '../../poses';
import type {SwerveChassis} from '../../../sim/SwerveChassis';
import type {RobotSimulation} from '../../../sim/RobotSimulation';
import {FieldSimulation} from '../../../sim/FieldSimulation';
import {DEFAULT_MATCH} from '../../../sim/MatchRules';
import {ERA_II as D} from './definition';
let source:THREE.Group;
beforeAll(async()=>{
 await MeshoptDecoder.ready;const bytes=readFileSync(`public${D.model}`);
 source=(await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'')).scene;
});
function fixture(){
 const model=source.clone(true),view=new RobotView();view['models'].set(D.id,model);view.group.add(model);view.setDefinition(D);
 const nodes=new Map<string,THREE.Object3D>();model.traverse(n=>{if(n.userData.mechanism)nodes.set(n.userData.mechanism,n);});
 const robot={definition:D,pose:{...STARTING_POSE},renderRotation:new THREE.Quaternion(),
  body:{translation:()=>({x:0,y:.223,z:0}),rotation:()=>({x:0,y:0,z:0,w:1})},
  modules:D.modules.map(m=>({...m,angle:0,speed:0}))} as unknown as SwerveChassis;
 const mechanisms={rollerAngle:0,indexerAngle:0,kickerDeployment:0,
  shooter:{alliance:'blue',drumAngle:0,feederAngle:0,turretYaw:0,elevation:D.shooterGeometry.maxElevation},
  climber:{telemetry:{extension:0}}} as unknown as RobotSimulation;
 return{view,robot,mechanisms,nodes};
}
describe('Rembrandts prepared-CAD animation',()=>{
 it('spins each opposed feeder cylinder on its own shaft instead of orbiting vertically',()=>{
  const {view,robot,mechanisms,nodes}=fixture();
  try{for(const angle of [0,.4,Math.PI/2,Math.PI,Math.PI*1.5,Math.PI*2]){
   mechanisms.shooter.feederAngle=angle;view.update(robot,0,mechanisms);view.group.updateMatrixWorld(true);
   for(const [id,z]of [['feeder-roller-1',-.0526],['feeder-roller-2',-.2474]] as const){
    const node=nodes.get(id)!,axis=node.getWorldPosition(new THREE.Vector3());
    expect(axis.x).toBeCloseTo(.15,5);expect(axis.y).toBeCloseTo(.3511,5);expect(axis.z).toBeCloseTo(z,5);
    const center=new THREE.Box3().setFromObject(node,true).getCenter(new THREE.Vector3());
    expect(center.distanceTo(axis)).toBeLessThan(.003);
   }
   expect(nodes.get('feeder-roller-1')!.rotation.x).toBeCloseTo(angle);
   expect(nodes.get('feeder-roller-2')!.rotation.x).toBeCloseTo(-angle);
  }}finally{view.dispose();}
 });
 it('folds the real kicker inside the bumper in preview and resets a previously deployed view',()=>{
  const {view,robot,mechanisms,nodes}=fixture(),kicker=nodes.get('passive-kicker')!;
  const folded=()=>{
   view.preview(D,'blue');view.group.updateMatrixWorld(true);
   expect(kicker.rotation.z).toBe(0);
   const bounds=new THREE.Box3().setFromObject(kicker,true);
   expect(bounds.min.x).toBeGreaterThan(-D.length/2);expect(bounds.max.x).toBeLessThan(D.length/2);
   expect(bounds.max.y).toBeLessThan(.55);
  };
  try{folded();robot.pose.intake=1;mechanisms.kickerDeployment=1;view.update(robot,0,mechanisms);view.group.updateMatrixWorld(true);
   expect(kicker.rotation.z).toBeCloseTo(D.visual.kicker!.radians);
   expect(new THREE.Box3().setFromObject(kicker,true).min.x).toBeLessThan(-D.length/2);
   folded();
  }finally{view.dispose();}
 });
 it('keeps the kicker folded before play, deploys after start and folds again on restart',async()=>{
  const s=await FieldSimulation.create({boxes:[{element:'floor',center:[0,-.1,0],halfExtents:[25,.1,25]}],meshes:[]},[],true);
  const config={...DEFAULT_MATCH,robot:'4481-era-ii' as const,preloads:0};
  try{s.startSession(config,true);const r=s.robotController!;expect(r.kickerDeployment).toBe(0);
   s.setRunning(false);for(let i=0;i<60;i++)s.update(1/120);expect(r.kickerDeployment).toBe(0);
   s.setRunning(true);for(let i=0;i<60;i++)s.update(1/120);expect(r.kickerDeployment).toBe(1);
   s.startSession(config,true);expect(r.kickerDeployment).toBe(0);
  }finally{s.dispose();}
 });
 it('keeps the deployed lower bar fixed while the carriage slides in and out',()=>{
  const {view,robot,mechanisms,nodes}=fixture(),bar=nodes.get('passive-kicker')!,carriage=nodes.get('intake')!;
  mechanisms.kickerDeployment=1;
  robot.pose.intake=1;view.update(robot,0,mechanisms);view.group.updateMatrixWorld(true);
  const position=bar.getWorldPosition(new THREE.Vector3()),rotation=bar.getWorldQuaternion(new THREE.Quaternion());
  const bounds=new THREE.Box3().setFromObject(bar,true),start=carriage.getWorldPosition(new THREE.Vector3());
  try{for(const extension of [1,.7,.35,0,1]){
   robot.pose.intake=extension;view.update(robot,0,mechanisms);view.group.updateMatrixWorld(true);
   expect(bar.getWorldPosition(new THREE.Vector3()).distanceTo(position)).toBeLessThan(1e-12);
   expect(bar.getWorldQuaternion(new THREE.Quaternion()).angleTo(rotation)).toBeLessThan(1e-7);
   const current=new THREE.Box3().setFromObject(bar,true);
   expect(current.min.distanceTo(bounds.min)).toBeLessThan(1e-12);expect(current.max.distanceTo(bounds.max)).toBeLessThan(1e-12);
   expect(carriage.getWorldPosition(new THREE.Vector3()).x-start.x).toBeCloseTo(.26*(1-extension),6);
  }}finally{view.dispose();}
 });
});
