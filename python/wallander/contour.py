import math
import numpy as np

lines={
    0: lambda i,j,a,b,c,d,v: (i+1.,j+itp(a,b,v)),
    1: lambda i,j,a,b,c,d,v: (i+itp(c,b,v),j+1.),
    2: lambda i,j,a,b,c,d,v: (float(i),j+itp(d,c,v)),
    3: lambda i,j,a,b,c,d,v: (i+itp(d,a,v),float(j))
    }
    
def itp(x1,x2,y):   
    """
    Returns the x for y=mx+b
    x1=m*0+b
    x2=m*1+b
    """
    x=float(y-x1)/float(x2-x1)
    assert x>=0
    return x

class LineSegments(object):
    def __init__(self):
        self.start={}
        self.end={}

    @property
    def lines(self):
        return self.start.values()

    def add(self,new_segment):
        if (new_segment[0] in self.start) or (new_segment[-1] in self.end):
            new_segment.reverse()

        if new_segment[0] in self.end :
            old_segment=self.end[new_segment[0]]
            del self.end[old_segment[-1]]
            del self.start[old_segment[0]]
            segment=old_segment+new_segment[1:]
            self.add(segment)
        elif new_segment[-1] in self.start:
            old_segment=self.start[new_segment[-1]]
            del self.end[old_segment[-1]]
            del self.start[old_segment[0]]
            segment=new_segment+old_segment[1:]
            self.add(segment)
        else:
            self.start[new_segment[0]]=new_segment
            self.end[new_segment[-1]]=new_segment

def contour(data,values):
    contours=dict()
    for v in values:
        contours[v]=LineSegments()
    I,J=data.shape
    I-=1
    J-=1
    for i in xrange(I):
        for j in xrange(J):
            """
              2
            d---c  data point is located in the center
          3 |   | 1
            a---b
              0
            """
            # The conversion to native floats makes a 10x speedup
            a=float(data[i+1,j  ])
            b=float(data[i+1,j+1])
            c=float(data[i  ,j+1])
            d=float(data[i  ,j  ])
            line=lambda s: lines[s](i,j,a,b,c,d,v)
            for v in values:
                # get the dictionary of line segments
                segments=contours[v]
                # convert to a float
                v=float(v)
                # calculate the intersection type 0 to 15
                t=(a<v)+2*(b<v)+4*(c<v)+8*(d<v)

                # the comments show the nodes as either less than (-) or greater than or equal (+)

                #  0 15
                # ++ -- 
                # ++ -- 
                if    t==0 or t==15:
                    pass
                #  1 14
                # ++ -- 
                # -+ +- 
                elif  t==1 or t==14:
                    segments.add([line(3),line(0)])
                #  2 13
                # ++ --
                # +- -+
                elif  t==2 or t==13:
                    segments.add([line(0),line(1)])
                #  3 12
                # ++ --
                # -- ++
                elif  t==3 or t==12:
                    segments.add([line(3),line(1)])
                #  4 11
                # +- -+
                # ++ --
                elif  t==4 or t==11:
                    segments.add([line(2),line(1)])
                #  5 10
                # +- -+
                # -+ +-
                elif  t==5 or t==10:
                    segments.add([line(3),line(0)])
                    segments.add([line(1),line(2)])
                #  6  9
                # +- -+
                # +- -+
                elif  t==6 or t==9:
                    segments.add([line(0),line(2)])
                #  7  8
                # +- -+
                # -- ++
                elif  t==7 or t==8:
                    segments.add([line(3),line(2)])
    return contours


def simplify(contours,threshold=math.cos(1.0*math.pi/180.0)):
    new_contours=dict()
    for c,lines in contours.items():
        new_contours[c]=LineSegments()
        for line in lines.lines:
            last_point=line[0]
            # Start with the first point
            new_line=[last_point]
            for p in line[1:-1]:
                # Take the dot product of the vector from the end of the 'new line' to the point
                # and the vector from the last point to the point, if the angle between then is greater than the threshold
                # then add the point to the new line
                v1=np.array([p[0]-new_line[-1][0],p[1]-new_line[-1][1]])
                v2=np.array([p[0]-last_point[0],p[1]-last_point[1]])
                cos_theta=np.dot(v1,v2)/(np.linalg.norm(v1)*np.linalg.norm(v2))
                if cos_theta<threshold:
                    new_line.append(last_point)
                last_point=p
            # Always have the last point
            new_line.append(line[-1])
            new_contours[c].add(new_line)
    return new_contours

def plot(contours):
    import matplotlib.pylab as plt
    for c,lines in contours.items():
        for line in lines.lines:
            y,x=zip(*line)
            plt.plot(x,y)

def write_contour(data,contours,filename):
    height,width=data.shape
    with open(filename,'w') as f:
        f.write(svg(height,width,simplify(contour(data,contours))))

def svg(height,width,contours):
    svg_tmpl="""<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<!-- Created with Wallander-->
<svg 
height="%d" 
width="%d"
version="1.1"
xmlns:svg="http://www.w3.org/2000/svg"
xmlns="http://www.w3.org/2000/svg"
>
%s
   Sorry, your browser does not support inline SVG.
</svg>
    """
    paths=[]
    for c,lines in contours.items():
        for n,line in enumerate(lines.lines):
            d="M "+" ".join(["%f %f"%(col,row) for row,col in line])
            paths.append('<path id="contour_%(value)s_%(segment)d" class="contour_%(value)s segment_%(segment)d" d="%(line)s"/>'%{'value':c,'segment':n,'line':d})
    return svg_tmpl%(height,width,"\n   ".join(paths))
