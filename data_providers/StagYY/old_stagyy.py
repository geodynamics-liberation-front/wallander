import logging
import h5py
import os
import wallander
import wallander.cache as cache
import wallander.data_providers as data_provider
from config import configuration

LOG=logging.getLogger(__name__)


def is_h5_folder(fname):
    return os.path.isdir(fname) and any([ f.endswith('.h5') for f in os.listdir(fname)])

class H5DataProvider(data_provider.BaseDataProvider):
    def __init__(self,name="HDF5"):
        super(H5DataProvider, self).__init__(name,configuration)
        self.cache=cache.TimedCache(create=self.create_datasource,distroy=self.distroy_datasource)

    def create_datasource(self,fname):
        return H5DataSourceFolder(fname,self.cache)

    def distroy_datasource(self,ds):
        return

    def call(self,environ,start_response,path):
        fname=self.data_dir
        slice_function=[]
        fname=os.path.join(self.data_dir,*path)
        LOG.debug("Checking path: %s",fname)
        while not os.path.isdir(fname):
            slice_function.insert(0,path.pop())
            fname=os.path.join(self.data_dir,*path)
            LOG.debug("Checking path: %s",fname)

        response=None
        # check if it is an HDF5 model
        if is_h5_folder(fname):
            # Get the H5 model
            response=self.cache[fname]
            # check if it is a data source
            if len(slice_function)>0:
                field=slice_function.pop(0)
                # Get the field from the model
                if field.endswith('.h5'): # send the file
                    response=open(os.path.join(response.directory,field))
                else:
                    response=response[field]
                if len(slice_function)>0:
                    response=self.apply_slice_function(response,slice_function)
        elif len(slice_function)>0:
            LOG.debug("Requested folder with extra path info")
            response=None
        elif os.path.isdir(fname):
            response=H5Folder(fname)
            if fname==self.data_dir: #root directory
                LOG.debug("Root")
                response.icon=self.icon
        else:
            response=open(fname)

        return response


class H5Folder(object):
    """Just a regular folder in the data provider path, but it knows an H5Folder child when it sees it"""
    def __init__(self,directory):
        self.directory=directory
        self.icon=os.path.join(self.__module__,wallander.ICONS,'folder.svg')

    def to_json(self):
        return {
            "type": "folder",
            "name": os.path.basename(self.directory),
            "icon": self.icon,
            "children": self.children()
        }

    def children(self):
        files=[]
        for f in os.listdir(self.directory):
            if not f.startswith('_'):
                fullpath=os.path.join(self.directory,f)
                if is_h5_folder(f):
                    files.append(DATA_PROVIDER.cache[fullpath].to_json(include_children=False))
                elif os.path.isdir(fullpath):
                    icon=os.path.join(self.__module__,wallander.ICONS,'folder.svg')
                    files.append({'name':f,'type':'folder','icon':icon})
                else:
                    icon=os.path.join(self.__module__,wallander.ICONS,'file.svg')
                    files.append({'name':f,'type':'file','icon':icon})
        return files

class H5DataSourceFolder(object):
    """Creates a data source where each data field is stored in it's own hdf5 file"""
    def __init__(self,directory,cache,icon='h5.svg'):
        self.directory=directory
        self.cache=cache
        self.fields={}
        self.icon=os.path.join(self.__module__,wallander.ICONS,icon)

    def to_json(self,include_children=True):
        json= {
            "type": "data_source",
            "name": os.path.basename(self.directory),
            "icon": self.icon
        }
        if include_children:
            json["children"]=self.children()
        return json

    def children(self):
        files=[]
        for f in os.listdir(self.directory):
            if f.endswith('.h5'):
                icon=os.path.join(self.__module__,wallander.ICONS,'h5.svg')
                files.append({'name':f,'type':'data_field','icon':icon})
        return files
    
    def __getitem__(self, key):
        pass

    def __setitem__(self, key, value):
        pass

    def __delitem__(self, key):
        pass

    def __iter__(self):
        pass

    def __len__(self):
        pass

class H5DataField(object):
    def __init__(self,file,data,timestep,x,y):
        self.file=file
        self.name=os.path.splitext(os.path.basename(file))[0]
        self.data_name=data
        self.x_name=x
        self.y_name=y
        self.timestep_name=timestep
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
        return self.data[key]

    @property
    def data(self):
        if self._h5Data==None:
            self._h5Data=self.h5[self.data_name]
        return self._h5Data

    @property
    def h5(self):
        LOG.debug("_h5File: %s",self._h5File)
        if self._h5File==None:
            LOG.debug("Opening H5 file %s",self.file)
            self._h5File=h5py.File(self.file,'r')
        return self._h5File

    def close(self):
        if not self._h5File==None:
            self._h5File.close()
            self._h5File=None
            self._h5Data=None

    def to_json(self):
        return {
            "type": "data_source",
            "name": self.name
        }

#class StagYYDataSource(wallander.DataSource):
#    def to_json(self):
#        if is_h5_folder(self.file):
#            return {
#                "type": "data_source",
#                "name": os.path.basename(self.file),
#                "icon": os.path.join(self.data_provider.__module__,wallander.ICONS,'stagyy.svg'),
#                "children": self.stagyy_children()
#            }
#        else:
#            return super(StagYYDataSource, self).to_json()
#
#    def children(self):
#        files=[]
#        for f in os.listdir(self.file):
#            if not f.startswith('_'):
#                type=None
#                fname=os.path.join(self.file,f)
#                if is_stagyy_model(fname):
#                    type = 'folder'
#                    icon=os.path.join(self.data_provider.__module__,wallander.ICONS,'stagyy.svg')
#                elif os.path.isdir(os.path.join(self.file,f)):
#                    type = 'folder'
#                    icon=os.path.join(self.data_provider.__module__,wallander.ICONS,'folder.svg')
#                else:
#                    type = 'file'
#                    icon=os.path.join(self.data_provider.__module__,wallander.ICONS,'file.svg')
#                files.append({'name':f,'type':type,'icon':icon,'data_provider':self.data_provider.__module__})
#        return files




DATA_PROVIDER=H5DataProvider()
