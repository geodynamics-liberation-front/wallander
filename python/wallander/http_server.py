#! /usr/bin/env python
import argparse
import logging
import os
import sys
import wallander
from daemon import Daemon
from wsgiref.simple_server import make_server

# The logger
LOG = logging.getLogger(os.path.basename(sys.argv[0])) if __name__ == "__main__" else logging.getLogger(__name__)

class HTTPServer(Daemon):
    def run(self,host,port,wsgi_application):
        # Load the WSGI application
        httpd=make_server(host, port, wsgi_application)
        LOG.debug('starting server on port %d'%port)
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            LOG.debug('quiting')

if __name__ == "__main__":
    parser = argparse.ArgumentParser('')
    parser.add_argument('command',choices=['start','stop','restart'])
    parser.add_argument('-f',dest='foreground',action='store_true',help='Keep the server in the foreground')
    parser.add_argument('--host',dest='host',help='host to listen on',default='')
    parser.add_argument('-p','--port',dest='port',type=int,help='port to listen on',default=8000)
    parser.add_argument('-c','--config',dest='config',help='configuration file, default config.py in the server directory',default='../conf/config.py')
    parser.add_argument('-v',dest='verbose',action='store_true',help='Verbose output')
    args=parser.parse_args()
    foreground=args.foreground

    # The directory that we start from
    application=wallander.get_application(args.config,not foreground)

    http_server = HTTPServer('/tmp/http_server_%d.pid'%args.port,stderr='/tmp/http_err_%d'%args.port,stdout='/tmp/http_out_%d'%args.port)
    if 'start' == args.command:
        if args.foreground:
            http_server.start_foreground(args.host,args.port,application)    
        else:
            http_server.start(args.host,args.port,application)   
    elif 'stop' == args.command:
        http_server.stop()
    elif 'restart' == args.command:
        http_server.restart()
    else:
        sys.stderr.write("Unknown command : %s\n"%args.command)
        sys.exit(2)
    sys.exit(0)
