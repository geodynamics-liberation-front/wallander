import logging
import wallander
import wallander.response as response
from config import configuration

LOG=logging.getLogger(__name__)

class DataProvider(wallander.BaseDataProvider):
    def __init__(self):
        super(DataProvider, self).__init__("YouTube",configuration)

    def call(self,environ,start_response,path):
        return response.respond_ok("OK response from YouTube DataProvider",start_response)

    def render(self,environ,start_response,path):
        return response.respond_status(201,[('Location', 'foo')])

