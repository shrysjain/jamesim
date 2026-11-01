import { readFile, writeFile } from 'node:fs/promises';
import { Matrix4, Quaternion, Vector3 } from 'three';
const root='assets/source/robots/2910-reblitz/';
function parse(b){return JSON.parse(b.subarray(20,20+b.readUInt32LE(12)))}
const collecting=parse(await readFile(root+'2910-reblitz-collecting.glb')), starting=parse(await readFile(root+'2910-reblitz-starting.glb'));
function index(j){const map=new Map();function walk(i,m=new Matrix4()){const n=j.nodes[i], local=n.matrix?new Matrix4().fromArray(n.matrix):new Matrix4().compose(new Vector3(...(n.translation??[0,0,0])),new Quaternion(...(n.rotation??[0,0,0,1])),new Vector3(...(n.scale??[1,1,1])));const world=m.clone().multiply(local);if(n.mesh!==undefined){const a=j.accessors[j.meshes[n.mesh].primitives[0].attributes.POSITION];map.set(n.name,{world,center:new Vector3(...a.min.map((x,i)=>(x+a.max[i])/2)).applyMatrix4(world).toArray()})}for(const c of n.children??[])walk(c,world)}walk(0);return map}
const a=index(collecting),b=index(starting), frame=new Matrix4().set(0,1,0,0,0,0,1,-.21665,1,0,0,0,0,0,0,1), result={};
for(const name of ['61-01-02','61-01-04','42-01-27','42-01-28','32-01-08','32-01-09','22-03-01']){
 const x=a.get(name),y=b.get(name);if(!x||!y)throw new Error('Missing pose reference '+name);
 const delta=frame.clone().multiply(y.world).multiply(x.world.clone().invert()).multiply(frame.clone().invert()),q=new Quaternion(),p=new Vector3(),s=new Vector3();delta.decompose(p,q,s);
 result[name]={collectingCenter:x.center,startingCenter:y.center,translation:p.toArray(),rotation:q.toArray(),angleZ:Math.atan2(delta.elements[1],delta.elements[0]),matrix:delta.toArray()};
}
await writeFile('assets/intermediate/robots/2910-reblitz/pose-comparison.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
