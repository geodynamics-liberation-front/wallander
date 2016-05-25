import collections
import time
import logging
from threading import Thread

# The logger for this module
LOG=logging.getLogger(__name__)

class TimedCache(collections.MutableMapping):
    def __init__(self,create=None,distroy=None,timeout=300,cache_invalidation_thread=None):
        self.store = dict()
        self.create=create
        self.distroy=distroy
        self.timeout=timeout
        self.cache_invalidation_thread=cache_invalidation_thread or CacheInvalidationThread(timeout)
        self.cache_invalidation_thread.add(self)
# Race condition here ... TODO: fixit
        if not self.cache_invalidation_thread.running:
               self.cache_invalidation_thread.daemon=True
               self.cache_invalidation_thread.start()

    def _getcacheitem(self,key):
        return self.store[key]

    def __getitem__(self, key):
        v=self.store.get(key)
        if v==None:
            if self.create:
                v=CacheItem(self.create(key))
                self.store[key]=v
            else:
                raise KeyError(key)
        v.last_access=time.time()
        return v.value

    def __setitem__(self, key, value):
        self.store[key] = CacheItem(value)

    def __delitem__(self, key):
        if self.distroy:
            v=self.store[key]
            self.distroy(v.value)
        del self.store[key]

    def __iter__(self):
        return iter(self.store)

    def __len__(self):
        return len(self.store)

class CacheItem(object):
    def __init__(self,value):
        self.value=value
        self.last_access=time.time()

class CacheInvalidationThread(Thread):
    def __init__(self,timeout):
        super(CacheInvalidationThread, self).__init__()
        self.timeout=timeout
        self.caches=[]
        self.running=False
    
    def add(self,cache):
        self.caches.append(cache)

    def run(self):
        LOG.debug("CacheInvalidationThread started")
        self.running=True;
        while self.running:
            LOG.debug("Checking cache items...")
            for cache in self.caches:
                for k in cache.keys():
                    delta = time.time() - cache._getcacheitem(k).last_access
                    LOG.debug("Checking %s, %0.2f seconds old.",k,delta)
                    if delta > self.timeout:
                        LOG.debug("deleting %s",k)
                        del cache[k]
            time.sleep(self.timeout)


