/** Offline, hash-verified preparation of the owner's exact Worlds Onshape export. */
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {Document,NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {weld,prune,simplify,meshopt} from '@gltf-transform/functions';
import {MeshoptEncoder,MeshoptDecoder,MeshoptSimplifier} from 'meshoptimizer';
import {Matrix4,Matrix3,Vector3} from 'three';
const id='4481-era-ii',folder=`assets/source/robots/${id}`;
const hash=b=>createHash('sha256').update(b).digest('hex');
const input=await readFile(`${folder}/upload/Rembrandts 4481 Worlds.glb`);
if(hash(input)!=='6502ca903919ef90fab559e73bab930cd6335a362fc9585fb2a552beca893fc4')throw Error('Rembrandts source hash changed');
await Promise.all([MeshoptEncoder.ready,MeshoptDecoder.ready,MeshoptSimplifier.ready]);
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.encoder':MeshoptEncoder,'meshopt.decoder':MeshoptDecoder});
const source=await io.readBinary(input),doc=new Document(),buffer=doc.createBuffer(),scene=doc.createScene('4481 Team Rembrandts · Era II Worlds');
// CAD is Y-up, intake −Z. Normalize intake to −X, reference height .223 m.
const frame=new Matrix4().makeRotationY(Math.PI/2).setPosition(0,-.223,0);
const runtime=p=>new Vector3(...p).applyMatrix4(frame).toArray();
const bearing=runtime([.15,.39615,.15]);
// The fuel wraps around the native −Z side of the flywheel and exits toward +Z.
// Remove the exported 20.918° bearing angle to make its neutral launch direction +X.
const neutralAngle=-Math.atan2(.35700663924217224,.9341018199920654);
const neutral=new Matrix4().makeTranslation(...bearing).multiply(new Matrix4().makeRotationY(neutralAngle)).multiply(new Matrix4().makeTranslation(...bearing.map(x=>-x)));
const shooterPoint=p=>new Vector3(...runtime(p)).applyMatrix4(neutral).toArray();
const drum=shooterPoint([.18302311,.47835,.23640442]);
const groups=new Map(),batches=new Map(),materials=new Map(),report={inputBytes:input.length,inputSha256:hash(input),kept:0,omitted:0,embeddedFuelRemoved:0,duplicates:0,assemblies:{},bearing,drum,neutralAngle};
function group(name,world=[0,0,0],parent=''){
 if(groups.has(name))return name;
 const origin=parent?groups.get(parent).getWorldTranslation():[0,0,0];
 const n=doc.createNode(name).setTranslation(world.map((x,k)=>x-origin[k])).setExtras({mechanism:name});
 (parent?groups.get(parent):scene).addChild(n);groups.set(name,n);return name;
}
group('chassis');group('intake');group('turret',bearing);group('turret-hood',drum,'turret');group('shooter-drum',drum,'turret');
group('indexer-disk',runtime([0,.1279,-.038]));
const hardware=/SHCS|BHCS|FHCS|bolt|rivet|screw|washer|locknut|spacer|standoff|bushing|bearing|KerbKonus|shaft collar|DIN_|ISO[_ -]|kracht_SBK|circlip/i;
function bounds(node){const lo=[Infinity,Infinity,Infinity],hi=[-Infinity,-Infinity,-Infinity],m=new Matrix4().fromArray(node.getWorldMatrix());
 for(const p of node.getMesh().listPrimitives()){const a=p.getAttribute('POSITION'),l=a.getMin([]),h=a.getMax([]);for(let i=0;i<8;i++){const q=new Vector3(...l.map((x,k)=>i&(1<<k)?h[k]:x)).applyMatrix4(m).toArray();for(let k=0;k<3;k++){lo[k]=Math.min(lo[k],q[k]);hi[k]=Math.max(hi[k],q[k]);}}}
 return{lo,hi,center:lo.map((x,k)=>(x+hi[k])/2),size:lo.map((x,k)=>hi[k]-x)};
}
function material(original,kind){
 const c=original?.getBaseColorFactor()??[.6,.6,.6,1];let color;
 if(kind==='bumper')color=[.03,.14,.52,1];
 else if(kind==='polycarbonate')color=[.80,.88,.95,.24];
 else if(Math.max(...c.slice(0,3))-Math.min(...c.slice(0,3))<.17){const gray=Math.round((c[0]+c[1]+c[2])/3*5)/5;color=[gray,gray,gray,1];}
 else if(c[0]>c[1]*1.25&&c[0]>c[2]*1.2)color=c[1]>.25?[.92,.37,.04,1]:[.65,.06,.04,1];
 else if(c[2]>c[0]&&c[2]>c[1])color=[.1,.22,.65,1];
 else if(c[0]>.5&&c[1]>.4)color=[.75,.57,.1,1];
 else color=[.12,.45,.16,1];
 const key=kind??color.join(',');
 if(!materials.has(key)){const m=doc.createMaterial(key).setBaseColorFactor(color).setMetallicFactor(kind?0:.2).setRoughnessFactor(kind==='polycarbonate'?.28:.7).setDoubleSided(true);if(color[3]<1)m.setAlphaMode('BLEND');materials.set(key,m);}
 return materials.get(key);
}
const v=new Vector3();
function append(parent,node,matrix,kind){
 const origin=new Vector3(...groups.get(parent).getWorldTranslation()),nm=new Matrix3().getNormalMatrix(matrix);
 for(const p of node.getMesh().listPrimitives()){
  const mat=material(p.getMaterial(),kind),key=parent+'/'+mat.getName();if(!batches.has(key))batches.set(key,{parent,mat,positions:[],normals:[],indices:[]});
  const b=batches.get(key),a=p.getAttribute('POSITION'),n=p.getAttribute('NORMAL'),base=b.positions.length/3;
  for(let i=0;i<a.getCount();i++){v.fromArray(a.getElement(i,[])).applyMatrix4(matrix).sub(origin);b.positions.push(v.x,v.y,v.z);if(n)v.fromArray(n.getElement(i,[])).applyMatrix3(nm).normalize();else v.set(0,1,0);b.normals.push(v.x,v.y,v.z);}
  const indices=p.getIndices()?.getArray();if(indices)for(const i of indices)b.indices.push(base+i);else for(let i=0;i<a.getCount();i++)b.indices.push(base+i);
 }
 report.assemblies[parent]=(report.assemblies[parent]??0)+1;
}
// The four source module instances have different neutral orientations. Use
// each actual wheel's native +Z axle for both its tread and corresponding fork.
const moduleAngles=new Map();
for(const n of source.getRoot().listNodes())if(n.getName()==='SDS MK5i_4in with lift kit'&&n.getMesh()){
 const b=bounds(n);if(Math.abs(b.center[1]-.0508)>.002||b.size[1]<.10)continue;
 const p=runtime(b.center),axis=new Vector3(0,0,1).transformDirection(frame.clone().multiply(new Matrix4().fromArray(n.getWorldMatrix())));
 moduleAngles.set(`${Math.sign(p[0])},${Math.sign(p[2])}`,Math.atan2(axis.x,axis.z));
}
const seen=new Set(),modules=new Set();
const fixedIntake=/^TR26-IN-(400[4-9]|401[2378]|4024)$/;
for(const node of source.getRoot().listNodes())if(node.getMesh()){
 const name=node.getName(),path=[];let a=node.getParentNode();while(a){path.unshift(a.getName());a=a.getParentNode();}
 if(name==='GP26_FUEL'){report.embeddedFuelRemoved++;continue;}
 const b=bounds(node),size=[...b.size].sort((a,b)=>b-a);
 if(hardware.test(name)||size[0]<.025||size[1]<.006){report.omitted++;continue;}
 const fingerprint=createHash('sha256');for(const p of node.getMesh().listPrimitives()){for(const a of [p.getAttribute('POSITION'),p.getIndices()])if(a){const x=a.getArray();fingerprint.update(new Uint8Array(x.buffer,x.byteOffset,x.byteLength));}fingerprint.update(JSON.stringify(p.getMaterial()?.getBaseColorFactor()??[]));}
 const key=fingerprint.digest('hex')+JSON.stringify(node.getWorldMatrix().map(x=>Math.round(x*1e7)/1e7));if(seen.has(key)){report.duplicates++;continue;}seen.add(key);
 let parent='chassis',matrix=frame.clone().multiply(new Matrix4().fromArray(node.getWorldMatrix()));
 const assembly=path[1]??'';
 if(assembly.startsWith('TR26-IN')&&!fixedIntake.test(name)&&!name.startsWith('Constant Force Spring'))parent='intake';
 if(assembly.startsWith('TR26-SH')){
  parent='turret';matrix.premultiply(neutral);
  // Inner curved hood skin and its cross brace; bearing rails/side plates stay on the turret.
  if(['TR26-SH-4011','TR26-SH-4021'].includes(name))parent='turret-hood';
  if(['TR_79mm SS Flywheel','TR26-SH-4003','TR26-SH-4015'].includes(name))parent='shooter-drum';
 }
 if(name==='TR26-HW-3001')parent='indexer-disk';
 if(name==='TR26-IN-4010'||name==='TR26-IN-4023'){
  const i=b.center[1]<.20?0:1;parent=group(`intake-roller-${i}`,runtime([0,i?.2506:.16,i?-.5718:-.614]),'intake');
 }
 // Fixed tower rollers, with their actual transverse native-Z shafts.
 if(assembly.startsWith('TR26-TW')&&(/StealthWheel|Thrifty Squish Wheel/.test(name)||name==='TR26-TW-2036')){
  const i=b.center[1]<.33?0:1,p=runtime([i?.0526:.0556,i?.3511:.2988,.15]);parent=group(`feeder-roller-${i}`,p);groups.get(parent).setExtras({mechanism:parent,spinAxis:'x'});
 }
 if(name==='SDS MK5i_4in with lift kit'){
  const p=runtime(b.center),x=Math.sign(p[0])*.27332,z=Math.sign(p[2])*.27332,base=`module-${x>0?'front':'rear'}-${z<0?'left':'right'}`,center=[x,.0508-.223,z];
  const wheel=Math.abs(b.center[1]-.0508)<.002&&b.size[1]>.10;
  const fork=Math.abs(b.center[1]-.079375)<.003&&b.size[1]>.10;
  if(wheel||fork){parent=group(base+(wheel?'-wheel':'-fork'),center);modules.add(base);
   // Native wheel axles are ±Z. Normalize to runtime +Z before shared steer/spin.
   const angle=moduleAngles.get(`${Math.sign(p[0])},${Math.sign(p[2])}`);
   if(angle===undefined)throw Error(`Missing module axle: ${base}`);
   const normalize=new Matrix4().makeTranslation(...center).multiply(new Matrix4().makeRotationY(-angle)).multiply(new Matrix4().makeTranslation(...center.map(x=>-x)));
   matrix.premultiply(normalize);
  }
 }
 const kind=assembly.startsWith('TR26-BU')&&name==='TR26-BU-1002'?'bumper':/^TR26-HO-300[1-4]$/.test(name)||['TR26-IN-4019','TR26-IN-4020'].includes(name)?'polycarbonate':undefined;
 append(parent,node,matrix,kind);report.kept++;
}
if(modules.size!==4)throw Error('Expected four actual MK5i modules');
const accessor=(type,array)=>doc.createAccessor().setType(type).setArray(array).setBuffer(buffer);
for(const [name,b]of batches){const p=doc.createPrimitive().setAttribute('POSITION',accessor('VEC3',new Float32Array(b.positions))).setAttribute('NORMAL',accessor('VEC3',new Float32Array(b.normals))).setIndices(accessor('SCALAR',new Uint32Array(b.indices))).setMaterial(b.mat);groups.get(b.parent).addChild(doc.createNode(name).setMesh(doc.createMesh(name).addPrimitive(p)));}
await doc.transform(weld(),simplify({simplifier:MeshoptSimplifier,ratio:.035,error:.003,lockBorder:false}),prune(),meshopt({encoder:MeshoptEncoder,level:'high'}));
const bytes=await io.writeBinary(doc);let triangles=0,primitives=0;for(const n of doc.getRoot().listNodes())for(const p of n.getMesh()?.listPrimitives()??[]){triangles+=(p.getIndices()?.getCount()??p.getAttribute('POSITION').getCount())/3;primitives++;}
Object.assign(report,{bytes:bytes.length,triangles,primitives,sha256:hash(bytes)});
if(bytes.length>6*1024*1024||triangles>650000||primitives>160)throw Error(`Runtime budget exceeded: ${JSON.stringify(report)}`);
await mkdir(`public/assets/robots/${id}`,{recursive:true});await writeFile(`public/assets/robots/${id}/robot.glb`,bytes);
await writeFile(`${folder}/preparation-report.json`,JSON.stringify(report,null,2)+'\n');
await writeFile(`assets/robots/${id}/runtime.json`,JSON.stringify({schemaVersion:1,robotId:id,group:{name:'Team 4481 Rembrandts Era II Worlds CAD',source:'https://cad.onshape.com/documents/af9429d854eeaa98a1b3eeda/w/2554bb5ba18919b03a73491d/e/0bdb27080b01fd9a708ccf46',redistribution:{status:'pending',evidence:[]},files:[{path:`public/assets/robots/${id}/robot.glb`,bytes:bytes.length,sha256:hash(bytes)}]}},null,2)+'\n');
console.log(JSON.stringify(report));
