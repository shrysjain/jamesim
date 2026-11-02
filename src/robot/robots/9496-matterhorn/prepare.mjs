/** Offline preparation of the owner's exact Matterhorn Onshape GLB upload. */
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {Document,NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {weld,prune,simplify,meshopt} from '@gltf-transform/functions';
import {MeshoptEncoder,MeshoptDecoder,MeshoptSimplifier} from 'meshoptimizer';
import {Matrix4,Matrix3,Vector3} from 'three';
const id='9496-matterhorn',folder=`assets/source/robots/${id}`;
const input=await readFile(`${folder}/upload/9496 LYNK.glb`);
const hash=b=>createHash('sha256').update(b).digest('hex');
if(hash(input)!=='e004d5b5288c78d4373953f311d5d2c47f766d346536f182c3b1494c6851a552')throw Error('Matterhorn upload hash changed');
await Promise.all([MeshoptEncoder.ready,MeshoptDecoder.ready,MeshoptSimplifier.ready]);
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.encoder':MeshoptEncoder,'meshopt.decoder':MeshoptDecoder});
const source=await io.readBinary(input),doc=new Document(),buffer=doc.createBuffer(),scene=doc.createScene('9496 LYNK · Matterhorn');
// Upload is Y-up, intake +Z. Normalize intake to −X and chassis reference .223 m.
const frame=new Matrix4().makeRotationY(-Math.PI/2).setPosition(0,-.223,0);
const runtime=p=>new Vector3(...p).applyMatrix4(frame).toArray();
const groups=new Map(),batches=new Map(),materials=new Map(),report={inputBytes:input.length,inputSha256:hash(input),kept:0,omitted:0,assemblies:{}};
function group(name,position=[0,0,0],parent=''){
 if(groups.has(name))return name;
 const n=doc.createNode(name).setTranslation(position).setExtras({mechanism:name});
 (parent?groups.get(parent):scene).addChild(n);groups.set(name,n);return name;
}
group('chassis');group('intake',runtime([0,.18415,.32385]));group('hopper');group('hood');group('shooter-drum',runtime([0,.454025,-.127]));
const hardware=/SHCS|BHCS|bolt|rivet|screw|washer|locknut|spacer|standoff|origin cube|bushing|bearing|PEM CLA|shaft collar/i;
const v=new Vector3();
function bounds(node){const lo=[Infinity,Infinity,Infinity],hi=[-Infinity,-Infinity,-Infinity],m=new Matrix4().fromArray(node.getWorldMatrix());
 for(const p of node.getMesh().listPrimitives()){const a=p.getAttribute('POSITION'),l=a.getMin([]),h=a.getMax([]);for(let i=0;i<8;i++){const q=new Vector3(...l.map((x,k)=>i&(1<<k)?h[k]:x)).applyMatrix4(m).toArray();for(let k=0;k<3;k++){lo[k]=Math.min(lo[k],q[k]);hi[k]=Math.max(hi[k],q[k]);}}}
 return{lo,hi,center:lo.map((x,k)=>(x+hi[k])/2),size:lo.map((x,k)=>hi[k]-x)};
}
function axle(name,parent,point){
 if(!groups.has(name)){const base=new Vector3(...groups.get(parent).getWorldTranslation());group(name,new Vector3(...runtime(point)).sub(base).toArray(),parent);}return name;
}
function material(original,bumper=false,panel=false){
 const rgba=original?.getBaseColorFactor()??[.55,.55,.55,1];
 const color=rgba.slice(0,3).map(x=>Math.round(x*20)/20),key=panel?'smoke-gray-hopper':bumper?'bumper':color.join(',')+','+Math.round(rgba[3]*10)/10;
 if(!materials.has(key)){
  const m=doc.createMaterial(key).setBaseColorFactor(bumper?[.03,.14,.52,1]:[...color,rgba[3]]).setMetallicFactor(bumper?0:.25).setRoughnessFactor(.72).setDoubleSided(true);
  if(panel)m.setBaseColorFactor([.12,.13,.14,.42]).setMetallicFactor(0).setRoughnessFactor(.38).setAlphaMode('BLEND');
  if(rgba[3]<.99)m.setAlphaMode('BLEND');materials.set(key,m);
 }return materials.get(key);
}
function append(parent,node,transform,bumper=false,panel=false){
 const origin=new Vector3(...groups.get(parent).getWorldTranslation()),nm=new Matrix3().getNormalMatrix(transform);
 for(const p of node.getMesh().listPrimitives()){
  const mat=material(p.getMaterial(),bumper,panel),key=parent+'/'+mat.getName();
  if(!batches.has(key))batches.set(key,{parent,mat,positions:[],normals:[],indices:[]});
  const b=batches.get(key),pos=p.getAttribute('POSITION'),normal=p.getAttribute('NORMAL'),base=b.positions.length/3;
  for(let i=0;i<pos.getCount();i++){v.fromArray(pos.getElement(i,[])).applyMatrix4(transform).sub(origin);b.positions.push(v.x,v.y,v.z);
   if(normal)v.fromArray(normal.getElement(i,[])).applyMatrix3(nm).normalize();else v.set(0,1,0);b.normals.push(v.x,v.y,v.z);}
  const indices=p.getIndices()?.getArray();if(indices)for(const i of indices)b.indices.push(base+i);else for(let i=0;i<pos.getCount();i++)b.indices.push(base+i);
 }
 report.assemblies[parent]=(report.assemblies[parent]??0)+1;
}
const moduleNames=new Set();
for(const node of source.getRoot().listNodes())if(node.getMesh()){
 const name=node.getName(),path=[];let a=node.getParentNode();while(a){path.unshift(a.getName());a=a.getParentNode();}
 if(hardware.test(name)){report.omitted++;continue;}
 const b=bounds(node),matrix=frame.clone().multiply(new Matrix4().fromArray(node.getWorldMatrix()));let parent='chassis';
 const module=path.find(p=>/^SDS MK5n </.test(p));
 if(module&&/SDS MK5 Molded Wheel|SDS MK5 Turret Assembly/.test(name)){
  const p=runtime(b.center),x=Math.sign(p[0])*.276225,z=Math.sign(p[2])*.276225,base=`module-${x>0?'front':'rear'}-${z<0?'left':'right'}`;
  const wheel=name==='SDS MK5 Molded Wheel';parent=group(base+(wheel?'-wheel':'-fork'),[x,.0508-.223,z]);moduleNames.add(base);
  // Both source assemblies have a 45° neutral steering export. Derive axle
  // direction from the actual wheel's short local axis, then unsteer once.
  const root=node.getParentNode()?.getParentNode();let wheelNode;
  root?.traverse(n=>{if(n.getName()==='SDS MK5 Molded Wheel'&&n.getMesh())wheelNode=n;});
  if(!wheelNode)throw Error(`Missing module wheel: ${base}`);
  const lo=[Infinity,Infinity,Infinity],hi=[-Infinity,-Infinity,-Infinity];
  for(const p of wheelNode.getMesh().listPrimitives()){const a=p.getAttribute('POSITION'),l=a.getMin([]),h=a.getMax([]);for(let k=0;k<3;k++){lo[k]=Math.min(lo[k],l[k]);hi[k]=Math.max(hi[k],h[k]);}}
  const sizes=hi.map((x,k)=>x-lo[k]);
  const axis=new Vector3().setComponent(sizes.indexOf(Math.min(...sizes)),1).transformDirection(frame.clone().multiply(new Matrix4().fromArray(wheelNode.getWorldMatrix())));
  const angle=Math.atan2(axis.x,axis.z),center=new Vector3(x,.0508-.223,z);
  matrix.premultiply(new Matrix4().makeTranslation(...center.toArray()).multiply(new Matrix4().makeRotationY(-angle)).multiply(new Matrix4().makeTranslation(...center.clone().negate().toArray())));
 }else if(path.includes('Intake V2 <1>')){
  const fixed=/^Part 40$|kicker stop|New Pivot Plate/i.test(name);parent=fixed?'chassis':'intake';
  if(!fixed&&/Aluminum Tube|Rounded Hex|24t HTD/.test(name)){
   const centers=[[.1619,.5763],[.2564,.5109],[.2135,.381]],i=centers.findIndex(([y,z])=>Math.hypot(b.center[1]-y,b.center[2]-z)<.012);
   if(i>=0)parent=axle(`intake-roller-${i}`,'intake',[0,...centers[i]]);
  }
 }else if(path.includes('Comp Hopper V5 <1>')&&(/Front Panel|Slot Panel/.test(name)||b.center[2]>.6))parent='hopper';
 else if(path.includes('Comp Shooter V2 <1>')&&(/Drum|Brass Flywheel|Rounded Hex/.test(name)&&Math.abs(b.center[1]-.454)<.015))parent='shooter-drum';
 else if(path.includes('Feeder V3 <1>')&&/Silicone tube|polly carb tube|Rounded Hex/.test(name)){
  const centers=[.2801,.3341,.3881],i=centers.findIndex(y=>Math.abs(b.center[1]-y)<.008);
  if(i>=0)parent=axle(`feeder-roller-${i}`,'chassis',[0,centers[i],-.1581]);
 }else if(path.includes('Hopper Floor V4 <1>')&&/Silicone tube|polly carb tube/.test(name)){
  const points=[[.1175,-.1264],[.1268,-.0732],[.1362,-.02],[.1456,.0331],[.155,.0863],[.1643,.1395],[.1737,.1926],[.1831,.2458],[.1925,.299]],i=points.findIndex(([y,z])=>Math.hypot(b.center[1]-y,b.center[2]-z)<.008);
  if(i>=0)parent=axle(`feeder-floor-${i}`,'chassis',[0,...points[i]]);
 }
 const panel=path.includes('Comp Hopper V5 <1>')&&/^(Fixed Panel|Slot Panel|Front Panel)(-Mirrored)?$/.test(name);
 append(parent,node,matrix,path.includes('Bumper <1>')&&/^(Corner|Part 6)$/.test(name),panel);report.kept++;
}
if(moduleNames.size!==4)throw Error('Expected four actual MK5n modules');
const accessor=(type,array)=>doc.createAccessor().setType(type).setArray(array).setBuffer(buffer);
for(const [name,b]of batches){
 const p=doc.createPrimitive().setAttribute('POSITION',accessor('VEC3',new Float32Array(b.positions))).setAttribute('NORMAL',accessor('VEC3',new Float32Array(b.normals))).setIndices(accessor('SCALAR',new Uint32Array(b.indices))).setMaterial(b.mat);
 groups.get(b.parent).addChild(doc.createNode(name).setMesh(doc.createMesh(name).addPrimitive(p)));
}
await doc.transform(weld(),simplify({simplifier:MeshoptSimplifier,ratio:.04,error:.005,lockBorder:true}),prune(),meshopt({encoder:MeshoptEncoder,level:'high'}));
const bytes=await io.writeBinary(doc);let triangles=0,primitives=0;
for(const n of doc.getRoot().listNodes())for(const p of n.getMesh()?.listPrimitives()??[]){triangles+=(p.getIndices()?.getCount()??p.getAttribute('POSITION').getCount())/3;primitives++;}
Object.assign(report,{bytes:bytes.length,triangles,primitives,sha256:hash(bytes)});
if(bytes.length>6*1024*1024||triangles>650000||primitives>160)throw Error(`Runtime budget exceeded: ${JSON.stringify(report)}`);
await mkdir(`public/assets/robots/${id}`,{recursive:true});await mkdir(`assets/robots/${id}`,{recursive:true});
await writeFile(`public/assets/robots/${id}/robot.glb`,bytes);
await writeFile(`${folder}/preparation-report.json`,JSON.stringify(report,null,2)+'\n');
await writeFile(`assets/robots/${id}/runtime.json`,JSON.stringify({schemaVersion:1,robotId:id,group:{name:'Team 9496 Matterhorn CAD',source:'https://cad.onshape.com/documents/768d7890bafac55a2a891aae/w/a270c1901be101ad8a97909d/e/df73afab8b112242516b9ad0',redistribution:{status:'pending',evidence:[]},files:[{path:`public/assets/robots/${id}/robot.glb`,bytes:bytes.length,sha256:hash(bytes)}]}},null,2)+'\n');
console.log(JSON.stringify(report));
