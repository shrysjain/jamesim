/** Offline preparation of the team's published Icarus 2.0 AdvantageScope CAD.
 * Robot mechanisms retain original geometry. Only the embossed bumper foam is
 * replaced with four plain bars fitted to its measured outline, so game labels
 * do not overlap baked numbers. Source hashes are checked before preparation. */
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {Document,NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {weld,prune,meshopt} from '@gltf-transform/functions';
import {MeshoptEncoder,MeshoptSimplifier} from 'meshoptimizer';
import {Matrix4,Matrix3,Vector3,Box3,BoxGeometry,BufferGeometry,BufferAttribute} from 'three';
await Promise.all([MeshoptEncoder.ready,MeshoptSimplifier.ready]);
const id='5000-icarus-2', input=`assets/source/robots/${id}/official`, output=`public/assets/robots/${id}`;
const hashes={
 'model.glb':'6d6a15b11971c8deb42397ae5be46af6baaf50d25fe9e376ad498bf959702cfa',
 'model_0.glb':'fd75a3954b26c4e2b28673b47935ad388394c37c81b184c00c89aa9663cab569',
 'model_1.glb':'e81c077ec77c49de1c5142f32218e89b0e21b9a249012e5c68a2d65d741bd542',
 'model_2.glb':'f0e13551387579d5c02ccee12117e6fce375ad48e39243bafc6757ee24c9a0e9',
 'model_3.glb':'8ef612434f2e40a95b6aa48f065631e4f9658f9987c0095ca0c133cf9b372a52',
 'model_4.glb':'41819ed889e35c2eafbde2119ab4dd67d966ed4895b9a0cd87d7835d2b1e882f'};
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.encoder':MeshoptEncoder});
const doc=new Document(),buffer=doc.createBuffer(),scene=doc.createScene('5000 Hammerheads Icarus 2.0');
// Export already Y-up with wheel carpet at0.00014m. Rotate native±Z side mouths
// into simulator±X, which is arbitrary on a swerve drive; chassis reference .223m.
const frame=new Matrix4().makeRotationY(Math.PI/2);frame.elements[13]=-.223;
const map=p=>new Vector3(...p).applyMatrix4(frame);
const deploy=.0254*11.5, travel=.0254*(11.5-.2),dx=deploy*Math.cos(21*Math.PI/180),dy=-deploy*Math.sin(21*Math.PI/180);
const turretYaw=-Math.PI/2, maxElevation=(90-6.24)*Math.PI/180;
const turretPivot=map([0,.5113,0]).toArray();
const turretAdjust=new Matrix4().makeTranslation(...turretPivot).multiply(new Matrix4().makeRotationY(turretYaw)).multiply(new Matrix4().makeTranslation(...turretPivot.map(x=>-x)));
const drumPivot=new Vector3(...map([.09672126882051421,.4835249918,0]).toArray()).applyMatrix4(turretAdjust).toArray();
const hoodAdjust=new Matrix4().makeTranslation(...drumPivot).multiply(new Matrix4().makeRotationZ(maxElevation-Math.PI/2)).multiply(new Matrix4().makeTranslation(...drumPivot.map(x=>-x)));
const groups=new Map(),parts=[],removed=[],excludedFuel=[];
let foamOutline=null,backerOutline=null;
const hardware=/screw|\bbolt\b|washer|nylock|\bnut\b|rivet|bearing|heat.set|retaining|collar|insert|^local\./i;
function group(name,pivot=[0,0,0],parent=null,basis=0){
 if(!groups.has(name))groups.set(name,{name,pivot,parent,basis,node:doc.createNode(name).setTranslation(pivot).setExtras({mechanism:name}),batches:new Map()});
 return groups.get(name);
}
group('chassis');group('intake');group('opposed-intake');group('turret',turretPivot);group('turret-hood',drumPivot,'turret');
for(const [file,expected] of Object.entries(hashes)){
 const raw=await readFile(`${input}/${file}`);if(createHash('sha256').update(raw).digest('hex')!==expected)throw Error(`Source hash mismatch: ${file}`);
 const original=await io.readBinary(raw);await original.transform(weld());
 const protectedSurfaces=new Map();
 for(const node of original.getRoot().listNodes()){
  const mesh=node.getMesh();if(!mesh)continue;
  if(/^(Super Structure|Intake SRPP Plates|top plate shell - FusionComponent)$/i.test(mesh.getName()))protectedSurfaces.set(mesh,mesh.getName());
  // Fusion emits the upper roof's complete part as an unnamed mesh under this
  // assembly. Protect by source ancestry, not an assumed display name.
  if(!node.getName()&&node.getParentNode()?.getName()==='Top Plate:1')protectedSurfaces.set(mesh,'Upper Top Plate');
 }
 if(file==='model.glb'){
  function measure(node,path=[]){
   if(path.includes('Bumpers:1')&&['Body1 (1):1','Body19:1'].includes(node.getName())){
    const box=new Box3(),world=frame.clone().multiply(new Matrix4().fromArray(node.getWorldMatrix()));
    for(const p of node.getMesh().listPrimitives()){
     const a=p.getAttribute('POSITION'),lo=a.getMin([]),hi=a.getMax([]);
     for(const x of [lo[0],hi[0]])for(const y of [lo[1],hi[1]])for(const z of [lo[2],hi[2]])box.expandByPoint(new Vector3(x,y,z).applyMatrix4(world));
    }
    if(node.getName()==='Body1 (1):1')foamOutline=box;else backerOutline=box;
   }
   for(const c of node.listChildren())measure(c,[...path,node.getName()]);
  }
  for(const n of original.getRoot().listScenes()[0].listChildren())measure(n);
 }
 // Simplify each original mesh before expanding occurrences. Preserve3mm shapes,
 // especially the thin SRPP rack teeth, instead of decimating only to a target size.
 for(const mesh of original.getRoot().listMeshes())for(const p of mesh.listPrimitives()){
  const a=p.getAttribute('POSITION'),indices=p.getIndices();if(p.getMode()!==4||!indices||indices.getCount()<180)continue;
  const protectedPanel=protectedSurfaces.has(mesh);
  // Keep the source triangle topology of these exposed panels.
  // Clustering thin opposite faces or smoothing their boundary vertices creates
  // the reported large dark triangles across the roof and sliding plates.
  if(protectedPanel)continue;
  const grid=.00001;
  const verts=a.getArray();for(let i=0;i<verts.length;i++)verts[i]=Math.round(verts[i]/grid)*grid;const remap=MeshoptSimplifier.generatePositionRemap(verts,3),w=new Uint32Array(Array.from(indices.getArray(),i=>remap[i]));
  let [r]=MeshoptSimplifier.simplify(w,verts,3,Math.floor(w.length*.05/3)*3,.003,['ErrorAbsolute']);
  // Spatial clustering can bridge the opposed faces of a thin panel. Keep the
  // original connected topology on the real lid/structure and intake SRPP plates.
  if(r.length>w.length*.2){const [sloppy]=MeshoptSimplifier.simplifySloppy(w,verts,3,null,Math.floor(w.length*.05/3)*3,.006/MeshoptSimplifier.getScale(verts,3));if(sloppy.length>=3&&sloppy.length<r.length)r=sloppy;}
  indices.setArray(r);
  const geo=new BufferGeometry().setAttribute('position',new BufferAttribute(verts,3)).setIndex(new BufferAttribute(r,1));geo.computeVertexNormals();const normal=p.getAttribute('NORMAL');if(normal)p.setAttribute('NORMAL',normal.clone().setArray(geo.getAttribute('normal').array));geo.dispose();
 }
 function visit(node,path=[]){
  const mesh=node.getMesh(),name=node.getName(),names=path.map(n=>n.getName());
  if(mesh){
   if(/\bfuel\b|game.?piece/i.test(name)){excludedFuel.push({file,name});return;}
   if(hardware.test(name)){removed.push({file,name});return;}
   // This source body contains both foam and embossed white glyphs. Its real
   // backer is a different retained body; replace only the measured outer wrap.
   if(file==='model.glb'&&names.includes('Bumpers:1')&&name==='Body1 (1):1')return;
   let transform=frame.clone().multiply(new Matrix4().fromArray(node.getWorldMatrix())),g=group('chassis');
   if(file==='model_0.glb'||file==='model_1.glb')transform.premultiply(turretAdjust);
   if(file==='model_1.glb'){transform.premultiply(hoodAdjust);g=group('turret-hood',drumPivot,'turret');}
   if(file==='model_0.glb')g=group('turret',turretPivot);
   if(file==='model_3.glb'||file==='model_4.glb'){
    const sign=file==='model_3.glb'?-1:1,parent=sign<0?'intake':'opposed-intake';
    transform.premultiply(new Matrix4().makeTranslation(sign*dx,dy,0));g=group(parent);
    const roller=path.find(n=>/^(Short )?Large Roller:[12]$/.test(n.getName()));
    if(roller){let pivot=map(new Vector3().setFromMatrixPosition(new Matrix4().fromArray(roller.getWorldMatrix())).toArray());pivot.x+=sign*dx;pivot.y+=dy;pivot.z=0;
     g=group(`intake-roller-${sign<0?'left':'right'}-${roller.getName().endsWith(':1')?'upper':'lower'}`,pivot.toArray(),parent);
    }
   }
   if(file==='model_0.glb'&&/^Flywheel:[12]$/.test(name))g=group('shooter-drum',drumPivot,'turret');
   if(file==='model_1.glb'){
    const roller=path.find(n=>/^TTB 1 Inch Solid Urethane Wheel/.test(n.getName()));
    if(roller){let pivot=new Vector3().setFromMatrixPosition(new Matrix4().fromArray(roller.getWorldMatrix())).applyMatrix4(frame).applyMatrix4(turretAdjust).applyMatrix4(hoodAdjust);pivot.z=0;
     const nativePivot=new Vector3().setFromMatrixPosition(new Matrix4().fromArray(roller.getWorldMatrix()));
     const upper=nativePivot.y>.4835249918;g=group(`hood-roller-${upper?'upper':'lower'}`,pivot.toArray(),'turret-hood');}
   }
   // The dye rotor export is only the driven internals; its bowl/tower/lid remain
   // in the static model. Rotate the central hook, never the whole vertical feeder.
   if(file==='model_2.glb'){
    if(/^Turning stuff:1$/.test(name))g=group('dye-rotor',map([0,.1324,0]).toArray());
    const flex=path.find(n=>/^WCP-1300/.test(n.getName()));
    if(flex)g=group('feeder-roller-vertical',map([-.08255,.1616,-.08447]).toArray());
    if(path.some(n=>/^WCP-1297/.test(n.getName())))g=group('feeder-roller-upper',map([-.08255,.2505,-.0164]).toArray());
   }
   // Each MK5n instance has its own exported axle basis. Only fork/wheel rotate;
   // the base, steering motor and drive motor remain rigidly inside the frame.
   const module=path.find(n=>/^MK5n [AB]:[12]$/.test(n.getName()));
   if(module){
    const wheel=module.listChildren().find(n=>/^Component2/.test(n.getName())),fork=/^Component1/.test(name);
    if(wheel&&(node===wheel||fork)){
     const a=wheel.getMesh().listPrimitives()[0].getAttribute('POSITION'),min=a.getMin([]),max=a.getMax([]),wm=frame.clone().multiply(new Matrix4().fromArray(wheel.getWorldMatrix()));
     const pivot=new Vector3(...min.map((v,i)=>(v+max[i])/2)).applyMatrix4(wm).toArray();
     const ext=max.map((v,i)=>v-min[i]),axis=ext.indexOf(Math.min(...ext)),axle=new Vector3().setComponent(axis,1).transformDirection(wm),basis=Math.atan2(axle.x,axle.z);
     const root=`module-${pivot[0]>0?'front':'rear'}-${pivot[2]>0?'right':'left'}`;g=group(`${root}-${node===wheel?'wheel':'fork'}`,pivot,null,basis);
    }
   }
   const bounds=new Box3(),normal=new Matrix3().getNormalMatrix(transform);
   for(const p of mesh.listPrimitives()){
    if(p.getMode()!==4)continue;const a=p.getAttribute('POSITION'),n=p.getAttribute('NORMAL'),idx=p.getIndices();
    const color=p.getMaterial()?.getBaseColorFactor()??[.25,.25,.25,1];
    // Preserve team palette using vertex colors while batching surfaces. Original
    // decals are omitted; runtime bumper numbers supply the team identification.
    const style=protectedSurfaces.has(mesh)?'source-panel-'+protectedSurfaces.get(mesh):'cad';let b=g.batches.get(style);if(!b){b={p:[],n:[],c:[],i:[]};g.batches.set(style,b);}const base=b.p.length/3;
    for(let i=0;i<a.getCount();i++){
     const w=new Vector3(...a.getElement(i,[])).applyMatrix4(transform);bounds.expandByPoint(w);
     const v=w.sub(new Vector3(...g.pivot)).applyAxisAngle(new Vector3(0,1,0),-g.basis);b.p.push(...v.toArray());
     const nn=n?new Vector3(...n.getElement(i,[])).applyMatrix3(normal).normalize():new Vector3(0,1,0);nn.applyAxisAngle(new Vector3(0,1,0),-g.basis);b.n.push(...nn.toArray());
     b.c.push(...color.map(c=>Math.round(c*255)));
    }
    for(let i=0;i<(idx?.getCount()??a.getCount());i+=3){const order=transform.determinant()<0?[0,2,1]:[0,1,2];for(const j of order)b.i.push(base+(idx?idx.getScalar(i+j):i+j));}
   }
   parts.push({file,name,path:names.join('/'),group:g.name,min:bounds.min.toArray(),max:bounds.max.toArray()});
  }
  for(const c of node.listChildren())visit(c,[...path,node]);
 }
 for(const n of original.getRoot().listScenes()[0].listChildren())visit(n);
}
for(const g of groups.values()){
 for(const [style,b] of g.batches){
  if(style.startsWith('source-panel-')) {
   // Bake true flat normals on the exposed planar sheets after preserving
   // every source triangle and color. The final weld
   // can share coplanar vertices without smoothing through a sharp CAD edge.
   const next={p:[],n:[],c:[],i:[]};
   for(let i=0;i<b.i.length;i+=3){const ids=b.i.slice(i,i+3),p=ids.map(j=>new Vector3(...b.p.slice(j*3,j*3+3)));
    const normal=p[1].clone().sub(p[0]).cross(p[2].clone().sub(p[0])).normalize();
    for(const j of ids){next.i.push(next.p.length/3);next.p.push(...b.p.slice(j*3,j*3+3));next.n.push(...normal.toArray());next.c.push(...b.c.slice(j*4,j*4+4));}
   }
   Object.assign(b,next);
  }
  const mat=doc.createMaterial(g.name+'-cad').setDoubleSided(true).setRoughnessFactor(.67).setMetallicFactor(.18);
  const acc=(t,a,n=false)=>doc.createAccessor().setType(t).setArray(a).setBuffer(buffer).setNormalized(n);
  const primitive=doc.createPrimitive().setAttribute('POSITION',acc('VEC3',new Float32Array(b.p))).setAttribute('NORMAL',acc('VEC3',new Float32Array(b.n))).setIndices(acc('SCALAR',new Uint32Array(b.i))).setMaterial(mat);
  primitive.setAttribute('COLOR_0',acc('VEC4',new Uint8Array(b.c),true));
  g.node.addChild(doc.createNode(`${g.name}-${style}`).setExtras(style.startsWith('source-panel-')?{sourceSurface:style.slice('source-panel-'.length),flatCadNormals:true}:{}).setMesh(doc.createMesh().addPrimitive(primitive)));
 }
 if(g.parent){const p=groups.get(g.parent);g.node.setTranslation(g.pivot.map((v,i)=>v-p.pivot[i]));p.node.addChild(g.node);}else scene.addChild(g.node);
}
if(!foamOutline||!backerOutline)throw Error('Measured original bumper foam/backer missing');
const foamSize=foamOutline.getSize(new Vector3()),foamCenter=foamOutline.getCenter(new Vector3()),backerSize=backerOutline.getSize(new Vector3());
const paddingThickness=Math.min((foamSize.x-backerSize.x)/2,(foamSize.z-backerSize.z)/2);
if(paddingThickness<=0)throw Error('Original foam outline must surround the retained backer');
const bumperMaterial=doc.createMaterial('bumper').setBaseColorFactor([.03,.18,.65,1]).setRoughnessFactor(.95).setMetallicFactor(0).setDoubleSided(true);
for(const sign of [-1,1])for(const [face,size,center]of[
 ['end',[paddingThickness,foamSize.y,foamSize.z],[foamCenter.x+sign*(foamSize.x-paddingThickness)/2,foamCenter.y,foamCenter.z]],
 ['side',[foamSize.x-2*paddingThickness,foamSize.y,paddingThickness],[foamCenter.x,foamCenter.y,foamCenter.z+sign*(foamSize.z-paddingThickness)/2]],
]){
 const geometry=new BoxGeometry(...size),positions=geometry.getAttribute('position').array.slice();
 for(let i=0;i<positions.length;i++)positions[i]+=center[i%3];
 const acc=(type,array)=>doc.createAccessor().setType(type).setArray(array).setBuffer(buffer);
 const primitive=doc.createPrimitive().setMaterial(bumperMaterial)
  .setAttribute('POSITION',acc('VEC3',positions)).setAttribute('NORMAL',acc('VEC3',geometry.getAttribute('normal').array.slice()))
  .setIndices(acc('SCALAR',new Uint16Array(geometry.index.array)));
 group('chassis').node.addChild(doc.createNode(`plain-bumper-${face}-${sign}`).setExtras({padding:'derived-plain',sourceBody:'Body1 (1):1'})
  .setMesh(doc.createMesh().addPrimitive(primitive)));geometry.dispose();
}
await doc.transform(weld(),prune(),meshopt({encoder:MeshoptEncoder,level:'high'}));
const result=await io.writeBinary(doc),sha256=createHash('sha256').update(result).digest('hex');await mkdir(output,{recursive:true});await writeFile(`${output}/robot.glb`,result);
const triangles=doc.getRoot().listMeshes().reduce((s,m)=>s+m.listPrimitives().reduce((n,p)=>n+p.getIndices().getCount()/3,0),0),primitives=doc.getRoot().listMeshes().reduce((s,m)=>s+m.listPrimitives().length,0);
if(result.length>6*1024*1024||triangles>650000||primitives>160)throw Error(`Runtime budget exceeded: ${result.length}bytes ${triangles}tris ${primitives}primitives`);
const report={id,bytes:result.length,sha256,triangles,primitives,kept:parts.length,removed:removed.length,excludedFuel:excludedFuel.length,sourceToRobot:frame.toArray(),intakeTravel:travel*Math.cos(21*Math.PI/180),intakeRise:travel*Math.sin(21*Math.PI/180),turretPivot,drumPivot,padding:{sourceBody:'Body1 (1):1',retainedBackerBody:'Body19:1',sourceMin:foamOutline.min.toArray(),sourceMax:foamOutline.max.toArray(),thickness:paddingThickness,approximation:'Four plain padding bars replace source embossed foam; no baked numbers.'},parts};
await mkdir(`assets/source/robots/${id}/prepared`,{recursive:true});await writeFile(`assets/source/robots/${id}/prepared/asset-report.json`,JSON.stringify(report,null,2)+'\n');
await writeFile(`assets/robots/${id}/runtime.json`,JSON.stringify({schemaVersion:1,robotId:id,group:{name:'Team 5000 Icarus 2.0 official CAD',source:'https://github.com/hammerheads5000/2026Rebuilt/tree/279745f273441470f86b78dece9d9c8653db0e2c/AdvantageScope/Robot_2026',redistribution:{status:'pending',evidence:[]},files:[{path:`${output}/robot.glb`,bytes:result.length,sha256}]}},null,2)+'\n');
console.log(JSON.stringify({...report,parts:undefined},null,2));
