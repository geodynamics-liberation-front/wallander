import json
import make_json_serialize_objects
import logging 
import os
import glob
import traceback
import mimetypes
import h5py
import numpy as np
import urlparse
import viz
import stagyy.model as stag_model

make_json_serialize_objects
LOG=logging.getLogger(__name__)

mimetypes.add_type('text/plain','')

SERVER_VERSION='0.1.0'
SERVER_HEADER='dv'

MODELS_URI='models'
CM_URI='colormaps'
PAR_FILE='par'
DATA_DIR='data'
IMG_DIR='img'

viz.alpha_colormap('alpha_green',0.0,1.0,0.0)

def visit_par(arg,dirname,names):
    if PAR_FILE in names:
        arg.append(dirname)

class Application(object):
    def __init__(self,server):
        self.model_dir=server['model_dir']
        self.html_dir=server['html_dir']
        self.model_names=[]
        self.models={}
        self.refresh();
        self.colormap_manager=viz.ColormapManager(os.path.join(self.html_dir,'img','colormaps'))
        self.gallery=viz.Gallery()
        self.gallery.register_renderer('ed',viz.Log10Renderer,{})
        self.gallery.register_renderer('stress',viz.Log10Renderer,{'vmax':1e10,'vmin':1e5})
        self.gallery.register_renderer('eta',viz.Log10Renderer,{'colormap':'PuBu','under_color':'2DD6D6','under_alpha':0.2,'vmin':1e19,'vmax':1e24})
        self.gallery.register_renderer('dwtr',viz.Renderer,{'colormap':'alpha_green'})
        self.gallery.daemon=True
        self.gallery.start()
        self.handlers={}
        self.handlers['models']=self.model_handler
        self.handlers['colormaps']=self.colormap_handler
        self.handlers['refresh']=self.colormap_handler

    def __call__(self,environ,start_response):
        try:
            path=[p for p in environ['PATH_INFO'].split('/') if p!='']
            head='' if path==[] else path.pop(0)
            handler=self.handlers.get(head)
            if handler==None:
                handler=self.file_handler
            response=handler(environ,start_response,path)
            if response==None:
                response = respond_not_found(start_response)
            return response
        except:
            traceback.print_exc()
            return respond_not_found(start_response)

    def refresh(self):
        models=[]
        os.path.walk(self.model_dir,visit_par,models)
        self.model_names=[m[len(self.model_dir):] for m in models]
        self.models={m:Model(m,os.path.join(self.model_dir,m[1:])) for m in self.model_names}


    def refresh_handler(self,environ,start_response,path):
        self.refresh()
        return respond_ok(self.model_names,start_response)

    def file_handler(self,environ,start_response,path):
        file=os.path.realpath(os.path.join(self.html_dir,environ['PATH_INFO'][1:]))
        if file.startswith(self.html_dir):
            if os.path.isdir(file):
                file=os.path.join(file,"index.html")
            return respond_file(file,environ,start_response)
        return None

    def colormap_handler(self,environ,start_response,path):
        if path==[]: 
            return respond_ok(self.colormap_manager.get_colormaps(),start_response)
        else:
            orrientation=path.pop(0)
            if orrientation=='h':
                return respond_file(self.gallery.colormap_manager.get_hcolormap(path[0]),environ,start_response)
            elif orrientation=='v':
                return respond_file(self.gallery.colormap_manager.get_vcolormap(path[0]),environ,start_response)
        return None

    def model_handler(self,environ,start_response,path):
        if path==[]: 
            return respond_ok(self.model_names,start_response)
        else:
            model=None
            m=''
            while len(path)>0:
                m+='/'+path.pop(0)
                if m in self.models:
                    model=self.models[m]
                    break
            if model==None: return None

            if len(path)>1: 
                field_name = path.pop(0)
                if field_name in model.fields: 
                    field=model.fields[field_name]
                    action = path.pop(0)
                    if action.endswith('.png'):
                        frame_num=int(action[:-4])
                        q=dict(urlparse.parse_qsl(environ['QUERY_STRING'],True))
                        renderer_name=q['renderer'] if 'renderer' in q else field.name
                        img_file=self.gallery.get_img(model.img_dir,renderer_name,frame_num,q)
                        if img_file==None:
                            frame=field.frames[frame_num]
                            img_file=self.gallery.render_img(model.img_dir,renderer_name,frame_num,frame,q)


                        return respond_file(img_file,environ,start_response)
                    elif action=='render':
                        q=dict(urlparse.parse_qsl(environ['QUERY_STRING'],True))
                        renderer_name=q['renderer'] if 'renderer' in q else field.name
                        self.gallery.enqueue(model,field.name,renderer_name,q)
                        return respond_ok('rendering',start_response)
                    elif action=='progress':
                        q=dict(urlparse.parse_qsl(environ['QUERY_STRING'],True))
                        renderer_name=q['renderer'] if 'renderer' in q else field.name
                        result=self.gallery.progress(model,field.name,renderer_name,q)
                        return respond_ok(result,start_response)
                    elif action=='timesteps':
                        return respond_ok(field.timesteps,start_response)
                    elif action=='max':
                        return respond_ok(field.max,start_response)
                    elif action=='min':
                        return respond_ok(field.min,start_response)
                    elif action=='shape':
                        return respond_ok(field.shape,start_response)
                    elif action=='frame':
                        action = path.pop(0)
                        try:
                            v=eval("field.frames[%s]"%action)
                        except IndexError:
                            return respond_ok(None,start_response)
                        if len(path)==0:
                            return respond_ok(v,start_response)
                        action = path.pop(0)
                        if action=='max':
                            return respond_ok(v.max(),start_response)
                        elif action=='min':
                            return respond_ok(v.min(),start_response)
                        else:
                            return None
                    else:
                        try:
                            v=eval("field[%s]"%action)
                        except IndexError:
                            return respond_ok(None,start_response)
                        if len(path)==0:
                            return respond_ok(v,start_response)
                        action = path.pop(0)
                        if action=='max':
                            return respond_ok(v.max(),start_response)
                        elif action=='min':
                            return respond_ok(v.min(),start_response)
                        else:
                            return None
                elif field_name=='par':
                    result=model.par[path.pop(0)]
                    if len(path)>0:
                        result=result[path.pop(0)]
                    return respond_ok(result,start_response)
                else:
                    return None

            if len(path)==1:
                model_property=path.pop(0)
                if model_property=='name':
                    return respond_ok(model.name,start_response)
                elif model_property=='fields':
                    return respond_ok(model.fields.keys(),start_response)
                elif model_property=='par':
                    return respond_file(model._par_file,environ,start_response)
                elif model_property in model.fields:
                    return respond_file(model.fields[model_property].file,environ,start_response,model_property+".h5")
                elif model_property=='timesteps':
                    # Assume that there is always an eta field
                    return respond_ok(model.timesteps,start_response)
                else:
                    return None
            else:
                return respond_ok(model,start_response)

def respond_not_found(start_response):
    start_response('404 NOT FOUND',[('Content-Type', 'text/html')])
    return iter(["<html><head><title>404 NOT FOUND</title></head><body>404 NOT FOUND</body></html>"])

def respond_ok(v,start_response):
    start_response('200 OK', [('Content-Type', 'application/json')])
    return iter([json.dumps(v)])

def respond_file(f,environ,start_response,name=None):
    out_file=open(f,'rb')
    headers=[]
    ct=mimetypes.guess_type(f)[0]
    ct=ct if ct!=None else 'application/octet-stream'
    headers.append(('Content-Type', ct))
    cl=str(os.path.getsize(f))
    headers.append(('Content-Length', cl))
    if name!=None:
        headers.append(('Content-Disposition', 'attachment; filename="%s"'%name))
    start_response('200 OK', headers)
    if 'wsgi.file_wrapper' in environ:
            return environ['wsgi.file_wrapper'](out_file, 2048)
    else:
            return iter(lambda: out_file.read(2048), '')

class JSONResponse(object):
    def __init__(self,*args):
        self.i=iter(args)

    def __iter__(self):
        return self

    def next(self):
        v=self.i.next()
        if isinstance(v,np.generic):
            v=np.asscalar(v)
            if isinstance(v,float):
                if v>1e6:
                    v='%e'%v
        elif isinstance(v,np.ndarray):
            v=v.tolist()
        return json.dumps(v)

class Model(object):
    def __init__(self,name,model_dir):
        LOG.debug("Creating model %s from %s"%(name,model_dir))
        self.name=name
        self._par_file=os.path.join(model_dir,PAR_FILE)
        self._data_dir=os.path.join(model_dir,DATA_DIR) 
        self.img_dir=os.path.join(model_dir,IMG_DIR)
        if not os.path.exists(self.img_dir):
            os.makedirs(self.img_dir)
        self.fields={f.name:f for f in [Field(s) for s in  glob.glob(os.path.join(self._data_dir,'*.h5'))]}
        self._timesteps=None;
        self.par=stag_model.Par(self._par_file)
        # The dimensional size of the model
        self.Lz=self.par['geometry']['D_dimensional']
        self.Lx=self.Lz*self.par['geometry']['aspect_ratio(1)']
        # The grid is in the fields so get the 'eta' field
        for f in self.fields.values():
            if 'data' in f.h5 and 'x' in f.h5 and 'z' in f.h5:
                field=f
                break
            else:
                f.close()
        LOG.debug("Using field %s to get grid data",str(field))
        # The grid size of the model
        LOG.debug("Field shape %s",str(field.shape))
        self.nx,self.nz=field.shape[1:]
        # The pixel size of the model
        self.dx=self.Lx/self.nx
        self.dz=self.Lz/self.nz
        self.x=field.x
        self.z=field.z
        # air and grid refinement layers
        self.air=self.par['boundaries']['air_thickness']
        field.close()

    @property
    def timesteps(self):
        if self._timesteps==None:
            for f in self.fields.values():
                if 'frame' in f.h5:
                    field=f
                    break
                else:
                    f.close()
            self._timesteps=field.timesteps
            field.close()
        return self._timesteps

    def close(self):
        for field in self.fields.values():
            field.close()

    def to_json(self):
        return {'name': self.name, 
           'par': 'par', 
           'fields': self.fields.keys(),
           'air': self.air,
           'Lz': self.Lz,
           'Lx': self.Lx,
           'nx': self.nx,
           'nz': self.nz,
           'dx': self.dx,
           'dz': self.dz,
           'x': self.x,
           'z': self.z,
           }
        
    def __getitem__(self,key):
        return self.fields[key]

class Field(object):
    def __init__(self,file):
        self._lastaccess=0
        self._open=False
        self.file=file
        self.name=file[file.rfind('_')+1:file.rfind('.')]
        self._h5File=None
        self._h5Data=None
        self._min=None
        self._max=None
        self._value=None
        self._frames=None
        self._timesteps=None
        self._x=None
        self._y=None
        self._z=None

    def __str__(self):
        return "Field(%s)"%self.name

    def __repr__(self):
        return self.__str__()

    def __getitem__(self,key):
        return self.value[key]

    def close(self):
        if not self._h5File==None:
            self._h5File.close()
            self._h5File=None
            self._h5Data=None

    @property
    def h5(self):
        if self._h5File==None:
            LOG.debug("Opening H5 file %s",self.file)
            self._h5File=h5py.File(self.file,'r')
            # if there is an interploated image, use that
            if 'image' in self._h5File:
                LOG.debug('using interpolated image')
                self._h5Data=self._h5File['image']
            else:
                self._h5Data=self._h5File
        return self._h5Data

    @property
    def x(self):
        if self._x==None:
            self._x=self.h5['x'].value
        return self._x

    @property
    def y(self):
        if self._y==None:
            self._y=self.h5['y'].value
        return self._y

    @property
    def z(self):
        if self._z==None:
            self._z=self.h5['z'].value
        return self._z

    @property
    def value(self):
        if self._value==None:
            self._value=self.h5['data'].value
        return self._value

    @property
    def timesteps(self):
        if self._timesteps==None:
            self._timesteps=self.h5['frame'].value
        return self._timesteps

    @property
    def frames(self):
        if self._frames==None:
            self._frames=np.transpose(self.value.squeeze(),(0,2,1))[:,::-1,:]
        return self._frames

    @property
    def min(self):
        if self._min==None:
            self._min=self.value.min()
        return self._min

    @property
    def max(self):
        if self._max==None:
            self._max=self.value.max()
        return self._max

    @property
    def shape(self):
        shape=self.h5['data'].shape
        return shape[:1]+tuple((n for n in shape[1:] if n>1))
