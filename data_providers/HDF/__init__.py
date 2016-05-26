import logging
import h5py
import os
import wallander
import wallander.cache as cache
import wallander.data_providers as data_providers
from config import configuration

LOG=logging.getLogger(__name__)

class H5DataProvider(data_providers.BaseDataProvider):
    def __init__(self,name="HDF"):
        super(H5DataProvider, self).__init__(name,configuration)
        self.cache=cache.TimedCache(create=self._create_datasource,distroy=self._distroy_datasource)
        self.folder=H5Folder

    def _create_datasource(self,fname):
        return H5DataSource(fname,'/'+self.__module__+fname[len(self.data_dir):],self.cache)

    def _distroy_datasource(self,ds):
        return

    def is_source(self,fname):
        return os.path.isdir(fname) and any([ f.endswith('.h5') for f in os.listdir(fname)])

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
        # check if it is an HDF Data Source
        if self.is_source(fname):
            # Get the H5 model
            response=self.cache[fname]
            # check if it is a data source
            if len(slice_function)>0:
                field=slice_function.pop(0)
                response=response[field]
                LOG.debug("Field %s resolves to %s",field,response)

                if len(slice_function)>0:
                    response=response.data
                    response=self.apply_slice_function(response,slice_function)
        elif len(slice_function)>0:
            LOG.debug("Requested folder with extra path info")
            response=None
        elif os.path.isdir(fname):
            response=self.folder(fname,'/'+self.__module__+fname[len(self.data_dir):],self)
            if fname==self.data_dir: #root directory
                LOG.debug("Root")
                response.icon=self.icon
        else:
            response=open(fname)
        return response

class H5Folder(object):
    """Just a regular folder in the data provider path, but it knows an H5Folder child when it sees it"""
    def __init__(self,directory,path,data_provider):
        self.directory=directory
        self.path=path
        self.data_provider=data_provider
        self.icon=os.path.join(self.__module__,wallander.ICONS,'folder.svg')

    def to_json(self):
        return {
            "type": "folder",
            "name": os.path.basename(self.directory),
            "path": self.path,
            "icon": self.icon,
            "children": self.children()
        }

    def children(self):
        files=[]
        for f in os.listdir(self.directory):
            if not f.startswith('_'):
                fullpath=os.path.join(self.directory,f)
                if self.data_provider.is_source(fullpath):
                    LOG.debug("Child data source")
                    files.append(self.data_provider.cache[fullpath].to_json(include_children=False))
                elif os.path.isdir(fullpath):
                    LOG.debug("Child is a folder")
                    icon=os.path.join(self.__module__,wallander.ICONS,'folder.svg')
                    files.append({'name':f,'type':'folder','icon':icon})
                else:
                    icon=os.path.join(self.__module__,wallander.ICONS,'file.svg')
                    LOG.debug("Child is a file")
                    files.append({'name':f,'type':'file','icon':icon})
        return files

class H5DataSource(object):
    """Creates a data source where each data field is stored in it's own hdf5 file"""
    def __init__(self,directory,path,c,icon='h5_source.svg'):
        self.directory=directory
        self.path=path
        self.cache=cache.TimedCache(create=self._create_datafield,distroy=self._distroy_datafield,cache_invalidation_thread=c.cache_invalidation_thread)
        self.fields={}
        self.icon=os.path.join(self.__module__,wallander.ICONS,icon)

    def _create_datafield(self,field_name):
        kwargs={}
        attribute_file= os.path.join(self.directory,field_name+'.attributes')
        if os.path.exists(attribute_file):
            LOG.debug("Getting metadata from %s",attribute_file)
            execfile(attribute_file,{},kwargs)
        return H5DataField(os.path.join(self.directory,field_name+'.h5'),os.path.join(self.path,field_name),**kwargs)

    def _distroy_datafield(self,df):
        df.close()
        return

    def to_json(self,include_children=True):
        json= {
            "type": "data_source",
            "name": os.path.basename(self.directory),
            "path": self.path,
            "icon": self.icon
        }
        if include_children:
            json["children"]=self.children()
        return json

    def children(self):
        files=[]
        for f in os.listdir(self.directory):
            if f.endswith('.h5'):
                icon=os.path.join(self.__module__,wallander.ICONS,'h5_field.svg')
                basename,ext=os.path.splitext(f)
                files.append({'name':basename,'display_name':basename,'type':'data_field','icon':icon})
        return files
    
    def __getitem__(self, key):
        return self.cache[key]

    def __iter__(self):
        return iter(self.cache)

    def __len__(self):
        return len(self.cache)

class H5DataField(object):
    def __init__(self,filename,path,
                      dataset_name='data',time_dataset_name='time',
                      attribute_group_name='/',
                      unit_attribute_name='unit',dimension_unit_attribute_name='dimension_unit',
                      time_unit_attribute_name='time_unit',
                      time_format_attribute_name='time_format',
                      dimension_format_attribute_name='dimension_format',
                      format_attribute_name='format',data_type_attribute_name='data_type',
                      x0_attribute_name='x0',dx_attribute_name='dx',y0_attribute_name='y0',dy_attribute_name='dy',
                      renderer_attribute_name='renderer',
                      time_dataset=None,
                      unit=None, dimension_unit=None, time_unit=None,
                      dimension_format=None,time_format=None,
                      format=None,
                      data_type=None,
                      x0=None, dx=None, y0=None, dy=None,
                      renderer=None,
                      ):

        self.filename=filename
        self.path=path
        self.name=os.path.splitext(os.path.basename(filename))[0]
        self.display_name=self.name
        self.dataset_name=dataset_name
        self.time_dataset_name=time_dataset_name

        self._file=None
        self._data=None
        self._time=time_dataset
    
        attributes=self.h5[attribute_group_name].attrs
        self.unit=unit or attributes[unit_attribute_name]
        self.dimension_unit=dimension_unit or attributes[dimension_unit_attribute_name]
        self.dimension_format=dimension_format or attributes[dimension_format_attribute_name]
        self.time_unit=time_unit or attributes[time_unit_attribute_name]
        self.time_format=time_format or attributes[time_format_attribute_name]
        self.format=format or attributes[format_attribute_name]
        self.data_type=data_type or attributes[data_type_attribute_name]
        self.x0=x0 or attributes[x0_attribute_name]
        self.dx=dx or attributes[dx_attribute_name]
        if y0 or y0_attribute_name in attributes:
            self.y0=y0 or attributes[y0_attribute_name]
        if dy or dy_attribute_name in attributes:
            self.dy=dy or attributes[dy_attribute_name]
        self.renderer=renderer or attributes[renderer_attribute_name]



    def __str__(self):
        return "H5DataField(%s)"%self.name

    def __repr__(self):
        return self.__str__()

    def __getitem__(self,key):
        return self.data[key]

    @property
    def dimensions(self):
        return len(self.data.shape)-1

    @property
    def data(self):
        if self._data==None:
            self._data=self.h5[self.dataset_name]
        return self._data

    @property
    def h5(self):
        if self._file==None:
            self._file=h5py.File(self.filename,'r')
        return self._file

    @property
    def time(self):
        if self._time==None:
            self._time=self.h5[self.time_dataset_name].value
        return self._time

    @property
    def shape(self):
        return self.data.shape

    def close(self):
        if self._file!=None:
            self._file.close()
            self._file=None
            self._data=None

    def to_json(self):
        shape=self.shape
        j={
            "type": "data_field",
            "name": self.name,
            "path": self.path,
            "display_name": self.display_name,
            "unit": self.unit,
            "frames": shape[0],
            "format": self.format,
            "renderer": self.renderer,
            "data_type": self.data_type,
            "dimensions": self.dimensions,
            "dimension_unit": self.dimension_unit,
            "dimension_format": self.dimension_format,
            "time": self.time,
            "time_unit": self.time_unit,
            "time_format": self.time_format,
            "nx": shape[1],
            "dx": self.dx,
            "x0": self.x0
        }
        if self.dimensions>1:
            j['ny']=shape[1]
            j['nx']=shape[2]
            j["dy"]= self.dy
            j["y0"]= self.y0
        return j

DATA_PROVIDER=H5DataProvider()
