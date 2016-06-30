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
LOGS=[
{'module':__name__,'log':'LOG','level':logging.DEBUG,'add_handlers':True},
{'module':'__main__','log':'LOG','level':logging.DEBUG,'add_handlers':True},
{'module':'StagYY','log':'LOG','level':logging.DEBUG,'add_handlers':True},
{'module':'wallander','log':'LOG','level':logging.DEBUG,'add_handlers':True},
{'module':'wallander.application','log':'LOG','level':logging.DEBUG,'add_handlers':False},
{'module':'wallander.cache','log':'LOG','level':logging.DEBUG,'add_handlers':False},
{'module':'wallander.viz','log':'LOG','level':logging.DEBUG,'add_handlers':False},
{'module':'wallander.data_providers','log':'LOG','level':logging.DEBUG,'add_handlers':False},
{'module':'wallander.contour','log':'LOG','level':logging.DEBUG,'add_handlers':False}
]
DEFAULT_LOG_LEVEL=logging.DEBUG
# The format of the log
LOG_FORMATTER=logging.Formatter('%(asctime)s - %(name)s:%(lineno)d (%(process)d) - %(levelname)s - %(message)s')

# The Wallander configuration 
configuration={}
configuration['LOG']=LOG
configuration['dir']=os.path.abspath(os.path.join(os.path.dirname(__file__),'..'))
configuration['html_dir']=os.path.join(configuration['dir'],'html')
configuration['index_files']=['index.html','index.htm']
configuration['data_dir']=os.path.join(configuration['dir'],'data')
configuration['log_dir']=os.path.join(configuration['dir'],'log')
configuration['mplconfig_dir']=os.path.join(configuration['dir'],'mplconfigdir')
configuration['data_provider_dir']=os.path.join(configuration['dir'],'data_providers')
configuration['data_provider_names']=[]
configuration['data_providers']={}
configuration['log_handlers']=[]
# builtin data provider directories
configuration['frame_dir']=os.path.join(configuration['data_dir'],'_frames')
configuration['serialization_dir']=os.path.join(configuration['data_dir'],'_serializations')
# url prefixes
configuration['app_prefix']='wallander'
configuration['frame_prefix']='frames'
configuration['contour_prefix']='contours'
configuration['serialization_prefix']='s'

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
    if wallander.LOG_TO_FILE:
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
   

def add_logger(log,handlers=None):
    print(log)
    print("Adding %(module)s.%(log)s at level %(level)s"%log)
    try:
        mod=importlib.import_module(log['module'])
        log_name=log['log']
        if log_name in mod.__dict__:
            logger=mod.__getattribute__(log_name)
        else:
            print("Couldn't find logger '%s' in '%s'",log_name,mod)
            LOG.warning("Couldn't find logger '%s' in '%s'",log_name,mod)
            return
        if log['add_handlers'] :
            print("add_logger (configuration): Log handlers: %s"%repr(configuration['log_handlers']))
            print("add_logger (handlers) Log handlers: %s"%repr(handlers))
            handlers=handlers or configuration['log_handlers']
            map(logger.addHandler,handlers)
        logger.setLevel(log['level'])
    except:
        LOG.exception("Error configurintg log: %(module)s.%(log)s"%log)

def setup():
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
	map(add_logger,LOGS)
