/*
 * depection.js
 */
function Line(x0,y0,x1,y1)
{	
	this.editable=true
	this.display=true
	this.selected=false
	this.style="#ff0000"
	this.lineWidth=1
	this.scale=true
	this.setStart(x0||0,y0||0)
	this.setEnd(x1||0,y1||0)
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

Line.prototype.draw = function(display)
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
	Line.call(this,x0,y0,x1,ys)
	this.size=18;
	this.text=""
}
Measure.prototype = new Line;

Measure.prototype.measure = function()
{
	var dx=this.x0-this.x1
	var dy=this.y0-this.y1
	var scale=1
	this.length=Math.sqrt(dx*dx+dy*dy);
	this.angle=Math.atan2(Math.abs(dy),Math.abs(dx))
	this.text=sprintf("%0.2f \u2220 %0.2f\u00B0",this.length,this.angle*180/Math.PI);
}

Measure.prototype.setStart  = function(x,y)
{
	Object.getPrototypeOf(Measure.prototype).setStart.call(this,x,y);
	this.measure();
}

Measure.prototype.setEnd  = function(x,y)
{
	Object.getPrototypeOf(Measure.prototype).setEnd.call(this,x,y);
	this.measure();
}

Measure.prototype.draw = function(display)
{

	// Draw the line
	Object.getPrototypeOf(Measure.prototype).draw.call(this,x,y);

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

Marker.prototype.draw = function(display)
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

Circle.prototype.draw = function(display)
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

Point.prototype.draw = function(display)
{
	var p = display.paper;
	p.fillStyle=this.fillStyle;
	p.fillRect(this.x,this.y,1,1);
}

function Background(src)
{
	this.editable=false;
	this.name="background";
	this.display=true;
	this.img=new Image()
	this.img.src=src||"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAN1wAADdcBQiibeAAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAAAoSURBVBiVY/z//z8DOtiyZQuGIBOGKhxgABWyYHO4j48PI+2tpr5CAKIuCi6gLUyOAAAAAElFTkSuQmCC"
}

Background.prototype.draw = function(display)
{
	var pattern = display.paper.createPattern(this.img,"repeat");
	display.paper.translate(-display.x,-display.y)
	display.paper.scale(1.0/display.zoom_level,1.0/display.zoom_level);
	//display.paper.rect(0,0,display.canvas.width,display.canvas.height);
	display.paper.fillStyle=pattern;
	//display.paper.fill();
	display.paper.fillRect(0,0,display.canvas.width,display.canvas.height);
	display.paper.scale(display.zoom_level,display.zoom_level);
	display.paper.translate(display.x,display.y)
}

function Movie()
{
	this.editable=true;
	this.display=true;
	this.selected=false;
	this.name='movie';
	this.data_fields={}
	this.z_order=[]
	this.expected_frames=0
	this.loaded_frames=0
	this.x=0;
	this.y=0;
	this.frame=0;
	this.last=0;
	this.first=0;
	this.listeners={};
}

Movie.prototype.getEditor = function() { return 'movie_editor'; }

Movie.prototype.getBounds = function()
{
	var width=0;
	var height=0;
	var bounds
	for( var p in this.data_fields )
	{
		bounds=this.data_fields[p].getBounds()
		width=Math.max(width,bounds.width);
		height=Math.max(height,bounds.height);
	}
	return {x: this.x,
            y: this.y,
            width: width,
            height: height};
}

Movie.prototype.addDataField = function(data_field)
{
	var path=data_field.path
	if( path in this.data_fields ) { return; }
	this.data_fields[path]=data_field
	this.z_order.push(path)
	this.last=Math.max(this.last,data_field.frame_count-1)
	this.show()
}

Movie.prototype.removeDataField = function(path)
{
	if( data_field_name in this.data_fields ) 
	{ 
		delete this.data_fields[path]
		var ndx=this.z_order.indexOf(path)
		this.z_order.splice(ndx,1)
		// TODO handle this.last
	}
}

Movie.prototype.reset = function()
{
	for( var i=0; i<this.z_order.length; i++)
	{
		delete(this.data_fields[this.z_order[i]].img);
	}
	this.data_fields={}=[];
	this.frame=0;
	this.last=last||timesteps.length-1;
	this.first=first||0;
}

Movie.prototype.loaded = function(e)
{
	this.loaded_frames++
	if( this.loaded_frames>=this.expected_frames )
	{
		this.expected_frames=0
		this.loaded_frames=0
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
	return "Movie";
}

Movie.prototype.draw = function(display)
{
	for( var i=0; i<this.z_order.length; i++)
	{
		var df=this.data_fields[this.z_order[i]];
		if( df.visible )
		{
			var images=df.getImages()
			for( var j=0; j<images.length; j++ )
			{
				var image=images[j]
				if( image.opacity>0 )
				{
					display.paper.globalAlpha=image.opacity
					display.paper.drawImage(image.image,this.x,this.y)
				}

			}
		}
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
	this.loaded_frames=0
	this.expected_frames=0
	for( var p in this.data_fields )
	{
		this.expected_frames+=this.data_fields[p].loadImages(this.frame)
	}
	if(this.expected_frames==0)
	{
		this.loaded()
	}
}
