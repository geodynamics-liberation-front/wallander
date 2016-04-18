from json import JSONEncoder
import numpy as np

def _default(self, obj):
        if isinstance(obj,np.generic):
            return np.asscalar(obj)
        elif isinstance(obj,np.ndarray):
            return obj.tolist()
        elif hasattr(obj,"to_json"):
            return obj.to_json()
        else:
            return _default.default(obj)

_default.default = JSONEncoder().default # save unmodified default
JSONEncoder.default = _default # replacement
