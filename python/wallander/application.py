import logging
LOG = logging.getLogger(__name__)

import traceback
import mimetypes
import posixpath
from . import response

from config import configuration
# add the frame provider to the handlers

from data_providers import HTMLDataProvider
from viz import FrameDataProvider,ContourDataProvider
from serialize import SerializationDataProvider

mimetypes.add_type('text/plain','')
mimetypes.add_type('image/svg+xml','.svg')

SERVER_VERSION='0.1.0'
SERVER_HEADER='wallander'

# The object that contains the data_provider response
DATA_PROVIDER_RESPONSE={'name':'/'}
DATA_PROVIDER_RESPONSE['type']='folder'
DATA_PROVIDER_RESPONSE['children']=[v.to_json() for k,v in configuration['data_providers'].items()]
def dp_provider_response(environ,start_response,path):
    return response.respond_ok(DATA_PROVIDER_RESPONSE,start_response)
configuration['data_providers']['']=dp_provider_response

# Default data provider
DEFAULT_DATA_PROVIDER=HTMLDataProvider()

# Frame data provider
configuration['data_providers'][configuration['frame_prefix']]=FrameDataProvider()
# Frame data provider
configuration['data_providers'][configuration['contour_prefix']]=ContourDataProvider()
# Serialization data provider
configuration['data_providers'][configuration['serialization_prefix']]=SerializationDataProvider()

class Application(object):
    def __call__(self,environ,start_response):
        try:
            LOG.debug("REQUEST_URI: %s",environ['REQUEST_URI'])
            LOG.debug("PATH_INFO: %s",environ['PATH_INFO'])
            path=[p for p in posixpath.normpath(environ['REQUEST_URI'] if len(environ['PATH_INFO'])==0 else environ['PATH_INFO']).split('/') if p!='']
            LOG.debug("path: %s",str(path))
            data_provider=path.pop(0) if len(path)>0 else ''
            LOG.debug("Data provider name: '%s'",data_provider)
            dp=configuration['data_providers'].get(data_provider)
            LOG.debug("Data provider: %s",str(dp))
            if dp:
                return dp(environ,start_response,path)
            else:
                LOG.debug("No data provider for %s",data_provider)
                return response.respond_not_found(start_response)
        except:
            LOG.exception("Exception processing request")
            traceback.print_exc()
            return response.respond_not_found(start_response)


