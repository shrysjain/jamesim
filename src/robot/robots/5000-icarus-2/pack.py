# Offline full-size sphere packing for the source-measured Icarus cavity.
# Requires NumPy; no Python or CAD parsing runs in the application.
import math,json,numpy as np
R=.075;D=.1505
travel=11.3*.0254*math.cos(math.radians(21));back=.585-travel
shapes=[
 ('annulus',(0,(-.137275-.05155)/2,0),(.5,(.137275-.05155)/2,.5),.2667,(.328613,(.137275-.05155)/2,.320314)),
 ('cylinder',(0,(-.18014-.001115)/2,0),(.1005,(.18014-.001115)/2,.1005),0,None),
 ('cylinder',(0,(-.01064+.08957)/2,0),(.103,(.08957+.01064)/2,.103),0,None),
 ('box',(.0762,(.093+.204)/2,0),(.007,.0555,.009),0,None),
 ('box',(-.0762,(.093+.204)/2,0),(.007,.0555,.009),0,None),
 ('box',(0,(.053+.204)/2,-.083),(.0145,.0755,.004),0,None),
 ('box',(.005935,.21838,0),(.115825,.0272,.09855),0,None),
 ('cylinder',(0,(.2859+.32945)/2,0),(.232,(.32945-.2859)/2,.232),0,None),
 ('annulus',(0,.307225,0),(.5,.003175/2,.5),.22225,(.283845,.003175/2,.352425)),
 # Nets remain the prior conservative floor estimate; their softbag shape is not in CAD.
 ('box',(-.4575,-.14,0),(.1275,.06,.337),0,None),
 ('box',(.4575,-.14,0),(.1275,.06,.337),0,None),
]
def sd_box(p,c,e):
 q=np.abs(p-c)-e
 return np.linalg.norm(np.maximum(q,0),axis=1)+np.minimum(np.max(q,axis=1),0)
def sd(p,s):
 kind,c,e,inner,clip=s;c=np.array(c);e=np.array(e)
 if kind=='box':out=sd_box(p,c,e)
 else:
  rad=np.linalg.norm(p[:,[0,2]]-c[[0,2]],axis=1)
  qr=rad-e[0] if kind=='cylinder' else np.abs(rad-(e[0]+inner)/2)-(e[0]-inner)/2
  qy=np.abs(p[:,1]-c[1])-e[1]
  out=np.hypot(np.maximum(qr,0),np.maximum(qy,0))+np.minimum(np.maximum(qr,qy),0)
 if clip is not None:out=np.maximum(out,sd_box(p,c,np.array(clip)))
 return out
def fits(ps,closed=False):
 result=(ps[:,0]-R>=(-.585+travel if closed else -.585))&(ps[:,0]+R<=back)&(np.abs(ps[:,2])+R<=.337)&(ps[:,1]-R>=-.137275)&(ps[:,1]+R<=.322)
 for s in shapes:result&=sd(ps,s)>=R+1e-7
 return result

D=.1502
# Circular lower roof opening; keep the measured ring and source upper package.
xs=np.arange(-.510,.242,D/15);zs=np.arange(-.262,.263,D/15);ys=np.arange(-.062075,.2471,.002)
xx,zz=np.meshgrid(xs,zs,indexing='ij');xz=np.column_stack([xx.ravel(),zz.ravel()]);
pts=np.column_stack([np.repeat(xz[:,0],len(ys)),np.tile(ys,len(xz)),np.repeat(xz[:,1],len(ys))]);mask=fits(pts).reshape(len(xz),len(ys))
# Try several deterministic tie orders. Grid candidates are settled at the first
# free support height; no sphere is shrunk or allowed through the source shapes.
best=[]
for seed in range(120):
 free=mask.copy();out=[];rng=np.random.default_rng(seed);tie=rng.uniform(0,1,len(xz))
 for it in range(100):
  available=free.any(axis=1)
  if not available.any():break
  yindices=free.argmax(axis=1);heights=np.where(available,ys[yindices],np.inf)
  # Place low balls first. Jitter only chooses among equal-height candidates.
  pick=np.argmin(heights+tie*.00005);p=np.array([xz[pick,0],heights[pick],xz[pick,1]]);out.append(p.tolist())
  horizontal=((xz-p[[0,2]])**2).sum(axis=1);near=np.flatnonzero(horizontal<D*D)
  dz=np.sqrt(np.maximum(0,D*D-horizontal[near]));free[near]&=np.abs(ys[None,:]-p[1])>=dz[:,None]
 if len(out)>len(best):best=out;print('BEST',len(best),'seed',seed,flush=True)
from pathlib import Path
output=Path('assets/source/robots/5000-icarus-2/prepared/cargo-fit.json');output.parent.mkdir(parents=True,exist_ok=True)
output.write_text(json.dumps({'points':best,'shapes':shapes},indent=2)+'\n')
