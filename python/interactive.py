import os
import sys

global log_to_screen
log_to_screen=True

print('log_to_screen' in globals())

print("Starting wallander interactive")
start_dir=os.path.dirname(sys.argv[0])
print("Startup directory: %s"%start_dir)
conf_dir=os.path.realpath(os.path.join(start_dir,'..','conf'))
python_dir=os.path.realpath(os.path.join(start_dir,'..','python'))
sys.path.append(conf_dir)
sys.path.append(python_dir)

import wallander
wallander.LOG_TO_SCREEN=True

import wallander.application as wallander_app

application=wallander_app.Application()

def start_response(status,headers):
    print(status)
    for h in headers:
        print("%s: %s"%h)

def call(url):
    response=application({"REQUEST_URI":url,"PATH_INFO":""},start_response)
    for r in response:
        sys.stdout.write(r)

