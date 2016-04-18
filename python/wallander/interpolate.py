import numpy as np
from scipy import interpolate

def interpolate_xz_h5(h5,Lx,Lz):
    frames,nx,ny,nz=h5['data'].shape
    x=h5['x']
    z=h5['z']
    px=nx
    pz=int(nx*Lz/Lx)
    dx=Lx/px
    dz=Lz/pz
    x_new=(np.arange(px)+.5)*dx
    z_new=(np.arange(pz)+.5)*dz

    #  Create the image group if it doesn't exist
    if not 'image' in h5:
        img=h5.create_group('image')
        for dset_name in ['data','p','v','vx','vy','vz']:
            if dset_name in h5: img.create_dataset(dset_name, (0,px,pz),compression='gzip', compression_opts=4,maxshape=(None,px,pz))
        # Create the x and z datasets
        img.create_dataset('x', data=x_new,compression='gzip', compression_opts=4)
        img.create_dataset('z', data=z_new,compression='gzip', compression_opts=4)
        # link the frames, and y points
        img['y']=h5['y']
        img['frame']=h5['frame']
    else:
        img=h5['image']
    
    for dset_name in ['data','p','v','vx','vy','vz']:
        if dset_name in h5:
            data_set=h5[dset_name]
            img_set=img[dset_name]
            data_frames=data_set.shape[0]
            img_frames=img_set.shape[0]
            img_set.attrs['min']=data_set.attrs['min']
            img_set.attrs['max']=data_set.attrs['max']
            img_set.resize((data_frames-img_frames,px,pz))
            for n in xrange(img_frames,data_frames):
                f=interpolate.interp2d(z,x,np.squeeze(data_set[n]))
                img_set[n]=f(z_new,x_new)
