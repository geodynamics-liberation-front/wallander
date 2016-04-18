import timeit
setup="""import h5py
import contour
import math

h5file=h5py.File('ng__t.h5')
temp=h5file['image']['data'][0].T[::-1]
"""

stmt="contours=contour.contour(temp,[310.,1550.])"

timeit.timeit(stmt=stmt,setup=setup,number=2)
