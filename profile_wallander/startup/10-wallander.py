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

def get(url):
    response=application({"REQUEST_URI":url,"PATH_INFO":""},start_response)
    out=cStringIO.StringIO()
    for r in response:
        out.write(r)
    response=out.getvalue()
    out.close()
    return response

if os.path.exists('wallander_rc.py'): execfile('wallander_rc.py')
