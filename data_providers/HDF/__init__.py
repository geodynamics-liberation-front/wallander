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
    def __init__(self,name="HDF"):
        super(H5DataProvider, self).__init__(name,configuration)
        self.cache=cache.TimedCache(create=self._create_datasource,distroy=self._distroy_datasource)

    def _create_datasource(self,fname):
        return H5DataSourceFolder(fname,self.cache)

    def _distroy_datasource(self,ds):
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
        # check if it is an HDF model
        if is_h5_folder(fname):
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
                if is_h5_folder(fullpath):
                    LOG.debug("Child has HDF files")
                    files.append(DATA_PROVIDER.cache[fullpath].to_json(include_children=False))
                elif os.path.isdir(fullpath):
                    LOG.debug("Child is a folder")
                    icon=os.path.join(self.__module__,wallander.ICONS,'folder.svg')
                    files.append({'name':f,'type':'folder','icon':icon})
                else:
                    icon=os.path.join(self.__module__,wallander.ICONS,'file.svg')
                    LOG.debug("Child is a file")
                    files.append({'name':f,'type':'file','icon':icon})
        return files

class H5DataSourceFolder(object):
    """Creates a data source where each data field is stored in it's own hdf5 file"""
    def __init__(self,directory,c,icon='h5.svg'):
        self.directory=directory
        self.cache=cache.TimedCache(create=self._create_datafield,distroy=self._distroy_datafield,cache_invalidation_thread=c.cache_invalidation_thread)
        self.fields={}
        self.icon=os.path.join(self.__module__,wallander.ICONS,icon)

    def _create_datafield(self,field_name):
        return H5DataField(os.path.join(self.directory,field_name+'.h5'))

    def _distroy_datafield(self,ds):
        return

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
    def __init__(self,filename,
                      dataset_name='data',x_dataset_name='x',y_dataset_name='y',time_dataset_name='time',
                      attr_group_name='/',
                      unit_attr_name='unit',dimension_unit_attr_name='dimension_unit',format_attr_name='format',data_type_attr_name='data_type',
                      x0_attr_name='x0',dx_attr_name='dx',y0_attr_name='y0',dy_attr_name='dy',
                      renderer_attr_name='renderer'):
        self.filename=filename
        self.name=os.path.splitext(os.path.basename(filename))[0]
        self.dataset_name=dataset_name
        self.x_dataset_name=x_dataset_name
        self.y_dataset_name=y_dataset_name
        self.time_dataset_name=time_dataset_name
        self.attr_group_name=attr_group_name
        self.unit_attr_name=unit_attr_name
        self.dimension_unit_attr_name=dimension_unit_attr_name
        self.format_attr_name=format_attr_name
        self.data_type_attr_name=data_type_attr_name
        self.x0_attr_name=x0_attr_name
        self.dx_attr_name=dx_attr_name
        self.y0_attr_name=y0_attr_name
        self.dy_attr_name=dy_attr_name
        self.renderer_attr_name=renderer_attr_name

        self._file=None
        self._data=None
        self._time=None

    def unit(self):
        return self.h5[self.attr_group_name].attrs[self.unit_attr_name]
    def format(self):
        return self.h5[self.attr_group_name].attrs[self.format_attr_name]
    def renderer(self):
        return self.h5[self.attr_group_name].attrs[self.colomap_attr_name]
    def data_type(self):
        return self.h5[self.attr_group_name].attrs[self.data_type_attr_name]
    def x0(self):
        return self.h5[self.attr_group_name].attrs[self.x0_attr_name]
    def dy(self):
        return self.h5[self.attr_group_name].attrs[self.dy_attr_name]
    def y0(self):
        return self.h5[self.attr_group_name].attrs[self.y0_attr_name]
    def dimensions(self):
        return len(self.data.shape)-1
    def dimension_unit(self):
        return self.h5[self.attr_group_name].attrs[self.dimension_unit_attr_name]
    
    def __str__(self):
        return "H5DataField(%s)"%self.name

    def __repr__(self):
        return self.__str__()

    def __getitem__(self,key):
        return self.data[key]

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
            self._time=self.h5[self.time_dataset]
        return self._time

    def close(self):
        if self._file!=None:
            self._file.close()
            self._file=None
            self._data=None
            self._time=None

    def to_json(self):
        j={
            "type": "data_source",
            "name": self.name,
            "unit": self.unit(),
            "format": self.format(),
            "renderer": self.renderer(),
            "data_type": self.data_type(),
            "dimensions": self.dimensions(),
            "dimension_unit": self.dimension_unit(),
            "dx": self.h5.attrs[self.dx_attr_name],
            "x0": self.h5.attrs[self.x0_attr_name]
        }
        if self.dimensions>1:
            j['dy']=self.h5.attrs[self.dy_attr_name]
            j['y0']=self.h5.attrs[self.y0_attr_name]
        return j

DATA_PROVIDER=H5DataProvider()
