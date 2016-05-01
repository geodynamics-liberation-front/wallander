import os
import logging
import site
import importlib
import wallander
from logging.handlers import TimedRotatingFileHandler

# The loger for this module
LOG=logging.getLogger(__name__)
LOG.setLevel(logging.WARN)

# The name of the loggers to configure
LOGS=[__name__+".LOG","__main__.LOG","wallander.LOG","wallander.application.LOG","StagYY.LOG","wallander.cache.LOG","wallander.viz.LOG",
"wallander.data_providers.LOG"]
DEFAULT_LOG_LEVEL=logging.DEBUG
# Add the log name and logging level, otherwise logging level will be DEFAULT_LOG_LEVEL
# e.g.:  LOG_LEVELS={"wallander.LOG":logging.WARNING}
LOG_LEVELS={}
# The format of the log
LOG_FORMATTER=logging.Formatter('%(asctime)s - %(name)s:%(lineno)d (%(process)d) - %(levelname)s - %(message)s')

# The Wallander configuration 
configuration={}
configuration['LOG']=LOG
configuration['dir']=os.path.abspath(os.path.join(os.path.dirname(__file__),'..'))
configuration['html_dir']=os.path.join(configuration['dir'],'html')
configuration['index_files']=['index.html','index.htm']
configuration['data_dir']=os.path.join(configuration['dir'],'data')
configuration['frame_dir']=os.path.join(configuration['data_dir'],'_frames')
configuration['frame_prefix']='frames'
configuration['log_dir']=os.path.join(configuration['dir'],'log')
configuration['data_provider_dir']=os.path.join(configuration['dir'],'data_providers')
configuration['data_provider_names']=[]
configuration['data_providers']={}
configuration['log_handlers']=[]

# Configures the loggers
def config_logging():
    print("Config_logging")
    # The screen logger
    screen_handler=logging.StreamHandler()
    screen_handler.setFormatter(LOG_FORMATTER)
    screen_handler.setLevel(logging.WARN)
    LOG.addHandler(screen_handler)
    if wallander.LOG_TO_SCREEN or ('daemon' in configuration and configuration['daemon']==False):
        LOG.info('Logging to screen')
        screen_handler.setLevel(logging.DEBUG)
        configuration['log_handlers'].append(screen_handler)
    
    # The rotating file handler
    logging_dir=configuration['log_dir']
    if not os.path.exists(logging_dir):
        os.makedirs(logging_dir)
    print("config_logging: Logging directory %s"%logging_dir)
    file_handler=None
    file_number=0
    while not file_handler and file_number<10:
        try:
            filename=os.path.join(logging_dir,'wallander%s.log'%('' if file_number<1 else '-%d'%file_number))
            print("config_logging: Attempt logging to %s"%filename)
            file_handler=TimedRotatingFileHandler(filename,when='midnight')
            file_handler.setFormatter(LOG_FORMATTER)
            file_handler.setLevel(logging.DEBUG)
            configuration['log_handlers'].append(file_handler)
            print("config_logging: Logging to %s"%filename)
        except IOError:
            file_number=file_number+1
    print("config_logging: Log handlers: %s"%repr(configuration['log_handlers']))
   

def add_logger(log_name,log_level=DEFAULT_LOG_LEVEL,handlers=None):
    try:
        if isinstance(log_name,str): 
            ndxdot=log_name.rfind('.')
            mod=log_name[:ndxdot]
            log=log_name[ndxdot+1:]
            mod=importlib.import_module(mod)
            if log in mod.__dict__:
                log=mod.__getattribute__(log)
            else:
                print("Couldn't find logger '%s' in '%s'",log,mod)
                LOG.warning("Couldn't find logger '%s' in '%s'",log,mod)
                return
        else:
             log=log_name
        print("add_logger (configuration): Log handlers: %s"%repr(configuration['log_handlers']))
        handlers=handlers or configuration['log_handlers']
        print("add_logger (handlers) Log handlers: %s"%repr(handlers))
        map(log.addHandler,handlers or configuration['log_handlers'])
        log.setLevel(log_level)
    except:
        LOG.exception("Error configurintg log: %s"%log_name)

config_logging()

# Add data providers here
site.addsitedir(configuration['data_provider_dir'])
for data_provider in os.listdir(configuration['data_provider_dir']):
    dp_name=os.path.splitext(data_provider)[0]
    try:
        if not dp_name.startswith('_' ) and os.path.exists(os.path.join(configuration['data_provider_dir'],data_provider,'__init__.py')):
            mod=importlib.import_module(dp_name)
            configuration['data_providers'][dp_name]=mod.DATA_PROVIDER
            configuration['data_provider_names'].append(dp_name)
    except:
        LOG.exception('Unable to load data provider "%s"',dp_name)

# setup configuration logging
for log in LOGS:
    log_level=LOG_LEVELS.get(log,DEFAULT_LOG_LEVEL)
    print("Adding %s at level %s"%(log,log_level))
    add_logger(log,log_level)
