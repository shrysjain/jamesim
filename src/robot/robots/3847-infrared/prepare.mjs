/** Offline preparation of Spectrum's official 2026 Final Machine CAD exports. */
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {Document,NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {weld,prune,simplify,meshopt} from '@gltf-transform/functions';
import {MeshoptEncoder,MeshoptDecoder,MeshoptSimplifier} from 'meshoptimizer';
import {Matrix4,Matrix3,Vector3} from 'three';
const id='3847-infrared',folder=`assets/source/robots/${id}`;
const hash=b=>createHash('sha256').update(b).digest('hex');
const sources=JSON.parse(await readFile(`assets/robots/${id}/sources.json`,'utf8'));
await Promise.all([MeshoptEncoder.ready,MeshoptDecoder.ready,MeshoptSimplifier.ready]);
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.encoder':MeshoptEncoder,'meshopt.decoder':MeshoptDecoder});
const doc=new Document(),buffer=doc.createBuffer(),scene=doc.createScene('3847 Spectrum · Infrared FM');
// FM exports are Y-up, intake +Z. Normalize intake to −X and chassis reference .223 m.
const frame=new Matrix4().makeRotationY(-Math.PI/2).setPosition(0,-.223,0);
const runtime=p=>new Vector3(...p).applyMatrix4(frame).toArray();
const groups=new Map(),batches=new Map(),materials=new Map(),report={inputs:{},kept:0,omitted:0,duplicates:0,assemblies:{},polycarbonate:[]};
function group(name,position=[0,0,0],parent=''){
 if(groups.has(name))return name;
 const n=doc.createNode(name).setTranslation(position).setExtras({mechanism:name});
 (parent?groups.get(parent):scene).addChild(n);groups.set(name,n);return name;
}
group('chassis');group('intake');group('hood',runtime([0,.4886198,-.2794]));group('shooter-drum',runtime([0,.4888,-.2723]));
const hardware=/SHCS|BHCS|FHCS|bolt|rivet|screw|washer|locknut|spacer|standoff|origin cube| OC$|bushing|bearing|PEM CLA|shaft collar/i;
const v=new Vector3();
function bounds(node){const lo=[Infinity,Infinity,Infinity],hi=[-Infinity,-Infinity,-Infinity],m=new Matrix4().fromArray(node.getWorldMatrix());
 for(const p of node.getMesh().listPrimitives()){const a=p.getAttribute('POSITION'),l=a.getMin([]),h=a.getMax([]);for(let i=0;i<8;i++){const q=new Vector3(...l.map((x,k)=>i&(1<<k)?h[k]:x)).applyMatrix4(m).toArray();for(let k=0;k<3;k++){lo[k]=Math.min(lo[k],q[k]);hi[k]=Math.max(hi[k],q[k]);}}}
 return{lo,hi,center:lo.map((x,k)=>(x+hi[k])/2),size:lo.map((x,k)=>hi[k]-x)};
}
function axle(name,parent,point){
 if(!groups.has(name)){const base=new Vector3(...groups.get(parent).getWorldTranslation());group(name,new Vector3(...runtime(point)).sub(base).toArray(),parent);}return name;
}
function material(original,bumper=false,polycarbonate=false){
 if(polycarbonate){
  const key='exterior-polycarbonate';
  if(!materials.has(key))materials.set(key,doc.createMaterial(key).setBaseColorFactor([.82,.90,1,.24]).setAlphaMode('BLEND').setMetallicFactor(0).setRoughnessFactor(.22));
  return materials.get(key);
 }
 const rgba=original?.getBaseColorFactor()??[.55,.55,.55,1];
 const color=rgba.slice(0,3).map(x=>Math.round(x*20)/20),key=bumper?'bumper':color.join(',')+','+Math.round(rgba[3]*10)/10;
 if(!materials.has(key)){
  const m=doc.createMaterial(key).setBaseColorFactor(bumper?[.03,.14,.52,1]:[...color,rgba[3]]).setMetallicFactor(bumper?0:.25).setRoughnessFactor(.72).setDoubleSided(true);
  if(rgba[3]<.99)m.setAlphaMode('BLEND');materials.set(key,m);
 }return materials.get(key);
}
function append(parent,node,transform,bumper=false,polycarbonate=false){
 const origin=new Vector3(...groups.get(parent).getWorldTranslation()),nm=new Matrix3().getNormalMatrix(transform);
 for(const p of node.getMesh().listPrimitives()){
  const mat=material(p.getMaterial(),bumper,polycarbonate),key=parent+'/'+mat.getName();
  if(!batches.has(key))batches.set(key,{parent,mat,positions:[],normals:[],indices:[]});
  const b=batches.get(key),pos=p.getAttribute('POSITION'),normal=p.getAttribute('NORMAL'),base=b.positions.length/3;
  for(let i=0;i<pos.getCount();i++){v.fromArray(pos.getElement(i,[])).applyMatrix4(transform).sub(origin);b.positions.push(v.x,v.y,v.z);
   if(normal)v.fromArray(normal.getElement(i,[])).applyMatrix3(nm).normalize();else v.set(0,1,0);b.normals.push(v.x,v.y,v.z);}
  const indices=p.getIndices()?.getArray();if(indices)for(const i of indices)b.indices.push(base+i);else for(let i=0;i<pos.getCount();i++)b.indices.push(base+i);
 }
 report.assemblies[parent]=(report.assemblies[parent]??0)+1;
}
const moduleNames=new Set(),seen=new Set();
for(const file of sources.files){
 const input=await readFile(`${folder}/${file.name}`);
 if(hash(input)!==file.sha256)throw Error(`Source hash changed: ${file.name}`);
 report.inputs[file.name]={bytes:input.length,sha256:hash(input)};
 const source=await io.readBinary(input);
 for(const node of source.getRoot().listNodes())if(node.getMesh()){
  const name=node.getName(),path=[];let a=node.getParentNode();while(a){path.unshift(a.getName());a=a.getParentNode();}
  if(hardware.test(name)){report.omitted++;continue;}
  // Exporter names and identity transforms are NOT unique geometry IDs.
  // Compare all position/index bytes and material colors before deduplicating.
  const geometryHash=createHash('sha256');
  for(const p of node.getMesh().listPrimitives()){
   for(const a of [p.getAttribute('POSITION'),p.getIndices()])if(a){const v=a.getArray();geometryHash.update(new Uint8Array(v.buffer,v.byteOffset,v.byteLength));}
   geometryHash.update(JSON.stringify(p.getMaterial()?.getBaseColorFactor()??[]));
  }
  const fingerprint=geometryHash.digest('hex')+JSON.stringify(node.getWorldMatrix().map(x=>Math.round(x*1e7)/1e7));
  if(seen.has(fingerprint)){report.duplicates++;continue;}seen.add(fingerprint);
  const b=bounds(node),matrix=frame.clone().multiply(new Matrix4().fromArray(node.getWorldMatrix()));let parent=file.name==='model_0.glb'?'intake':file.name==='model_1.glb'?'hood':'chassis';
  // The team exports the carriage retracted. Bake its 12-inch extended position.
  if(file.name==='model_0.glb')matrix.premultiply(new Matrix4().makeTranslation(-.3048,0,0));
  const module=path.find(p=>/^SDS MK5n </.test(p));
  if(module&&/SDS MK5 Molded Wheel|SDS MK5 Turret Assembly/.test(name)){
   const p=runtime(b.center),x=Math.sign(p[0])*.276225,z=Math.sign(p[2])*.276225,base=`module-${x>0?'front':'rear'}-${z<0?'left':'right'}`;
   const wheel=name==='SDS MK5 Molded Wheel';parent=group(base+(wheel?'-wheel':'-fork'),[x,.0508-.223,z]);moduleNames.add(base);
   let wheelNode;node.getParentNode()?.traverse(n=>{if(n.getName()==='SDS MK5 Molded Wheel'&&n.getMesh())wheelNode=n;});
   if(!wheelNode)throw Error(`Missing wheel: ${base}`);
   const lo=[Infinity,Infinity,Infinity],hi=[-Infinity,-Infinity,-Infinity];
   for(const p of wheelNode.getMesh().listPrimitives()){const a=p.getAttribute('POSITION'),l=a.getMin([]),h=a.getMax([]);for(let k=0;k<3;k++){lo[k]=Math.min(lo[k],l[k]);hi[k]=Math.max(hi[k],h[k]);}}
   const sizes=hi.map((x,k)=>x-lo[k]),axis=new Vector3().setComponent(sizes.indexOf(Math.min(...sizes)),1).transformDirection(frame.clone().multiply(new Matrix4().fromArray(wheelNode.getWorldMatrix())));
   const angle=Math.atan2(axis.x,axis.z),center=new Vector3(x,.0508-.223,z);
   matrix.premultiply(new Matrix4().makeTranslation(...center.toArray()).multiply(new Matrix4().makeRotationY(-angle)).multiply(new Matrix4().makeTranslation(...center.clone().negate().toArray())));
  }else if(file.name==='model_0.glb'&&path.some(p=>p.startsWith('Tube Roller System'))){
   parent=axle('intake-roller-0','intake',[0,.1935034,.3059502+.3048]);
  }else if(file.name==='model_1.glb'&&path.some(p=>p.startsWith('Hood Rollers'))){
   const i=b.center[1]>.49?1:0;parent=axle(`hood-roller-${i}`,'hood',[0,i?.51990625:.4573214,-.0755168]);
  }else if(file.name==='model.glb'&&path.includes('Launcher Roller <1>'))parent='shooter-drum';
  else if(file.name==='model.glb'&&/Dent Tube|Dent Silicone/.test(name)){
   // Real floor-roller axes, not replacement cylinders.
   parent=axle(`feeder-floor-${Math.round(b.center[2]*1000)}`,'chassis',[0,b.center[1],b.center[2]]);
  }else if(file.name==='model.glb'&&path.some(p=>/^2" Roller </.test(p))){
   const ys=[.2847,.3422,.3997],i=ys.findIndex(y=>Math.abs(b.center[1]-y)<.004);
   if(i>=0)parent=axle(`feeder-vertical-${i}`,'chassis',[0,ys[i],-.0755168]);
  }
  // Match named outer hopper skins, not their shared white/black CAD colors:
  // frame rails, brackets, crash plates, rollers and bumper fabric stay opaque.
  const polycarbonate=(file.name==='model.glb'&&path.includes('Static Hopper <1>')&&['1-09-Static Hopper','1-12-Lower Static Hopper Wall','Part 9','Part 10'].includes(name))
   ||(file.name==='model_0.glb'&&['2-27-Intake C Hopper','2-28-Intake Front Hopper'].includes(name));
  if(polycarbonate)report.polycarbonate.push({file:file.name,name});
  append(parent,node,matrix,path.includes('Bumpers <1>')&&/Fabric/i.test(name),polycarbonate);report.kept++;
 }
}
if(moduleNames.size!==4)throw Error('Expected four actual MK5n modules');
const accessor=(type,array)=>doc.createAccessor().setType(type).setArray(array).setBuffer(buffer);
for(const [name,b]of batches){
 const p=doc.createPrimitive().setAttribute('POSITION',accessor('VEC3',new Float32Array(b.positions))).setAttribute('NORMAL',accessor('VEC3',new Float32Array(b.normals))).setIndices(accessor('SCALAR',new Uint32Array(b.indices))).setMaterial(b.mat);
 groups.get(b.parent).addChild(doc.createNode(name).setMesh(doc.createMesh(name).addPrimitive(p)));
}
await doc.transform(weld(),simplify({simplifier:MeshoptSimplifier,ratio:.12,error:.003,lockBorder:true}),prune(),meshopt({encoder:MeshoptEncoder,level:'high'}));
const bytes=await io.writeBinary(doc);let triangles=0,primitives=0;
for(const n of doc.getRoot().listNodes())for(const p of n.getMesh()?.listPrimitives()??[]){triangles+=(p.getIndices()?.getCount()??p.getAttribute('POSITION').getCount())/3;primitives++;}
Object.assign(report,{bytes:bytes.length,triangles,primitives,sha256:hash(bytes)});
if(bytes.length>6*1024*1024||triangles>650000||primitives>160)throw Error(`Runtime budget exceeded: ${JSON.stringify(report)}`);
await mkdir(`public/assets/robots/${id}`,{recursive:true});await mkdir(`assets/robots/${id}`,{recursive:true});
await writeFile(`public/assets/robots/${id}/robot.glb`,bytes);
await writeFile(`${folder}/preparation-report.json`,JSON.stringify(report,null,2)+'\n');
await writeFile(`assets/robots/${id}/runtime.json`,JSON.stringify({schemaVersion:1,robotId:id,group:{name:'Team 3847 Spectrum Infrared FM CAD',source:sources.release,redistribution:{status:'pending',evidence:[]},files:[{path:`public/assets/robots/${id}/robot.glb`,bytes:bytes.length,sha256:hash(bytes)}]}},null,2)+'\n');
console.log(JSON.stringify(report));
