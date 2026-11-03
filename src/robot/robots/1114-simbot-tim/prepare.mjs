/** Offline converter for the user-supplied complete S26-A000 Onshape GLB.
 * Actual team CAD supplies every mechanism. Four simple bumper pads are an
 * explicit visual supplement: the source CAD omits the robot's bumpers. */
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {Document,NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {weld,prune,meshopt} from '@gltf-transform/functions';
import {MeshoptEncoder,MeshoptSimplifier} from 'meshoptimizer';
import {Matrix4,Matrix3,Vector3,Box3,BufferGeometry,BufferAttribute,BoxGeometry} from 'three';
await Promise.all([MeshoptEncoder.ready,MeshoptSimplifier.ready]);
const id='1114-simbot-tim',input=`assets/source/robots/${id}/upload/1114 Simbotics - S26-A000.glb`,output=`public/assets/robots/${id}`;
const raw=await readFile(input),sourceHash=createHash('sha256').update(raw).digest('hex');
if(sourceHash!=='baff1897535f7ed692eacad69032fed7894623131762ea23ed157bf8a2ecb50c')throw Error('Source GLB checksum mismatch');
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.encoder':MeshoptEncoder});
const src=await io.readBinary(raw);await src.transform(weld());
const doc=new Document(),buffer=doc.createBuffer(),scene=doc.createScene('1114 Simbot Tim');
const frame=new Matrix4().makeRotationY(-Math.PI/2);frame.elements[13]=-.223;
const map=p=>new Vector3(...p).applyMatrix4(frame);
// Slide-axis fit to the long sloping rack/slots. Absolute travel is a simulator
// estimate consistent with the boot-zero/drop code and a mouth beyond bumpers.
const travel=.34417,rise=.057;
const drumPivot=map([0,.5715,-.01757]).toArray();
// Last hood roller radius defines its actual release tangent: native +Z/up.
const sourceExitElevation=Math.atan2(.1533823-.01757,.7037381-.5715);
const hoodReference=sourceExitElevation-74*Math.PI/180;
const hoodFrame=new Matrix4().makeTranslation(...drumPivot).multiply(new Matrix4().makeRotationZ(hoodReference)).multiply(new Matrix4().makeTranslation(...drumPivot.map(v=>-v)));
const hoodPoint=p=>new Vector3(...p).applyMatrix4(hoodFrame).toArray();
const protectedMeshes=new Set();for(const n of src.getRoot().listNodes())if(['S26-IN-P322','S26-IN-P330'].includes(n.getName()))protectedMeshes.add(n.getMesh());
const groups=new Map(),parts=[],removed=[],embeddedFuel=[],moduleFrames=new Map();
function moduleFrame(node){if(moduleFrames.has(node))return moduleFrames.get(node);let wheel=null;const scan=n=>{if(n.getMesh()&&n.getName().includes('Colson Wheel ('))wheel??=n;for(const c of n.listChildren())scan(c);};scan(node);if(!wheel)throw Error('Missing source wheel');const a=wheel.getMesh().listPrimitives()[0].getAttribute('POSITION'),ext=a.getMax([]).map((v,i)=>v-a.getMin([])[i]),axis=ext.indexOf(Math.min(...ext)),world=frame.clone().multiply(new Matrix4().fromArray(wheel.getWorldMatrix())),axle=new Vector3().setComponent(axis,1).transformDirection(world),c=new Vector3(...a.getMin([]).map((v,i)=>(v+a.getMax([])[i])/2)).applyMatrix4(world),r={x:c.x>0?.24765:-.24765,z:c.z>0?.3175:-.3175,basis:Math.atan2(axle.x,axle.z)};moduleFrames.set(node,r);return r;}
function group(name,pivot=[0,0,0],parent=null,basis=0){if(!groups.has(name))groups.set(name,{name,pivot,parent,basis,node:doc.createNode(name).setTranslation(pivot).setExtras({mechanism:name}),batches:new Map()});return groups.get(name);}
group('chassis');group('intake');group('hood',drumPivot);group('shooter-drum',drumPivot);
const hardware=/screw|\bbolt\b|washer|\bnut\b|nylock|rivet|bearing|spacer|collar|retaining|^9\d{4}[A-Z]/i;
// Simplify source meshes before expanding instanced occurrences. The threshold
// is bounded in meters; recognizable plates and their cutouts remain CAD.
// Replace normals on a primitive-owned clone: source glTF primitives can share
// accessors, and computeVertexNormals zeroes vertices unused by this primitive.
for(const mesh of src.getRoot().listMeshes())if(!protectedMeshes.has(mesh))for(const p of mesh.listPrimitives()){
 const a=p.getAttribute('POSITION'),indices=p.getIndices();if(p.getMode()!==4||!indices||indices.getCount()<180)continue;
 const v=a.getArray();for(let i=0;i<v.length;i++)v[i]=Math.round(v[i]/.00001)*.00001;
 const remap=MeshoptSimplifier.generatePositionRemap(v,3),w=new Uint32Array(Array.from(indices.getArray(),i=>remap[i]));
 let [r]=MeshoptSimplifier.simplify(w,v,3,Math.floor(w.length*.06/3)*3,.002,['ErrorAbsolute','Prune']);
 indices.setArray(r);const geo=new BufferGeometry().setAttribute('position',new BufferAttribute(v,3)).setIndex(new BufferAttribute(r,1));geo.computeVertexNormals();if(p.getAttribute('NORMAL'))p.setAttribute('NORMAL',p.getAttribute('NORMAL').clone().setArray(geo.getAttribute('normal').array));geo.dispose();
}
function visit(node,path=[]){
 const mesh=node.getMesh(),name=node.getName(),names=path.map(n=>n.getName());
 if(mesh){
  if(/\bfuel\b|game.?piece/i.test(name)){embeddedFuel.push(name);return;}
  if(hardware.test(name)){removed.push(name);return;}
  let transform=frame.clone().multiply(new Matrix4().fromArray(node.getWorldMatrix())),g=group('chassis');
  const nativeCenter=new Box3();for(const p of mesh.listPrimitives()){const a=p.getAttribute('POSITION');for(let k=0;k<8;k++)nativeCenter.expandByPoint(new Vector3(...a.getMin([]).map((x,i)=>k&(1<<i)?a.getMax([])[i]:x)).applyMatrix4(new Matrix4().fromArray(node.getWorldMatrix())));}
  const center=nativeCenter.getCenter(new Vector3()),size=nativeCenter.getSize(new Vector3());
  const intake=names.some(n=>n.startsWith('S26-IN-A200'));
  const fixedIntake=/^S26-IN-P(?:011|018|303|311|318|319|320|321|324)$/.test(name)||['Part 46','Part 52'].includes(name);
  if(intake&&!fixedIntake){transform.premultiply(new Matrix4().makeTranslation(-travel,-rise,0));g=group('intake');
   if(name==='S26-IN-P322')g=group('hopper-shell',[0,0,0],'intake');
   if(name==='S26-IN-P330')g=group('hopper-rim',[0,0,0],'intake');
   let roller=null;if(['S26-IN-P302','Part 51'].includes(name))roller=[0,.2182,.2517];
   if(roller){const pivot=map(roller);pivot.x-=travel;pivot.y-=rise;g=group(roller[1]<.15?'intake-roller-lower':'intake-roller-upper',pivot.toArray(),'intake');}
  }
  if(intake&&['S26-IN-P303','Part 46','Part 52'].includes(name))g=group('intake-roller-lower',map([0,.0952,.1652]).toArray());
  const shooter=names.some(n=>n.startsWith('S26-SH-A000'));
  if(shooter&&center.y>.58&&!/^S26-SH-P(?:002_r1|010_r1|026)$/.test(name))g=group('hood',drumPivot);
  if(shooter&&['Part 101','S26-P001_r1'].includes(name))g=group('shooter-drum',drumPivot);
  // Three genuine hood rollers each retain their own shaft center.
  if(shooter&&['S26-SH-P045','Part 102','S26-SH-P034','S26-SH-P035','S26-SH-P036','S26-SH-P037','S26-SH-P032','S26-SH-P024'].includes(name)&&center.y>.58){
   const shafts=[[0,.6136723,-.2023799],[0,.6620811,-.1840866],[0,.7037381,-.1533823]],idx=shafts.reduce((best,p,i)=>Math.abs(p[1]-center.y)<Math.abs(shafts[best][1]-center.y)?i:best,0);g=group(`hood-roller-${idx}`,hoodPoint(map(shafts[idx]).toArray()),'hood');
  }
  // Fixed floor/elevator roller covers rotate on their actual independent axes.
  if(!intake&&!shooter&&(name==='Part 99'||name==='Part 100'||name==='3" Thrifty Squish Wheel (45A, 1" Wide, 1/2" Hex Bore)'||name==='S26-BEL-P006')){
   const pivot=map([0,center.y,center.z]).toArray(),key=`feeder-roller-${Math.round(center.y*10000)}-${Math.round(center.z*10000)}`;g=group(key,pivot);
  }
  const module=path.find(n=>/^SwerveX2 <[1-4]>$/.test(n.getName()));
  if(module){const wheelRoot=path.find(n=>n.getName().startsWith('Wheel Assembly SwerveX2')),forkRoot=path.some(n=>n.getName().startsWith('Wheel Module SwerveX2'));if(wheelRoot||forkRoot){
   const {x,z,basis}=moduleFrame(module),pivot=[x,.0508-.223,z],root=`module-${x>0?'front':'rear'}-${z>0?'right':'left'}`;
   g=group(`${root}-${wheelRoot?'wheel':'fork'}`,pivot,null,basis);
  }}
  if(g.name==='hood'||g.parent==='hood')transform.premultiply(hoodFrame);
  const normal=new Matrix3().getNormalMatrix(transform),bounds=new Box3();
  for(const p of mesh.listPrimitives()){
   if(p.getMode()!==4)continue;const a=p.getAttribute('POSITION'),n=p.getAttribute('NORMAL'),idx=p.getIndices(),mat=p.getMaterial(),color=mat?.getBaseColorFactor()??[.25,.25,.25,1];
   const clear=intake&&name==='S26-IN-P322',style=clear?'clear':'cad';let b=g.batches.get(style);if(!b){b={p:[],n:[],c:[],i:[]};g.batches.set(style,b);}const base=b.p.length/3;
   for(let i=0;i<a.getCount();i++){const w=new Vector3(...a.getElement(i,[])).applyMatrix4(transform);bounds.expandByPoint(w);const v=w.sub(new Vector3(...g.pivot)).applyAxisAngle(new Vector3(0,1,0),-g.basis);b.p.push(...v.toArray());const nn=n?new Vector3(...n.getElement(i,[])).applyMatrix3(normal).normalize():new Vector3(0,1,0);nn.applyAxisAngle(new Vector3(0,1,0),-g.basis);b.n.push(...nn.toArray());b.c.push(...color.map(c=>Math.round(c*255)));}for(let i=0;i<(idx?.getCount()??a.getCount());i++)b.i.push(base+(idx?idx.getScalar(i):i));
  }
  parts.push({name,path:names.join('/'),group:g.name,min:bounds.min.toArray(),max:bounds.max.toArray()});
 }
 for(const c of node.listChildren())visit(c,[...path,node]);
}
for(const n of src.getRoot().listScenes()[0].listChildren())visit(n);
// Supplemental padding only, sized to the official code bumper footprint.
const bumper=group('chassis');for(const sign of[-1,1])for(const [center,dimensions] of[[[sign*(.76/2-.03175),.102-.223,0],[.0635,.127,.92]],[[0,.102-.223,sign*(.92/2-.03175)],[.633,.127,.0635]]]){
 const geo=new BoxGeometry(...dimensions),pos=geo.getAttribute('position'),norm=geo.getAttribute('normal'),idx=geo.getIndex();let b=bumper.batches.get('bumper');if(!b){b={p:[],n:[],c:[],i:[]};bumper.batches.set('bumper',b);}const base=b.p.length/3;for(let i=0;i<pos.count;i++){b.p.push(pos.getX(i)+center[0],pos.getY(i)+center[1],pos.getZ(i)+center[2]);b.n.push(norm.getX(i),norm.getY(i),norm.getZ(i));}for(let i=0;i<idx.count;i++)b.i.push(base+idx.getX(i));geo.dispose();}
for(const g of groups.values()){
 for(const[style,b]of g.batches){const mat=doc.createMaterial(style==='bumper'?'bumper':`${g.name}-${style}`).setDoubleSided(true).setRoughnessFactor(.7).setMetallicFactor(style==='bumper'?0:.12);if(style==='bumper')mat.setBaseColorFactor([.03,.18,.65,1]);if(style==='clear')mat.setBaseColorFactor([.7,.75,.8,.24]).setAlphaMode('BLEND').setMetallicFactor(0);
 const acc=(t,a,n=false)=>doc.createAccessor().setType(t).setArray(a).setBuffer(buffer).setNormalized(n);const pr=doc.createPrimitive().setAttribute('POSITION',acc('VEC3',new Float32Array(b.p))).setAttribute('NORMAL',acc('VEC3',new Float32Array(b.n))).setIndices(acc('SCALAR',new Uint32Array(b.i))).setMaterial(mat);if(style==='cad')pr.setAttribute('COLOR_0',acc('VEC4',new Uint8Array(b.c),true));g.node.addChild(doc.createNode(`${g.name}-${style}`).setMesh(doc.createMesh().addPrimitive(pr)));}
 if(g.parent){const p=groups.get(g.parent);g.node.setTranslation(g.pivot.map((v,i)=>v-p.pivot[i]));p.node.addChild(g.node);}else scene.addChild(g.node);
}
await doc.transform(weld(),prune());
const before=doc.getRoot().listMeshes().reduce((s,m)=>s+m.listPrimitives().reduce((n,p)=>n+p.getIndices().getCount()/3,0),0);
console.log('Topology-safe precompression triangles',before);
if(before>600000)for(const m of doc.getRoot().listMeshes())for(const p of m.listPrimitives()){
 if(m.listParents().some(n=>/^(hopper-shell|hopper-rim)-/.test(n.getName?.()??'')))continue;
 const a=p.getAttribute('POSITION'),idx=p.getIndices(),v=a.getArray(),target=Math.max(3,Math.floor(idx.getCount()*(590000/before)/3)*3);
 const remap=MeshoptSimplifier.generatePositionRemap(v,3),w=new Uint32Array(Array.from(idx.getArray(),i=>remap[i]));
 const [out]=MeshoptSimplifier.simplify(w,v,3,target,.004,['ErrorAbsolute','Prune']);if(out.length>=3&&out.length<idx.getCount())idx.setArray(out);
 const geo=new BufferGeometry().setAttribute('position',new BufferAttribute(v,3)).setIndex(new BufferAttribute(idx.getArray(),1));geo.computeVertexNormals();p.setAttribute('NORMAL',p.getAttribute('NORMAL').clone().setArray(geo.getAttribute('normal').array));geo.dispose();
}
await doc.transform(weld(),prune(),meshopt({encoder:MeshoptEncoder,level:'high'}));const result=await io.writeBinary(doc),sha256=createHash('sha256').update(result).digest('hex'),triangles=doc.getRoot().listMeshes().reduce((s,m)=>s+m.listPrimitives().reduce((n,p)=>n+p.getIndices().getCount()/3,0),0),primitives=doc.getRoot().listMeshes().reduce((s,m)=>s+m.listPrimitives().length,0);
if(result.length>6*1024*1024||triangles>650000||primitives>160)throw Error(`Budget exceeded ${result.length}bytes ${triangles}tris ${primitives}primitives`);
await mkdir(output,{recursive:true});await writeFile(`${output}/robot.glb`,result);await mkdir(`assets/source/robots/${id}/prepared`,{recursive:true});await writeFile(`assets/source/robots/${id}/prepared/report.json`,JSON.stringify({sourceHash,bytes:result.length,sha256,triangles,primitives,parts,removed,embeddedFuel,travel,rise,drumPivot,sourceExitElevation,hoodReference},null,2)+'\n');
await writeFile(`assets/robots/${id}/runtime.json`,JSON.stringify({schemaVersion:1,robotId:id,group:{name:'Team1114 Simbot Tim full CAD and supplemental bumper envelope',source:'https://www.chiefdelphi.com/t/team-1114-simbotics-2026-simbot-tim-cad-release/522887',redistribution:{status:'pending',evidence:[]},files:[{path:`${output}/robot.glb`,bytes:result.length,sha256}]}},null,2)+'\n');console.log(JSON.stringify({bytes:result.length,sha256,triangles,primitives,parts:parts.length,removed:removed.length,embeddedFuel:embeddedFuel.length,drumPivot}));
