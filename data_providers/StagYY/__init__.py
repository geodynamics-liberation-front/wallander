import logging
import os
import HDF
from wallander import ICONS
import wallander.viz as viz

LOG=logging.getLogger(__name__)

def is_source(fname):
    try:
        dirlist=os.listdir(fname)
        return 'par' in dirlist and any([ f.endswith('.h5') for f in os.listdir(fname)])
    except:
        return False

class StagYYDataProvider(HDF.H5DataProvider):
    def __init__(self):
        super(StagYYDataProvider, self).__init__('StagYY')
        self.folder=StagYYFolder

    def _create_datasource(self,fname):
        return StagYYDataSource(fname,'/'+self.__module__+fname[len(self.data_dir):],self.cache)

    def is_source(self,fname):
        try:
            dirlist=os.listdir(fname)
            return 'par' in dirlist and any([ f.endswith('.h5') for f in os.listdir(fname)])
        except:
            return False

class StagYYFolder(HDF.H5Folder):
    def __init__(self,directory,path,data_provider):
        super(StagYYFolder, self).__init__(directory,path,data_provider)

class StagYYDataSource(HDF.H5DataSource):
    def __init__(self,directory,path,cache,icon='StagYY.svg'):
        super(StagYYDataSource, self).__init__(directory,path,cache,icon)
        self.icon=os.path.join(self.__module__,ICONS,icon)
    
    def _create_datafield(self,field_name):
        return StagYYDataField(os.path.join(self.directory,field_name+'.h5'),os.path.join(self.path,field_name))

    def children(self):
        files=[]
        for f in os.listdir(self.directory):
            if f.endswith('.h5'):
                basename,ext=os.path.splitext(f)
                display_name,icon=get_icon(f)
                files.append({'name':basename,'display_name':display_name,'type':'data_field','icon':icon})
            elif f=='par':
                pass

        return files

def create_colormaps():
    LOG.debug('Creating lithosphere colormaps')
    viz.litho_colormap(0,1650,1550,10)
    viz.alpha_colormap('AlphaGreen',0.0,1.0,0.0)

STAGYY_DISPLAY_NAMES={
    'age': 'Age',
    'air': 'Air',
    'c': 'Composition',
    'cr': 'Crustal Thickness',
    'rho': 'Density',
    'dwtr': 'Dewatering',
    'g': 'Geoid',
    'f': 'Melt Fraction',
    'ed': 'Strain Rate',
    'p': 'Pressure',
    'str': 'Stress',
    'sx': 'X Stress',
    'sy': 'Y Stress',
    'sz': 'Z Stress',
    't': 'Temperature',
    'vx': 'X Velocity',
    'vy': 'Y Velocity',
    'vz': 'Z Velocity',
    'eta': 'Viscosity'
}

def get_icon(filename):
        field=os.path.splitext(os.path.basename(filename))[0]
        display_name=STAGYY_DISPLAY_NAMES.get(field,field)
        icon=display_name.lower().replace(' ','_')+'.svg'
        icon=os.path.join(get_icon.__module__,ICONS,icon)
        return display_name,icon

class StagYYDataField(HDF.H5DataField):
    def __init__(self,filename,path):
        super(StagYYDataField,self).__init__(filename,path)
        self.display_name,self.icon=get_icon(filename)

DATA_PROVIDER=StagYYDataProvider()
create_colormaps()
