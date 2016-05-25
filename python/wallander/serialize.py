import logging 
import os
import response
import random

from config import configuration

# The logger for this module
LOG=logging.getLogger(__name__)
MAX_LENGTH=16*1024 # 16kb
MAX_TRIES=10
ALPHABET='abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890'
SIZE=10

def randomWord(size=SIZE):
    return ''.join([random.choice(ALPHABET) for i in range(size)])

class SerializationDataProvider(object):
    def __call__(self,environ,start_response,path):
        if len(path)==0:
            content_length=int(environ['CONTENT_LENGTH'])
            if content_length<0 or content_length>MAX_LENGTH:
                LOG.error('Content-Length, %d,  out of bounds (%d)',content_length,MAX_LENGTH)
                return response.respond_not_found(start_response)

            serialization_file=os.path.join(configuration['serialization_dir'],randomWord())
            count=0
            while os.path.exists(serialization_file) and count<MAX_TRIES:
                LOG.warning('Serialization file "%s" exists, this is unexpected.  Trying again',serialization_file)
                serialization_file=os.path.join(configuration['serialization_dir'],randomWord())
                count+=1
            if count==MAX_TRIES:
                LOG.error('Unable to create new serialization file after %d attempts. Giving up',count) 
                return response.respond_not_found(start_response)
            
            with open(serialization_file,'w') as f:
                f.write(environ['wsgi.input'].read(content_length))
            return response.respond_ok(os.path.basename(serialization_file),start_response)
        elif path[0][0:1]=='_':
            try:
                f=getattr(self,path[0])
                return f(environ,start_response,path[1:])
            except AttributeError:
                return response.respond_not_found(start_response)
        else:
            serialization_file=os.path.join(configuration['serialization_dir'],*path)
            if os.path.exists(serialization_file):
                return response.respond_file(serialization_file,environ,start_response)
            else:
                return response.respond_not_found(start_response)
