#!/usr/bin/env python

import stagyy.viz as viz
import stagyy.find as find
import stagyy.model as model
import matplotlib.pylab as plt
import os
import glob
#import numpy as np
import h5py
import time
#from matplotlib.colors import LinearSegmentedColormap
START=0

def tick():
    global START
    START=time.time()

def tock():
    global START
    elappsed=time.time()-START
    START=elappsed+START
    return elappsed

# directories
cwd=os.getcwd()
frames_dir=os.path.realpath('../html/frames')

# Plot eta
cmap_eta=plt.get_cmap('PuBu')
#cmap_eta=plt.get_cmap('spectral')
cmap_eta.set_under((1,1,1),alpha=0.0)

models=sorted(find.find('par'))
m=models[0]
#for m in find.find('par'):
if True:
    print(m)
    p=model.Par(os.path.join(m,'par'))
    eta_max=p['viscosity']['eta_max']
    eta_min=p['viscosity']['eta_min']
    eta_renderer=viz.Log10Renderer(eta_min,eta_max,cmap_eta)
    eta_frame_dir=os.path.join(frames_dir,m[len(cwd)+1:])
    if not os.path.exists(eta_frame_dir):
        os.makedirs(eta_frame_dir)
    eta_fname=os.path.join(eta_frame_dir,'eta%05d.png')
    print eta_fname;
    tick()
    eta=h5py.File(glob.glob(os.path.join(m,'data','*eta.h5'))[0])
    print('opened H5: %f'%tock())
    #eta_renderer.write_colorbar('eta_spectral.png')
    v=eta['data'].value
    print('got values: %f'%tock())
    frame=v[0].squeeze().T[::-1]
    print('got frame: %f'%tock())
    for n in range(-1,10):
        fname="test_%d.png"%n
        out=open(fname,'wb')
        tick()
        eta_renderer.writer(frame,out,compression=n)
        print("wrote %s: %f"%(fname,tock()))
        out.close()

#    for filename in viz.write_frames(v,eta_fname,eta_renderer,overwrite=False):
#        print(filename)
    eta.close()

# Plot water
#wtr=h5py.File('wet3_dwtr.h5');
#wtr_fname='wtr%05d.png';
#cdict = {'red':    ((0.0,0.0,0.0),(1.0,0.0,0.0)),
#         'green':  ((0.0,1.0,1.0),(1.0,1.0,1.0)),
#         'blue':   ((0.0,0.0,0.0),(1.0,0.0,0.0)),
#         'alpha':  ((0.0,0.0,0.0),(1.0,1.0,1.0))}
#
#cmap_wtr=LinearSegmentedColormap("alphagrn", cdict)
#cmap_wtr.set_under((1,1,1),alpha=0.0)
#
#wtr_max=wtr['data'].value.max()
#wtr_min=wtr['data'].value.min()
#print(wtr_max);
#print(wtr_min);
#wtr_renderer=viz.Renderer(wtr_min,wtr_max,cmap_wtr)
#wtr_renderer.write_colorbar('wtr.png')
#for filename in viz.write_frames(wtr['data'],wtr_fname,wtr_renderer,overwrite=False):
#    print(filename)
