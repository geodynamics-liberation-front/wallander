import logging
import os
import sys

LOG = logging.getLogger(os.path.basename(sys.argv[0])) if __name__ == "__main__" else logging.getLogger(__name__)
LOG.setLevel(logging.DEBUG)
formatter = logging.Formatter("%(asctime)s - %(name)s (%(process)d) - %(levelname)s - %(message)s")
file_handler=logging.FileHandler("/tmp/wallendar_log")
file_handler.setFormatter(formatter)
file_handler.setLevel(logging.DEBUG)
LOG.addHandler(file_handler)

LOG.debug("wsgi startup")
LOG.debug("setup os.environ:\t"+str(os.environ))

def application(environ, start_response):
    status = '200 OK'
    output = 'Hello World!'
    LOG.debug("os.environ:\t"+str(os.environ))
    LOG.debug("environ:\t"+str(environ))

    response_headers = [('Content-type', 'text/plain'),
                        ('Content-Length', str(len(output)))]
    start_response(status, response_headers)

    return [output]

