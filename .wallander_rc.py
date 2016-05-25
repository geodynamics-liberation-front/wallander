import config
import HDF
import json
import numpy as np

def add_logger(l):
    config.add_logger(l)

add_logger(HDF.LOG)

