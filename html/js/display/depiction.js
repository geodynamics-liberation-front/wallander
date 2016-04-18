function Line(x0,y0,x1,y1)
{	
	this.editable=true;
	this.display=true;
	this.selected=false;
	this.style="#ff0000";
	this.lineWidth=1;
	this.setStart(x0||0,y0||0);
	this.setEnd(x1||0,y1||0);
}

Line.prototype.getEditor = function() { return 'line_editor'; }
Line.prototype.toString = function()
{
	return "Line[("+Math.floor(this.x0)+","+Math.floor(this.y0)+") - ("+Math.floor(this.x1)+","+Math.floor(this.y1)+")]";
}

Line.prototype.setStart = function(x,y)
{
	this.x0=Math.floor(x)+.5;
	this.y0=Math.floor(y)+.5;
}

Line.prototype.setEnd = function(x,y)
{
	this.x1=Math.floor(x)+.5;
	this.y1=Math.floor(y)+.5;
}

Line.prototype.getBounds = function()
{
	return {x: Math.min(this.x0,this.x1),
            y: Math.min(this,y0,this,y0),
            width: Math.abs(this.x0-this.x1),
            height: Math.abs(this.y0-this.y1)};
}

Line.prototype.call = function(display)
{
	if( this.selected )
	{
		display.paper.beginPath();
    	display.paper.lineWidth = this.lineWidth+1;
		display.paper.strokeStyle='rgba(255,0,0,.5)';
		display.paper.moveTo(this.x0,this.y0);
		display.paper.lineTo(this.x1,this.y1);
		display.paper.stroke();
	}
	display.paper.beginPath();
    display.paper.lineWidth = this.lineWidth;
	display.paper.beginPath();
	display.paper.strokeStyle=this.style;
	display.paper.moveTo(this.x0,this.y0);
	display.paper.lineTo(this.x1,this.y1);
	display.paper.stroke();
}

Line.prototype.clone = function()
{
	var l = new Line(this.x0,this.y0,this.x1,this.y1);
	l.style=this.style;
	return l;
}


function Measure(x0,y0,x1,y1)
{	
	this.editable=true;
	this.display=true;
	this.selected=false;
	this.style="#ff0000";
	this.size=18;
	this.text=""
	this.setStart(x0||0,y0||0);
	this.setEnd(x1||0,y1||0);
}
Measure.prototype = new Line;
Measure.prototype.super_call = Measure.prototype.call;
Measure.prototype.super_setStart = Measure.prototype.setStart;
Measure.prototype.super_setEnd = Measure.prototype.setEnd;

Measure.prototype.measure = function()
{
	var dx=this.x0-this.x1
	var dy=this.y0-this.y1
	var scale=1
	if(model)
	{
		scale=model.dx/1e3
	}
	this.length=Math.sqrt(dx*dx+dy*dy)*scale;
	this.angle=Math.atan2(Math.abs(dy),Math.abs(dx))
	this.text=sprintf("%0.2f \u2220 %0.2f\u00B0",this.length,this.angle*180/Math.PI);
}

Measure.prototype.setStart  = function(x,y)
{
	this.super_setStart(x,y);
	this.measure();
}

Measure.prototype.setEnd  = function(x,y)
{
	this.super_setEnd(x,y);
	this.measure();
}

Measure.prototype.call = function(display)
{

	// Draw the line
	this.super_call(display);

	display.paper.translate(-display.x,-display.y)
	display.paper.scale(1.0/display.zoom_level,1.0/display.zoom_level);
	
    display.paper.lineWidth = 2
	var x=(this.x1+display.x)*display.zoom_level;
	var y=(this.y1+display.y)*display.zoom_level;
	display.paper.font = '16px sans-serif';
	display.paper.textBaseline = 'middle';
	display.paper.strokeStyle = '#000';
	display.paper.fillStyle = '#ccc';
	display.paper.strokeText(this.text, x, y);
	display.paper.fillText(this.text, x, y);

	display.paper.scale(display.zoom_level,display.zoom_level);
	display.paper.translate(display.x,display.y)
}

Measure.prototype.clone = function()
{
	var l = new Measure(this.x0,this.y0,this.x1,this.y1);
	l.style=this.style;
	l.size=this.size;
	return l;
}

Measure.prototype.toString = function()
{
	return "Measure[("+Math.floor(this.x0)+","+Math.floor(this.y0)+") - ("+Math.floor(this.x1)+","+Math.floor(this.y1)+")]";
}

function Marker(x,y,size)
{
	this.editable=true;
	this.display=true;
	this.selected=false;
	this.size=size||5;
	this.setXY(x,y);
	this.strokeStyle="#000000";
	this.fillStyle="rgba(0,0,0,.5)"
	this.lineJoin="miter";
	this.lineWidth=1;
}

Marker.prototype.getEditor = function() { return 'point_editor'; }

Marker.prototype.toString = function()
{
	return "Marker["+Math.floor(this.x)+","+Math.floor(this.y)+"]";
}

Marker.prototype.setXY = function(x,y)
{
	this.x=Math.floor(x)+.5;
	this.y=Math.floor(y)+.5;
}

Marker.prototype.getBounds = function()
{
	return {x: this.x-this.size,
            y: this.y-3*this.size,
            width: this.size*2,
            height: this.size*3};
}

Marker.prototype.call = function(display)
{
	var p = display.paper;
	if( this.selected )
	{
		p.beginPath();
		p.lineJoin=this.lineJoin;
		p.lineWidth=this.lineWidth+1;
		p.strokeStyle='rgba(255,0,0,.5)';
		p.moveTo(this.x,this.y);
		p.quadraticCurveTo(this.x-this.size,this.y-1.8*this.size,this.x-this.size,this.y-2*this.size)
		p.arc(this.x,this.y-2*this.size,this.size,Math.PI,0);
		p.quadraticCurveTo(this.x+this.size,this.y-1.8*this.size,this.x,this.y)
		p.closePath();
		p.stroke();
	}
	p.beginPath();
	p.lineJoin=this.lineJoin;
	p.strokeStyle=this.strokeStyle;
	p.fillStyle=this.fillStyle;
	p.lineWidth=this.lineWidth;
	p.moveTo(this.x,this.y);
	p.quadraticCurveTo(this.x-this.size,this.y-1.8*this.size,this.x-this.size,this.y-2*this.size)
	p.arc(this.x,this.y-2*this.size,this.size,Math.PI,0);
	p.quadraticCurveTo(this.x+this.size,this.y-1.8*this.size,this.x,this.y)
	p.closePath();
	p.fill();
	p.stroke();
}

Marker.prototype.outline = function(p)
{
	p.moveTo(this.x,this.y);
	p.quadraticCurveTo(this.x-this.size,this.y-1.8*this.size,this.x-this.size,this.y-2*this.size)
	p.arc(this.x,this.y-2*this.size,this.size,Math.PI,0);
	p.quadraticCurveTo(this.x+this.size,this.y-1.8*this.size,this.x,this.y)
	p.closePath();
}

function Circle(x,y,r)
{
	this.editable=true;
	this.r=r||5;
	this.x=x;
	this.y=y;
	this.strokeStyle="#000000";
	this.fillStyle="rgba(0,0,0,.5)"
	this.lineWidth=1;
	this.display=true;
}

Circle.prototype.toString = function()
{
	return "Circle["+Math.floor(this.x)+","+Math.floor(this.y)+" r:"+Math.floor(this.r)+"]";
}


Circle.prototype.getBounds = function()
{
	return {x: this.x-this.r,
            y: this.y-this.r,
            width: 2*r,
            height: 2*r};
}

Circle.prototype.call = function(display)
{
	var p = display.paper;
	p.beginPath();
	p.strokeStyle=this.strokeStyle;
	p.fillStyle=this.fillStyle;
	p.lineWidth=this.lineWidth;
	p.arc(this.x,this.y,this.r,2*Math.PI,0);
	//p.fill();
	p.stroke();
}
	
function Point(x,y)
{
	this.editable=false;
	this.x=x;
	this.y=y;
	this.setXY(x,y);
	this.strokeStyle="#000000";
	this.fillStyle="rgba(255,0,0,.5)"
	this.lineWidth=1;
	this.display=true;
}


Point.prototype.getBounds = function()
{
	return {x: this.x-this.r,
            y: this.y-this.r,
            width: 2*r,
            height: 2*r};
}

Point.prototype.setXY = function(x,y)
{
	this.x=Math.floor(x);
	this.y=Math.floor(y);
}

Point.prototype.call = function(display)
{
	var p = display.paper;
	p.fillStyle=this.fillStyle;
	p.fillRect(this.x,this.y,1,1);
}

function Background(src)
{
	this.editable=false;
	this.display=true;
	this.img=new Image()
	this.img.src=src||"data:image/gif;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAN1wAADdcBQiibeAAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAAAoSURBVBiVY/z//z8DOtiyZQuGIBOGKhxgABWyYHO4j48PI+2tpr5CAKIuCi6gLUyOAAAAAElFTkSuQmCC"
}

Background.prototype.call = function(display)
{
	var pattern = display.paper.createPattern(this.img,"repeat");
	display.paper.translate(-display.x,-display.y)
	display.paper.scale(1.0/display.zoom_level,1.0/display.zoom_level);
	display.paper.rect(0,0,display.canvas.width,display.canvas.height);
	display.paper.fillStyle=pattern;
	display.paper.fill();
	display.paper.scale(display.zoom_level,display.zoom_level);
	display.paper.translate(display.x,display.y)
}

function Movie(name,timesteps,last,first)
{
	this.editable=true;
	this.display=true;
	this.selected=false;
	this.name=name;
	this.layers=[];
	this.x=0;
	this.y=0;
	this.frame=0;
	this.timesteps=timesteps
	this.last=last||timesteps.length-1;
	this.first=first||0;
	this.listeners={};
	this.load_count=0;
	var self=this;
	this.load_listener = function(e) { self.loaded(e); };
	if( first!=null )
	{
		this.first=first;
	}
}

Movie.prototype.getEditor = function() { return 'movie_editor'; }

Movie.prototype.getBounds = function()
{
	var width=0;
	var height=0;
	for( var n=0; n<this.layers.length; n++)
	{
		width=Math.max(width,this.layers[n].img.width);
		height=Math.max(height,this.layers[n].img.height);
	}
	return {x: this.x,
            y: this.y,
            width: width,
            height: height};
}

Movie.prototype.getValues = function(x,y,callback)
{
	x=Math.floor(x)
	y=Math.floor(y)
	if( x<this.x || y<this.y )
	{
		for( var i=0; i<this.layers.length; i++)
		{
			callback(this.layers[i].name,'-')
		}
	}
	else
	{
		for( var i=0; i<this.layers.length; i++)
		{
			var layer=this.layers[i];
			if( x>this.x+layer.img.width ||
                y>this.y+layer.img.height )
			{
				callback(layer.name,'-')
			}
			else
			{
				var ndx=this.frame+','+y+','+x
				var self=this;
				var name=layer.name;
				jsonCall(layer.path+'frame/'+ndx,function(value,arg) { callback(arg,value); },name);
			}
		}
	}
}

Movie.prototype.addLayer = function(name,path,args)
{
	qs=args||'';
	var layer={name: name, path: path, img: new Image(), opacity: 1.0, qs: qs};
	layer.img.addEventListener('load',this.load_listener);
	this.layers.push(layer);
	this.show()
}

Movie.prototype.removeLayer = function(name)
{
	var layer=-1;
	for( var i=0; i<this.layers.length && layer==-1; i++ )
	{
		if( this.layers[i].name==name ) { layer=i; }	
	}
	if(layer!=-1)
	{
		this.layers.splice(layer,1);
	}
}

Movie.prototype.reset = function(name,timesteps,last,first)
{
	for( var i=0; i<this.layers.length; i++)
	{
		this.layers[i].img.removeEventListener('load',this.load_listener);
		delete(this.layers[i].img);
	}
	this.layers=[];
	this.frame=0;
	this.timesteps=timesteps
	this.last=last||timesteps.length-1;
	this.first=first||0;
}

Movie.prototype.loaded = function(e)
{
	this.load_count++;
	if( this.load_count>=this.layers.length )
	{
		this.load_count=0;
		this.dispatchEvent('load',e);
	}
}

Movie.prototype.addEventListener = function(type,listener)
{
	if( !(type in this.listeners))
	{
		this.listeners[type]=[];
	}
	this.listeners[type].push(listener);
}

Movie.prototype.dispatchEvent = function(event_name,e)
{
		if(event_name in this.listeners)
		{
			for( var n=0; n<this.listeners[event_name].length; n++)
			{
				this.listeners[event_name][n](e);
			}
		}
}

Movie.prototype.toString = function()
{
	return "Movie["+this.name+"]";
}

Movie.prototype.call = function(display)
{
	for( var n=0; n<this.layers.length; n++)
	{
		display.paper.globalAlpha=this.layers[n].opacity
		display.paper.drawImage(this.layers[n].img,this.x,this.y);
	}
	display.paper.globalAlpha=1.0
	
}

Movie.prototype.next = function(n)
{
	this.frame=Math.min(Math.max(this.frame+(n||1),this.first),this.last)
	this.show();
	if( (n<0 && this.frame==this.first) || (n>0 && this.frame==this.last) )
	{
		this.dispatchEvent('stop');
	}
}

Movie.prototype.previous = function()
{
	this.next(-1);
}

Movie.prototype.show = function()
{
	for( var n=0; n<this.layers.length; n++)
	{
		this.layers[n].img.src=this.layers[n].path+this.frame+'.png?'+this.layers[n].qs;
	}
}
