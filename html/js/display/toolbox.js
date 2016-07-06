/* 
 * toolbox.js
 */
function ToolBox(display)
{
	var self=this;
	this.display=display;
	this.toolbox_elem=document.createElement('div');
	this.toolbox_elem.className="toolbox";
	this.toolset_elem=document.createElement('div');
	this.toolset_elem.className="toolset";
	this.toolset_elem.style.left_margin="-100%"
	this.toolbox_elem.appendChild(this.toolset_elem);
	this.handle_elem=document.createElement('div');
	this.handle_elem.className="handle";
	this.toolbox_elem.appendChild(this.handle_elem);
	this.handle_elem.addEventListener('click',function(e) { self.click(e); });
	this.handle_elem.innerHTML="&#187;";

	this.addTool(new DataProviderTool());
	var move_tool=new MoveTool();
	this.addTool(move_tool);
	add_class(move_tool.html_img,'selected');
	this.default_tool=move_tool
	display.tool=move_tool
	this.display.tool=move_tool;	
	this.addTool(new ProjectorTool(display.projector));
	this.addTool(new MarkerTool());
	this.addTool(new MeasureTool());
	this.addTool(new CompassTool());
	this.addTool(new ZoomTool());
	this.addTool(new LineTool());
	this.addTool(new DrawTool());

	add_stylesheet("tools.css");	

	display.elem.parentElement.appendChild(this.toolbox_elem);
}

ToolBox.prototype.close=function()
{
	this.toolset_elem.style.marginLeft="-100%"
	this.handle_elem.innerHTML="&#187;"
}

ToolBox.prototype.open=function()
{
	this.handle_elem.innerHTML="&#171;"
	this.toolset_elem.style.marginLeft="0px"
}

ToolBox.prototype.click=function(e)
{
	e.stopPropagation();
	e.preventDefault();
	this.toggle();
}

ToolBox.prototype.toggle=function()
{
	if( this.toolset_elem.style.marginLeft!="0px" ) 
	{
		this.open()
	}
	else
	{
		this.close()
	}
	return false;
}

ToolBox.prototype.addTool=function(tool)
{	
	var self=this;
	var img=new Image()
	img.src=get_img_url(tool.getIcon());
	img.width=32;
	img.height=32;
	img.alt=tool.getName();
	img.className="tool_"+tool.getName().replace(' ','_');
	img.addEventListener('click',function(e) { self.toolClick(e); });
	img.tool=tool;
	tool.html_img=img
	this.toolset_elem.appendChild(img);
}

ToolBox.prototype.toolClick=function(e)
{
	this.display.tool.unselected(display);	
	remove_class(this.display.tool.html_img,'selected');
	this.display.tool=e.target.tool;
	this.display.tool.selected(display);
	add_class(this.display.tool.html_img,'selected');
}

//
// The abstract tool 
//
function AbstractTool()
{
}
AbstractTool.prototype.getName = function() { return "abstract"; }
AbstractTool.prototype.getIcon = function() { return ""; }
AbstractTool.prototype.selected = function(display) {}
AbstractTool.prototype.unselected = function(display) {}
AbstractTool.prototype.mouseclick = function(display,e) {}
AbstractTool.prototype.mousedown = function(display,e) {}
AbstractTool.prototype.mouseup = function(display,e) {}
AbstractTool.prototype.mousemove = function(display,e) {}
AbstractTool.prototype.mouseout = function(display,e) {}
AbstractTool.prototype.mousewheel = function(display,e) {}
AbstractTool.prototype.keydown = function(display,e) {}
AbstractTool.prototype.keyup = function(display,e) {}

// 
// The model selection tool
//
function DataProviderTool()
{
}
DataProviderTool.prototype = new AbstractTool;
DataProviderTool.prototype.getIcon = function(display,e) { return "data_provider.svg"; }
DataProviderTool.prototype.getName = function() { return "data provider"; }
DataProviderTool.prototype.selected = function(display) { show_dialog(); }

// 
// The model selection tool
//
function ModelTool()
{
}
ModelTool.prototype = new AbstractTool;
ModelTool.prototype.getIcon = function(display,e) { return "globe.svg"; }
ModelTool.prototype.getName = function() { return "model"; }

//
// The move tool
//
function MoveTool()
{
	this.mousedrag=false;
	this.mousex=0;
	this.mousey=0;
}
MoveTool.prototype = new AbstractTool;
MoveTool.prototype.getIcon = function(display,e) { return "cursor.svg"; }
MoveTool.prototype.getName = function() { return "move"; }

MoveTool.prototype.mousedown = function(display,e)
{
	display.canvas.style.cursor="move";
	this.mousedrag=true;
	this.mousex=e.clientX;
	this.mousey=e.clientY;
}

MoveTool.prototype.mouseup = function(display,e)
{
	display.canvas.style.cursor="default";
	this.mousedrag=false;
	this.mousex=0;
	this.mousey=0;
}

MoveTool.prototype.mousemove = function(display,e)
{
	if(!this.mousedrag) {return;}
	display.x+=(e.clientX-this.mousex)/display.zoom_level;
	display.y+=(e.clientY-this.mousey)/display.zoom_level;
	this.mousex=e.clientX;
	this.mousey=e.clientY;
	display.redraw();
}

MoveTool.prototype.mousewheel = function(display,e)
{
	var p=display.xy(e);
	e.stopPropagation();
	e.preventDefault();
	var scale=Math.pow(2,e.deltaY/240)
	display.zoom(display.zoom_level*scale,p.x,p.y);
}

//
// An abstract for tools that want to be moveable
//
function Movable()
{
}
Movable.prototype = new MoveTool;
Movable.prototype.super = new MoveTool;
Movable.prototype.mousedown = function(display,e)
{
	var self=this;
	this.timeout=setTimeout(function() { self._startDrag(display,e); },150);
}
Movable.prototype._startDrag = function(display,e)
{
	this.timeout=0;
	this.startDrag(display,e);
	this.super.mousedown.call(this,display,e);
	display.redraw();
}

Movable.prototype.mouseup = function(display,e)
{
	if( this.timeout )
	{
		clearTimeout(this.timeout);
		this.click(display,e);
	}
	else
	{
		this.super.mouseup.call(this,display,e);
		this.endDrag(display,e);
	}
}

Movable.prototype.mousemove = function(display,e)
{
	if(this.mousedrag) 
	{ 
		this.super.mousemove.call(this,display,e); 
	}
	else
	{
		this.move(display,e);
	}
}

// The methods that should be overriden
Movable.prototype.startDrag = function(display,e) {}
Movable.prototype.endDrag = function(display,e) {}
Movable.prototype.click = function(display,e) {}
Movable.prototype.move = function(display,e) {}

//
// The projector tool
//
function ProjectorTool(projector)
{
	this.projector=projector;

}
ProjectorTool.prototype = new Movable;
ProjectorTool.prototype.getIcon = function(display,e) { return "film.svg"; }
ProjectorTool.prototype.getName = function() { return "projector"; }
ProjectorTool.prototype.selected = function(display) 
{ 
	display.canvas.style.cursor="default"; 
}

//
// The marker tool
//
function MarkerTool()
{
	this.marker=new Marker(0,0);
    this.marker.editable=false;
}
MarkerTool.prototype = new Movable;
MarkerTool.prototype.getIcon = function(display,e) { return "marker.svg"; }
MarkerTool.prototype.getName = function() { return "marker"; }
MarkerTool.prototype.selected = function(display) 
{ 
	display.canvas.style.cursor="none"; 
	display.addDepiction(this.marker);
}
MarkerTool.prototype.unselected = function(display) 
{ 
	display.canvas.style.cursor="default"; 
	display.removeDepiction(this.marker);
}

MarkerTool.prototype.mouseout = function(display,e)
{
	this.marker.display=false;
	display.redraw();
}

MarkerTool.prototype.startDrag = function(display,e)
{
	this.marker.display=false;
}

MarkerTool.prototype.endDrag = function(display,e)
{
	this.move(display,e);	
}

MarkerTool.prototype.click = function(display,e)
{
	var p=display.xy(e);
	display.addDepiction(new Marker(p.x,p.y));
	display.redraw();
}

MarkerTool.prototype.move = function(display,e)
{
	display.canvas.style.cursor="none"; 
	var p=display.xy(e);
	this.marker.display=true;
	this.marker.setXY(p.x,p.y);
	display.redraw();
}

//
// The line tool
//
function LineTool(color)
{
	this.color=color || "#ff0000";
	this.line=new Line();
	this.line.display=false;
	this.line.editable=false;
	this.line.style="rgba(255,0,0,1.0)";
    this.p={x:0,y:0};
}
LineTool.prototype = new Movable;
LineTool.prototype.getIcon = function(display,e) { return "line_draw.svg"; }
LineTool.prototype.getName = function() { return "line draw"; }

LineTool.prototype.selected = function(display) 
{ 
	display.addDepiction(this.line);
}

LineTool.prototype.unselected = function(display) 
{ 
	display.removeDepiction(this.line);
}

LineTool.prototype.keyup = function(display,e) 
{
	if( this.line.display && !e.shiftKey )
	{
		this.line.setEnd(this.p.x,this.p.y);
		display.redraw();
	}
}

LineTool.prototype.keydown = function(display,e) 
{
	if( this.line.display )
	{
		if( e.shiftKey )
		{
			var p={x: this.line.x1, y: this.line.y1}
			this.orthoginalize(p);
			this.line.setEnd(p.x,p.y);
			display.redraw();
		}
	}
}

LineTool.prototype.orthoginalize = function(p)
{
	if(Math.abs(this.line.x0-p.x)>Math.abs(this.line.y0-p.y))
	{
		p.y=this.line.y0;
	}
	else
	{
		p.x=this.line.x0;
	}
}

LineTool.prototype.click = function(display,e)
{
	var p=display.xy(e);
	if(!this.line.display)
	{
		this.line.setStart(p.x,p.y);
		this.line.setEnd(p.x,p.y);
		this.line.display=true;
		display.canvas.style.cursor="none";
	}
	else
	{
		this.line.display=false;
        var line=this.line.clone();
	    display.addDepiction(line);
		display.canvas.style.cursor="default";
	}
	
	display.redraw();
}

LineTool.prototype.endDrag = function(display,e)
{
	display.canvas.style.cursor="default";
	if( this.line.display )
	{
		display.canvas.style.cursor="none";
	}
}


LineTool.prototype.move = function(display,e)
{
	var p=display.xy(e);
	this.p={x: p.x, y: p.y};
	if(this.line.display)
	{
		if( e.shiftKey )
		{
			this.orthoginalize(p);
		}
		this.line.setEnd(p.x,p.y);
		display.redraw();
	}
}

//
// The draw tool
//
function DrawTool(color)
{
	this.color=color || "#ff0000";
	this.line=null;
}
DrawTool.prototype = new AbstractTool;
DrawTool.prototype.getIcon = function(display,e) { return "free_draw.svg"; }
DrawTool.prototype.getName = function() { return "free draw"; }

//
// The zoom tool
//
function ZoomTool(color)
{
	this.color=color || "#ff0000";
	this.line=null;
}
ZoomTool.prototype = new AbstractTool;
ZoomTool.prototype.getIcon = function(display,e) { return "zoom.svg"; }
ZoomTool.prototype.getName = function() { return "zoom"; }

//
// The measure tool
//
function MeasureTool(color)
{
	this.color=color || "#ff0000";
	this.line=new Measure();
	this.line.display=false;
	this.line.editable=false;
	this.line.style="rgba(255,0,0,0.5)";
	this.p={x:0,y:0};
}
MeasureTool.prototype = new LineTool;
MeasureTool.prototype.getIcon = function(display,e) { return "measure.svg"; }
MeasureTool.prototype.getName = function() { return "measure"; }

//
// The compass tool
//
function CompassTool(color)
{
	this.color=color || "#ff0000";
	this.line=null;
	this.points=[];
	this.circle=new Circle(0,0);
	this.circle.display=false;
}
CompassTool.prototype = new Movable;
CompassTool.prototype.getIcon = function(display,e) { return "compass.svg"; }
CompassTool.prototype.getName = function() { return "compass"; }

CompassTool.prototype.selected = function(display) 
{
	display.addDepiction(this.circle);
}

CompassTool.prototype.unselected = function(display) 
{ 
	for(var n=0; n<this.points.length; n++)
	{
		display.removeDepiction(this.points[n]);
	}
	this.point=[];
	display.removeDepiction(this.circle);
	display.redraw();
}

CompassTool.prototype.recalculate = function()
{
// http://www.dtcenter.org/met/users/docs/write_ups/circle_fit.pdf
	var N=this.points.length;
	if( N>2 )
	{
		var xbar=0;
		var ybar=0;
		for(var n=0; n<N; n++)
		{
			xbar+=this.points[n].x;
			ybar+=this.points[n].y;
		}
		xbar/=N;
		ybar/=N;
		var u=[];
		var v=[];
		var Suu=0;
		var Svv=0;
		var Suv=0;
		var Suuu=0;
		var Svvv=0;
		var Suvv=0;
		var Svuu=0;
		for(var n=0; n<N; n++)
		{
			u[n]=this.points[n].x-xbar;
			v[n]=this.points[n].y-ybar;
			Suu+=u[n]*u[n];
			Svv+=v[n]*v[n];
			Suv+=u[n]*v[n];
			Suuu+=u[n]*u[n]*u[n];
			Svvv+=v[n]*v[n]*v[n];
			Suvv+=u[n]*v[n]*v[n];
			Svuu+=v[n]*u[n]*u[n];
		}
		var uc=.5*(Svv*(Suuu+Suvv)-Suv*(Svvv+Svuu))/(Suu*Svv-Suv*Suv);
		var vc=(.5*(Suuu+Suvv)-uc*Suu)/Suv;
		var xc=uc+xbar;
		var yc=vc+ybar;
		var r=Math.sqrt(uc*uc+vc*vc+(Suu+Svv)/N)
		this.circle.x=xc;
		this.circle.y=yc;
		this.circle.r=r;
		this.circle.display=true;
	}
}

CompassTool.prototype.click = function(display,e)
{
	var p=display.xy(e);
	var point=new Point(p.x,p.y);
	this.points.push(point);
	display.addDepiction(point);
	this.recalculate();
	display.redraw();
}

function fit_circle(points)
{
	var N=points.length;
	if( N>2 )
	{
		var xbar=0;
		var ybar=0;
		for(var n=0; n<N; n++)
		{
			xbar+=points[n].x;
			ybar+=points[n].y;
		}
		xbar/=N;
		ybar/=N;
		var u=[];
		var v=[];
		var Suu=0;
		var Svv=0;
		var Suv=0;
		var Suuu=0;
		var Svvv=0;
		var Suvv=0;
		var Svuu=0;
		for(var n=0; n<N; n++)
		{
			u[n]=points[n].x-xbar;
			v[n]=points[n].y-ybar;
			Suu+=u[n]*u[n];
			Svv+=v[n]*v[n];
			Suv+=u[n]*v[n];
			Suuu+=u[n]*u[n]*u[n];
			Svvv+=v[n]*v[n]*v[n];
			Suvv+=u[n]*v[n]*v[n];
			Svuu+=v[n]*u[n]*u[n];
		}
		var uc=.5*(Svv*(Suuu+Suvv)-Suv*(Svvv+Svuu))/(Suu*Svv-Suv*Suv);
		var vc=(.5*(Suuu+Suvv)-uc*Suu)/Suv;
		var xc=uc+xbar;
		var yc=vc+ybar;
		var r=Math.sqrt(uc*uc+vc*vc+(Suu+Svv)/N)
	}
	
}
