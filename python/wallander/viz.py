import logging 
import os
import numpy as np
import re
import response
import Queue
import contour
from matplotlib.pylab import Normalize, register_cmap, colormaps, get_cmap
from matplotlib.colors import LinearSegmentedColormap 
from threading import Thread
from config import configuration
import png

# The logger for this module
LOG=logging.getLogger(__name__)

# Colormap Regular Expression
# Has the following capture groups: name, min, max, under color, over color, bad color
regex={
    'letters_numbers': '[a-zA-Z0-9\-]*',
    'float': '[+-]?\d+(?:\.\d*)?(?:e[+-]?\d+)?',
    'hex': '[a-fA-F0-9]*' }

# colormap_min_max_under_over_bar
CM_RE=re.compile('(%(letters_numbers)s)_?(%(float)s)?_?(%(float)s)?_?(%(hex)s)?_?(%(hex)s)?_?(%(hex)s)?'%regex)
# field.{colormap|contours}.frame.extension
FRAME_RE=re.compile('([a-zA-Z0-9]+)\.(.*)\.(\d+)\.([a-z]+)')

RENDERERS={}

COLORBAR_ARRAY=np.tile(np.linspace(0,255,256),(10,1))
COLORBAR_ARRAY_UNDER=np.tile(np.concatenate((-1*np.ones(10),np.linspace(0,255,246))),(10,1))
COLORBAR_ARRAY_OVER= np.tile(np.concatenate((np.linspace(0,255,246),256*np.ones(10))),(10,1))
COLORBAR_ARRAY_UNDER_OVER=np.tile(np.concatenate((-1*np.ones(10),np.linspace(0,255,236),256*np.ones(10))),(10,1))

class FrameDataProvider(object):
    def __call__(self,environ,start_response,path):
        LOG.debug('Path: %s',path)
        image_file=os.path.join(configuration['frame_dir'],*path)
        LOG.debug("Image file: %s",image_file)
        if len(path)>0 and path[0][0:1]=='_':
            try:
                f=getattr(self,path[0])
                return f(environ,start_response,path[1:])
            except AttributeError:
                return response.respond_not_found(start_response)
        else:
            data_provider=path.pop(0)
            image=path.pop()
            LOG.debug("Data provider name: '%s'",data_provider)
            LOG.debug("Frame: '%s'",image)
            m=FRAME_RE.match(image)
            if m:
                image_dir=os.path.dirname(image_file)
                if not os.path.exists(image_dir):
                    os.makedirs(image_dir)

                field,renderer_string,frame_number,extension=m.groups()
                frame_number=int(frame_number)
                LOG.debug("Field: %s, Frame Number: %d, Renderer: %s, Extension %s",field,frame_number,renderer_string,extension)
                path.append(field)
                path.append(str(frame_number))
                dp=configuration['data_providers'].get(data_provider)
                LOG.debug("Data provider: %s",str(dp))
                frame=dp.call(environ,start_response,path)
                renderer=get_renderer(renderer_string)
                renderer.write(frame,image_file)
                return response.respond_file(image_file,environ,start_response)
            else:
                LOG.warning('%s does not match regular expression',image)
                return response.respond_not_found(start_response)

    def _render_all(self,environ,start_Response,path):
        pass
    def _colormaps(self,environ,start_response,path):
        return response.respond_ok([c for c in colormaps() if not c.endswith('_r')],start_response)
    def _colorbar(self,environ,start_response,path):
        renderer=Renderer(os.path.splitext(path[0])[0])
        array=COLORBAR_ARRAY
        if renderer.cmap._rgba_under and renderer.cmap._rgba_over:
            array=COLORBAR_ARRAY_UNDER_OVER
        elif renderer.cmap._rgba_under:
            array=COLORBAR_ARRAY_UNDER
        elif renderer.cmap._rgba_over:
            array=COLORBAR_ARRAY_OVER
        image_dir=os.path.join(configuration['frame_dir'],'_colorbar')
        if not os.path.exists(image_dir): os.makedirs(image_dir)
        image_file=os.path.join(image_dir,path[0])
        renderer.write(array,image_file)
        return response.respond_file(image_file,environ,start_response)

class ContourDataProvider(object):
    def __call__(self,environ,start_response,path):
        LOG.debug('Path: %s',path)
        image_file=os.path.join(configuration['frame_dir'],*path)
        LOG.debug("Image file: %s",image_file)
        if len(path)>0 and path[0][0:1]=='_':
            try:
                f=getattr(self,path[0])
                return f(environ,start_response,path[1:])
            except AttributeError:
                return response.respond_not_found(start_response)
        else:
            data_provider=path.pop(0)
            image=path.pop()
            LOG.debug("Data provider name: '%s'",data_provider)
            LOG.debug("Frame: '%s'",image)
            m=FRAME_RE.match(image)
            if m:
                image_dir=os.path.dirname(image_file)
                if not os.path.exists(image_dir):
                    os.makedirs(image_dir)

                field,contour_string,frame_number,extension=m.groups()
                frame_number=int(frame_number)
                contours=contour_string.split('_')
                LOG.debug("Field: %s, Frame Number: %d, Contour: %s, Extension %s",field,frame_number,contour_string,extension)

                path.append(field)
                path.append(str(frame_number))
                dp=configuration['data_providers'].get(data_provider)
                LOG.debug("Data provider: %s",str(dp))
                frame=dp.call(environ,start_response,path)

                contour.write_contour(frame,contours,image_file)
                return response.respond_file(image_file,environ,start_response)
            else:
                LOG.warning('%s does not match regular expression',image)
                return response.respond_not_found(start_response)

    def _render_all(self,environ,start_Response,path):
        pass

class ArrowDataProvider(object):
    def __call__(self,environ,start_response,path):
        pass

def get_renderer(name):
    r=RENDERERS.get(name)
    if not r:
        r=Renderer(name)
        RENDERERS[name]=r
    return r

class Renderer(object):
    def __init__(self,name):
        self.name=name
        self.log=False
        self.filter=lambda x:x
        self.vmin=None
        self.vmax=None
        self._norm=None
        self.compression=6
        self.set_depth(8)

        m=CM_RE.match(name)
        if m!=None:
            LOG.debug("%s -> %s",name,repr(m.groups()))
            cmap,min_val,max_val,under_color,over_color,bad_color=m.groups()
            if cmap.endswith('-log'):
                self.filter=np.log10
                self.log=True
                cmap=cmap[:-4]
            self.cmap=get_cmap(cmap)

            if min_val and max_val: 
                self.set_minmax(float(min_val),float(max_val))

            if under_color: self.cmap.set_under('#'+under_color[:6],alpha=int(under_color[6:],16)/255.0 if under_color[6:] else 1.0)
            if over_color: self.cmap.set_over('#'+over_color[:6],alpha=int(over_color[6:],16)/255.0 if over_color[6:] else 1.0)
            if bad_color: self.cmap.set_bad('#'+bad_color[:6],alpha=int(bad_color[6:],16)/255.0 if bad_color[6:] else 1.0)

        try:
            from PIL import Image
            self.Image=Image
            self._write=self._write_pil
            LOG.debug('Using PIL for image writing')
        except ImportError:
            self._write=self._write_png
            LOG.debug('Using PNG for image writing')

    def set_depth(self,depth):
        self._depth=depth
        if depth==64:
            self._dtype=np.uint64
        elif depth==32:
            self._dtype=np.uint32
        elif depth==16:
            self._dtype=np.uint16
        else:
            self._dtype=np.uint8
        self._max_val=2**depth-1

    def get_depth(self):
        return self._depth;

    def set_minmax(self,vmin,vmax):
        self.vmin=min(vmin,vmax)
        self.vmax=max(vmin,vmax)    
        self.set_normalize(Normalize(self.filter(vmin),self.filter(vmax)))

    def get_minmax(self):
        return (self.vmin,self.vmax)

    def set_normalize(self,norm):
        self._norm=norm

    def get_normalize(self):
        return self._norm

    def _write_png(self,img,out,comp):
        LOG.debug("shape: %s",img.shape)
        size=img.shape[1::-1]
        img=img.reshape(img.shape[0],img.shape[1]*img.shape[2])
        LOG.debug("reshape: %s",img.shape)
        writer=png.Writer(size=size,alpha=True,bitdepth=self._depth,compression=comp)
        out_file=open(out,'wb')
        writer.write(out_file,img)
        out_file.close()

    def _write_pil(self,img,out,comp):
        i=self.Image.fromarray(img,'RGBA')
        i.save(out,compress_level=comp,bits=self._depth)

    def _write(self,img,out,comp):
        assert False, "The renderer _write method should have been set to either _write_png or _write_pil"

    def write(self,frame,out_filename,compression=None):
        comp = compression or self.compression 
        norm = self._norm or Normalize(self.filter(frame.min()),self.filter(frame.max()))
        img=(self._max_val*self.cmap(norm(self.filter(frame)))).astype(self._dtype)
        self._write(img,out_filename,comp)

    def _colorbar_array(self,colors,size):
        ncolors=2**self._depth if colors==None else colors
        spacer=np.logspace if self.log else np.linspace
        return np.vstack([spacer(ncolors,0,ncolors)]*size)

    def write_h_colorbar(self,out,colors=None,height=20):
        a = self._colorbar_array(colors,height)[:,::-1]
        self.write(a,out)

    def write_v_colorbar(self,out,colors=None,width=20):
        a = self._colorbar_array(colors,width).T
        self.write(a,out)

#TODO: move this out of viz to the StagYY data provider
def litho_colormap(min,max,boundary=1600.0,width=20):
    if boundary<min or boundary>max:
        bndry=max-50
        b=(bndry-min)/(max-min)
    else:
        b=(boundary-min)/(max-min)

    cdict  = {'red':  ((                  0.0, 0.0 , 0.0),
                       (    (width-1)*b/width, 0.0 , 0.0),
                       (                    b, 0.8 , 1.0),
                       (((width-1)*b+1)/width, 1.0 , 1.0),
                       (                  1.0, 0.4 , 1.0)),

             'green': ((                  0.0, 0.0 , 0.0),
                       (    (width-1)*b/width, 0.0 , 0.0),
                       (                    b, 0.9 , 0.9),
                       (((width-1)*b+1)/width, 0.0 , 0.0),
                       (                  1.0, 0.0 , 0.0)),

             'blue':  ((                  0.0, 0.0 , 0.4),
                       (    (width-1)*b/width, 1.0 , 1.0),
                       (                    b, 1.0 , 0.8),
                       (((width-1)*b+1)/width, 0.0 , 0.0),
                       (                  1.0, 0.0 , 0.0))}

    cm=LinearSegmentedColormap('Lithosphere%d'%boundary, cdict)
    register_cmap(cmap=cm)
    return cm

def alpha_colormap(name,red,green,blue,alpha_min=0.0,alpha_max=1.0):
    cdict = {'red':    ((0.0,red,red),
                        (1.0,red,red)),
             'green':  ((0.0,green,green),
                        (1.0,green,green)),
             'blue':   ((0.0,blue,blue),
                        (1.0,blue,blue)),
             'alpha':  ((0.0,alpha_min,alpha_min),
                        (1.0,alpha_max,alpha_max))}
    cm=LinearSegmentedColormap(name, cdict)
    register_cmap(cmap=cm)
    return cm


def write_frames(frames,filename,renderer,filter=lambda x:x,overwrite=True):
    n=0
    for d in frames:
        fname=filename%n
        if overwrite or not os.path.exists(fname):
            frame=filter(d.squeeze().T[::-1])
            renderer.write(frame,fname)
        yield fname
        n+=1

class Gallery(Thread):
    def __init__(self):
        super(Gallery, self).__init__()
        self.img_queue=Queue.Queue()
        self._renderers={}
        self._renderer_classes={}
        self._progress={}
        self.running=False

    def get_img(self,dir,renderer_name,frame_num,kwargs):
        r_class,init_args,defaults=self.get_renderer(renderer_name)
        custom_args=[i for i in kwargs.items() if i[0] in init_args]
        args_str=self.kwargs_to_str(renderer_name,custom_args)
        args=defaults.copy()
        args.update(custom_args)
        img_file=os.path.join(dir,"%s-%05d.png"%(args_str,frame_num))
        if os.path.exists(img_file):
            return img_file
        else:
            return None

    def render_img(self,dir,renderer_name,frame_num,frame,kwargs):
        r_class,init_args,defaults=self.get_renderer(renderer_name)
        custom_args=[i for i in kwargs.items() if i[0] in init_args]
        args_str=self.kwargs_to_str(renderer_name,custom_args)
        args=defaults.copy()
        args.update(custom_args)
        img_file=os.path.join(dir,"%s-%05d.png"%(args_str,frame_num))
        if os.path.exists(img_file):
            return img_file
        try:
            renderer=self._renderers[args_str]
        except KeyError:
            renderer=r_class(**args)
            self._renderers[args_str]=renderer
        out=open(img_file,'wb')
        renderer.write(frame,out)
        out.close()
        return img_file

    def progress(self,model,field_name,renderer_name,kwargs):
        r_class,init_args,defaults=self.get_renderer(renderer_name)
        custom_args=[i for i in kwargs.items() if i[0] in init_args]
        args_str=self.kwargs_to_str(renderer_name,custom_args)
        return self._progress[model.name+field_name+args_str]

    def enqueue(self,model,field_name,renderer_name,kwargs):
        r_class,init_args,defaults=self.get_renderer(renderer_name)
        custom_args=[i for i in kwargs.items() if i[0] in init_args]
        args_str=self.kwargs_to_str(renderer_name,custom_args)
        args=defaults.copy()
        args.update(custom_args)
        try:
            renderer=self._renderers[args_str]
        except KeyError:
            renderer=r_class(**args)
            self._renderers[args_str]=renderer
        self.img_queue.put( (model,field_name,renderer,args_str) )
        
    def run(self):
        LOG.info("Gallery thread started")
        self.running=True;
        while self.running:
            try:
                model,field_name,renderer,args_str=self.img_queue.get(True,100)
                LOG.debug("rendering %s begun",args_str)
                img_pattern=os.path.join(model.img_dir,"%s-%%05d.png"%args_str)
                data=model[field_name].frames
                frame_count=data.shape[0]
                for frame_num in xrange(frame_count):
                    LOG.debug("rendering frame %d/%d",frame_num,frame_count)
                    img_file=img_pattern%frame_num
                    if not os.path.exists(img_file):
                        out=open(img_file,'wb')
                        renderer.write(data[frame_num],out)
                        out.close()
                    self._progress[model.name+field_name+args_str]=(frame_num+1,frame_count)
                LOG.debug("rendering %s compelete",args_str)

            except Queue.Empty:
                pass
