import os
import cStringIO

print("Starting wallander interactive")

import wallander
wallander.LOG_TO_SCREEN=True

import wallander.application as wallander_app

application=wallander_app.Application()

def start_response(status,headers):
    print(status)
    for h in headers:
        print("%s: %s"%h)

def call(url):
    from config import configuration
    path=[p for p in url.split('/') if p!='']
    data_provider=path.pop(0) if len(path)>0 else ''
    dp=configuration['data_providers'].get(data_provider)
    return dp.call({"REQUEST_URI":url,"PATH_INFO":""},start_response,path)

def get(url):
    response=application({"REQUEST_URI":url,"PATH_INFO":""},start_response)
    out=cStringIO.StringIO()
    for r in response:
        out.write(r)
    response=out.getvalue()
    out.close()
    return response

if os.path.exists('wallander_rc.py'): execfile('wallander_rc.py')
