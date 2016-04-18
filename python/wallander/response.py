import logging
LOG = logging.getLogger(__name__)

import json
import os
import mimetypes

import make_json_serialize_objects
make_json_serialize_objects # just to prevent pyflakes from complaining

HTTP_STATUS_CODES={
200: "OK",
201: "Created",
202: "Accepted",
203: "Non-Authoritative Information",
204: "No Content",
205: "Reset Content",
206: "Partial Content",
300: "Multiple Choices",
301: "Moved Permanently",
302: "Found",
303: "See Other",
304: "Not Modified",
305: "Use Proxy",
307: "Temporary Redirect",
400: "Bad Request",
401: "Unauthorized",
402: "Payment Required",
403: "Forbidden",
404: "Not Found",
405: "Method Not Allowed",
406: "Not Acceptable",
407: "Proxy Authentication Required",
408: "Request Timeout",
409: "Conflict",
410: "Gone",
411: "Length Required",
412: "Precondition Failed",
413: "Payload Too Large",
414: "Request-URI Too Long",
415: "Unsupported Media Type",
416: "Requested Range Not Satisfiable",
417: "Expectation Failed",
500: "Internal Server Error",
501: "Not Implemented",
502: "Bad Gateway",
503: "Service Unavailable",
504: "Gateway Timeout",
505: "HTTP Version Not Supported"}

def respond_status(code,start_response,headers=None):
    hdr=headers or []
    hdr.append(('Content-Type','text/html'))
    status="%d %s"%(code,HTTP_STATUS_CODES[code])
    start_response(status,hdr)
    html="<html><head><title>%s</title></head><body>%s</body></html>"%(status,status)
    return iter([html])

def respond_not_found(start_response):
    return respond_status(404,start_response)

def respond_ok(v,start_response):
    start_response('200 OK', [('Content-Type', 'application/json')])
    return iter([json.dumps(v)])

def respond_file(f,environ,start_response,name=None):
    if not hasattr(f,'read'):
        f=open(f,'rb')
    headers=[]
    ct=mimetypes.guess_type(f.name)[0]
    ct=ct if ct!=None else 'application/octet-stream'
    headers.append(('Content-Type', ct))
    cl=str(os.path.getsize(f.name))
    headers.append(('Content-Length', cl))
    if name!=None:
        headers.append(('Content-Disposition', 'attachment; filename="%s"'%name))
    start_response('200 OK', headers)
    if 'wsgi.file_wrapper' in environ:
            return environ['wsgi.file_wrapper'](f, 8192)
    else:
            return iter(lambda: f.read(8192), '')
