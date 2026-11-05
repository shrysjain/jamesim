# Offline source-fitted 150mm fuel packing; requires NumPy only for authoring.
import numpy as np
D=.1502;R=.075
profile=np.array([[-.59587,-.0356],[-.28565,-.0395],[-.22765,-.0606],[-.16965,-.0818],[-.1116,-.1029],[-.05355,-.1240],[.03257,-.1344],[.11443,-.1056]])
boxlo=np.array([-.06230,.19539,-.34315]);boxhi=np.array([.29156,.53746,.29941])
boxes=[(np.array([-.649,.47235,-.376]),np.array([-.547,.47335,.376]))]
for sign in [-1,1]:
 for x0,x1,z0,z1 in [(-.547,-.166,.351,.376),(-.547,-.533,.27,.30),(-.547,-.507,.30,.33),(-.547,-.453,.33,.351)]:
  boxes.append((np.array([x0,.47235,z0 if sign>0 else -z1]),np.array([x1,.47335,z1 if sign>0 else -z0])))

D=.1502;R=.075
xs=np.arange(-.575,.02501,D/15);zs=np.arange(-.2975,.29751,D/15);ys=np.arange(-.0592,.4681,.002)
xx,zz=np.meshgrid(xs,zs,indexing='ij');xz=np.column_stack([xx.ravel(),zz.ravel()])
p=np.column_stack([np.repeat(xz[:,0],len(ys)),np.tile(ys,len(xz)),np.repeat(xz[:,1],len(ys))]);x,y,z=p.T
valid=(y>=np.interp(x,profile[:,0],profile[:,1]))
for a,b in zip(profile[:-1],profile[1:]):
 delta=b-a;t=np.clip(((p[:,:2]-a)*delta).sum(axis=1)/(delta@delta),0,1);dist=((p[:,:2]-a-t[:,None]*delta)**2).sum(axis=1);valid&=dist>=R*R
valid&=((x>=profile[0,0])|(y-R>=profile[0,1]))&((x<=profile[-1,0])|(y-R>=profile[-1,1]))
for lo,hi in [(boxlo,boxhi),*boxes]:
 delta=np.maximum(np.maximum(lo-p,p-hi),0);valid&=(delta*delta).sum(axis=1)>=R*R
mask=valid.reshape(len(xz),len(ys));best=[]
for seed in range(80):
 free=mask.copy();out=[];tie=np.random.default_rng(seed).uniform(0,1,len(xz))
 for it in range(110):
  available=free.any(axis=1)
  if not available.any():break
  yi=free.argmax(axis=1);height=np.where(available,ys[yi],np.inf);pick=np.argmin(height+tie*.00005)
  v=np.array([xz[pick,0],height[pick],xz[pick,1]]);out.append(v.tolist());hor=((xz-v[[0,2]])**2).sum(axis=1);near=np.flatnonzero(hor<D*D)
  dy=np.sqrt(np.maximum(0,D*D-hor[near]));free[near]&=np.abs(ys[None,:]-v[1])>=dy[:,None]
 if len(out)>len(best):best=out;print('BEST',len(best),seed,flush=True)
import json
from pathlib import Path
output=Path('assets/source/robots/1114-simbot-tim/prepared/cargo-fit.json');output.parent.mkdir(parents=True,exist_ok=True)
output.write_text(json.dumps(best,indent=2)+'\n')
