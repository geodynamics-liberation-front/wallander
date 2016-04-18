import json
import logging

# The logger
LOG=logging.getLogger(__name__)

class Manager(object):
    def __init__(self):
        pass

    def get_handler(path_file):
        return None

class Handler(object):
    def __init__(self):
        pass

    def __call__(self,environ,start_response,path):
        pass

    def can_handle(path):
        return False


class DefaultHandler(Handler):
    def __init__(self,default_file='index.html'):
        self.default_file=default_file
   
    def __call__(self,environ,start_response,path):
        pass

    def can_handle(path):
        return False

class JSONResponse(object):
    def __init__(self,*args):
        self.i=iter(args)

    def __iter__(self):
        return self

    def next(self):
        v=self.i.next()
        return json.dumps(v)


#        # Load the data providers 
#        self.data_providers={}
#        directory=server['lib_dir']
#        for name in [d for d in os.listdir(directory) if os.path.isdir(os.path.join(directory,d))]:
#            LOG.debug('searching for data provider module %s',name)
#            file,pathname,description=imp.find_module(name,[directory])
#            data_module=imp.load_module("dp_"+name,file,pathname,description)
#            self.data_providers[name]=data_module.init(self)
#            try:
#                map(data_module.LOG.addHandler,server['log_handlers'])
#            except:
#                LOG.warn('Data provider module %s has not LOG',name)
#
#        # register the data stores
#        self.data_stores={}
#        directory=server['data_dir']
#        for data_dir in [d for d in os.listdir(directory) if os.path.isdir(os.path.join(directory,d))]:
#            LOG.debug('searching for data store %s',data_dir)
#            file,pathname,description=imp.find_module('config',[os.path.join(directory,data_dir)])
#            data_config=imp.load_module("config",file,pathname,description)
#            self.data_stores[data_dir]=self.data_providers[data_config.data_provider]


#    def data_handler(self,environ,start_response,path):
#        data=None
#        if len(path)==0:
#            data=[{'name': k, 'type': 'data_source'} for k in self.data_stores.keys()]
#        else:
#            data_store=path[0]
#            data_provider=self.data_stores[data_store]
#            data=data_provider(environ,path,self)
#
#        if data==None:
#            return respond_not_found(start_response)
#        elif hasattr(data,'read'):
#            return respond_file(data,environ,start_response)
#        else:
#            return respond_ok(data,start_response)
#
#    def file_handler(self,environ,start_response,path):
#        file=os.path.realpath(os.path.join(self.html_dir,environ['PATH_INFO'][1:]))
#        if file.startswith(self.html_dir):
#            if os.path.isdir(file):
#                file=os.path.join(file,"index.html")
#            return respond_file(file,environ,start_response)
#        return None
#
#    def colormap_handler(self,environ,start_response,path,gallery):
#        if path==[]: 
#            return respond_ok(self.colormap_manager.get_colormaps(),start_response)
#        else:
#            orrientation=path.pop(0)
#            if orrientation=='h':
#                return respond_file(self.gallery.colormap_manager.get_hcolormap(path[0]),environ,start_response)
#            elif orrientation=='v':
#                return respond_file(self.gallery.colormap_manager.get_vcolormap(path[0]),environ,start_response)
#        return None
