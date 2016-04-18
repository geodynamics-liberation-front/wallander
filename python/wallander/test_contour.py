import h5py
import contour
import math

h5file=h5py.File('ng__t.h5')
temp=h5file['image']['data'][0].T[::-1]

contours=contour.contour(temp,[310.,1550.])
print("full: %d"%reduce(lambda x,y: x+y,[len(l) for c in contours.values() for l in c.lines]))
f=open('temp_full.svg','w')
f.write(contour.svg(temp.shape[0],temp.shape[1],contours))
f.close()

for theta in [5,10,15,20]:
	threshold=math.cos(theta*math.pi/180.0)
	simple_contours=contour.simplify(contours,threshold)
	print(u"%02d\u00b0: %d"%(theta,reduce(lambda x,y: x+y,[len(l) for c in simple_contours.values() for l in c.lines])))
	f=open('temp_%02d.svg'%theta,'w')
	f.write(contour.svg(temp.shape[0],temp.shape[1],simple_contours))
	f.close()
	
