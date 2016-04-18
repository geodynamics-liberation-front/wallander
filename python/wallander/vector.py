import numpy as np

def arrows(x,y,size):
    X,Y=np.meshgrid(np.arange(x.shape[1])[int(size/2)::size]+0.5,np.arange(x.shape[0])[int(size/2)::size]+0.5)
    scale=np.sqrt(size*size+size*size)/np.sqrt(x*x+y*y).max()
    x=scale*x[int(size/2)::size,int(size/2)::size]
    y=scale*y[int(size/2)::size,int(size/2)::size]
    points=[sum(p,()) for p in zip(zip(X.ravel(),Y.ravel()),zip(x.ravel(),y.ravel()))]
    return points

def svg(height,width,arrows):
    svg_tmpl="""<svg height="%d" width="%d">
<defs>
    <marker id="markerCircle" markerWidth="8" markerHeight="8" refX="5" refY="5">
        <circle cx="5" cy="5" r="2" style="stroke: none; fill:#000000;"/>
    </marker>

    <marker id="markerArrow" markerWidth="13" markerHeight="13" refX="2" refY="6" orient="auto">
        <path d="M2,2 L2,11 L10,6 L2,2" style="fill: #000000;" />
    </marker>
</defs>
%s
   Sorry, your browser does not support inline SVG.
</svg>
    """
    paths=['<path d="M %f,%f l %f,%f" style="marker-start: url(#markerCircle); fill:none; stroke: #000000; stroke-linejoin:round"/>'%a for a in arrows]
    return svg_tmpl%(height,width,"\n   ".join(paths))




