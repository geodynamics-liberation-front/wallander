from config import configuration,add_logger
from pkg_resources import resource_string
import inspect
import logging
import numpy
import os
import response
import wallander
import cStringIO


LOG=logging.getLogger(__name__)
add_logger(LOG)

class BaseDataProvider(object):
    def __init__(self,name,configuration):
        self.name=name
        self.icon=os.path.join(self.__module__,wallander.ICONS,self.__module__+'.svg')
        self.data_dir=os.path.join(configuration['data_dir'],self.__module__)
        self.default_dir=os.path.join(configuration['data_dir'],'_default')
        self.frame_dir=os.path.join(configuration['frame_dir'],self.__module__)
        # Allow all numpy functions by default (may refine this later)
        self.functions={k:v for k,v in numpy.__dict__.items() if inspect.isfunction(v)}

    def apply_slice_function(self,frame,slice_function):
        if len(slice_function)>0:

            # slice the frame
            slc=slice_function.pop(0)
            LOG.debug("Slice: %s",slc)
            if all([c in '0123456789,:-[]' for c in slc]):
                frame=eval("frame[%s]"%slc)
            else:
                # if not a slice try it as a function
                slice_function.insert(0,slc)

            # apply a function to the frame
            while len(slice_function)>0:
                func=slice_function.pop(0)
                if func in self.functions:
                    frame=self.functions[func](frame)
                else:
                    raise LookupError("'%s' is neither a slice nor a function"%func)
        return frame

    def __call__(self,environ,start_response,path):
        LOG.debug("Checking path: %s",path)
        result=self.call(environ,start_response,path[:])
        # Handle special calls to methods that start with '_'
        if result==None and path[0][0:1]=='_':
            try:
                f=getattr(self,path[0])
                result=f(environ,start_response,path[1:])
            except AttributeError:
                result=None
        return result

    def _icons(self,environ,start_response,path):
        try:
            return resource_string(self.__module__+'._icons',path[0])
        except IOError:
            return resource_string('wallander._icons',path[0])
    
    def to_json(self):
            return {
                "type": "data_provider",
                "display_name": self.name,
                "name": self.__module__,
                "icon": self.icon
            }

class FrameDataProvider(object):
    def __init__(self):
        from application import DEFAULT_DATA_PROVIDER
        self.DEFAULT_DATA_PROVIDER=DEFAULT_DATA_PROVIDER
        
    def __call__(self,environ,start_response,path):
        data_provider=path.pop(0)
        dp=configuration['data_providers'].get(data_provider,self.DEFAULT_DATA_PROVIDER)
        return dp.render(environ,start_response,path)

class HTMLDataProvider(object):
    def __init__(self):
        self.html_dir=configuration['html_dir']
        self.index_files=configuration['index_files']

    def __call__(self,environ,start_response,path):
        LOG.debug("path: %s",str(path))
        file=os.path.realpath(os.path.join(self.html_dir,*path))
        LOG.debug("file: '%s'",file)
        if not file.startswith(self.html_dir) or not os.path.exists(file):
            response.respond_not_found(start_response)
        if os.path.isdir(file):
            ndx_file=None
            for f in self.index_files:
                f=os.path.join(file,f)
                if os.path.exists(f):
                    ndx_file=f
                    break
            if ndx_file==None:
                basename=os.path.basename(file)
                ndx_file=cStringIO()
                ndx_file.write("<html><head><title>%s</title></head><body><h1>%s</h1>\n"%(basename,basename))
                for f in os.listdir(file):
                    ndx_file.write('<a href="%s">%s</a></br>\n'%(f,f))
                ndx_file.write("</body></html>")
            file=ndx_file
        return response.respond_file(file,environ,start_response)

class DataSource(object):
    def __init__(self,file,data_provider):
        self.file=file
        self.data_provider=data_provider

    def to_json(self):
        return {
            "type": "folder",
            "name": os.path.basename(self.file),
            "children": self.children(),
            "icon": os.path.join(self.data_provider.__module__,wallander.ICONS,'folder.svg')
        }

    def children(self):
        files=[]
        for f in os.listdir(self.file):
            if not f.startswith('_'):
                type=None
                if os.path.isdir(os.path.join(self.file,f)):
                    type = 'folder'
                    icon=os.path.join(self.data_provider.__module__,wallander.ICONS,'folder.svg')
                else:
                    type = 'file'
                    icon=os.path.join(self.data_provider.__module__,wallander.ICONS,'file.svg')
                files.append({'name':f,'type':type,'icon':icon,'data_provider':self.data_provider.__module__})
        return files
