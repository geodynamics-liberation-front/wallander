import png
import matplotlib.pylab as plt
import numpy as np
from PIL import Image

jet=plt.get_cmap('jet')
filter=lambda x:x
compression=None
depth=8
norm=None

def as_rgba(a):
    nrm=norm if norm!=None else plt.Normalize(filter(a.min()),filter(a.max()))
    img=((2**depth-1)*jet(nrm(filter(a)))).astype(np.uint8)
    return img.reshape(img.shape[0],img.shape[1]*img.shape[2])

def write_png(a,out):
    comp = 6
    writer=png.Writer(size=a.shape[::-1],alpha=True,bitdepth=depth,compression=comp)
    nrm=norm if norm!=None else plt.Normalize(filter(a.min()),filter(a.max()))
    img=((2**depth-1)*jet(nrm(filter(a)))).astype(np.uint8)
    img=img.reshape(img.shape[0],img.shape[1]*img.shape[2])
    out_file=open(out,'wb')
    writer.write(out_file,img)
    out_file.close()

def write_pil(a,out):
    comp = 6
    nrm=norm if norm!=None else plt.Normalize(filter(a.min()),filter(a.max()))
    img=((2**depth-1)*jet(nrm(filter(a)))).astype(np.uint8)
    i=Image.fromarray(img,'RGBA')
    i.save(out,compress_level=comp,bits=depth)
