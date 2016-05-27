/*
 *  display.js
 *  Main Display object
 */

/*
 *  The display object
 */
function Display(elem,depiction_elem,data_field_elem,status_elem)
{
	var self=this

	// Our internal state
	this.w=0;
	this.h=0;
	this.x=0;
	this.y=0;
	this.zoom_level=1.0;
	this.smooth=false;

	// Add a stylesheet
	add_stylesheet("display.css");

	// create the depiction manager
	this.depiction_mgr=new DepictionManager(depiction_elem,this)

	// create the data field mananger
	this.data_field_mgr=new DataFieldManager(data_field_elem,this)
	Object.defineProperty(this,'reference_data_field',{ get: function() { return self.data_field_mgr.reference_data_field } } )

	// create the status manager
	this.status_mgr=new StatusManager(status_elem,this)
	this.status_mgr.add_status('fps')
	this.status_mgr.add_status('frame')
	this.status_mgr.add_status('time')
	this.status_mgr.add_status('xy')
	this.status_mgr.add_status('dimensional_xy','dimensional xy','xy')

	// Make the canvas
	this.canvas=document.createElement("canvas");
	this.paper=this.canvas.getContext('2d');
	this.canvas.width=100;
	this.canvas.height=100;
	this.canvas.tabIndex=0;
	add_class(this.canvas,"wallander_canvas");
	this.container=document.createElement("div");
	add_class(this.container,"wallander_container");
	this.container.appendChild(this.canvas);
	elem.appendChild(this.container);
	this.controls=document.createElement("div");
	add_class(this.controls,"wallander_controls");
	elem.appendChild(this.controls);	
	this.info=document.createElement("div");
	add_class(this.info,"wallander_info");
	elem.appendChild(this.info);
	this.info_status=document.createElement("div");
	add_class(this.info_status,"wallander_info_status");
	this.info.appendChild(this.info_status);
	this.model_info=document.createElement("div");
	add_class(this.info,"wallander_info");
	this.info.appendChild(this.model_info);

	// create the projector
	this.projector=new Projector(this)

	// create the toolbox
	this.tool=null;
	this.toolbox=new ToolBox(this);


	// Register some events
	var self=this;
	this.container.addEventListener('mouseup',function() { self.resize(); }); 
	this.canvas.addEventListener('mouseclick', function(e) { self.tool.mouseclick(self,e); });
	this.canvas.addEventListener('mousedown', function(e) { self.tool.mousedown(self,e); });
	this.canvas.addEventListener('mouseup',function(e) {self.tool.mouseup(self,e);});
	this.canvas.addEventListener('mousemove',function(e) {self.tool.mousemove(self,e);});
	this.canvas.addEventListener('mousemove',function(e) {self.updateXY(e);});
	this.canvas.addEventListener('mouseout',function(e) {self.tool.mouseout(self,e);});
	this.canvas.addEventListener('mousewheel',function(e) {self.tool.mousewheel(self,e);});
	this.canvas.addEventListener('keydown',function(e) {self.tool.keydown(self,e);});
	this.canvas.addEventListener('keyup',function(e) {self.tool.keyup(self,e);});
	this.resize();
	var rect = this.canvas.getBoundingClientRect();
	this.lastXY=this.xy({clientX:rect.left,clientY:rect.top})
	this.updateXY()
	this.projector.updateStatus()
}

Display.prototype.toString = function()
{
	return "Display[canvas#"+this.canvas.id+"]";
}

Display.prototype.restoreState = function(name,callback)
{
	var self=this
	console.log("Restoring state "+name)
	jsonCall('/wallander/s/'+name,function(state,callback) { self.stateRestored(state,callback) },callback)	
}

Display.prototype.stateRestored = function(state,callback)
{
	this.deserialize(state,callback)
}

Display.prototype.saveState = function()
{
	var self=this
	jsonCall('/wallander/s',function(name) { self.stateSaved(name) },null,this.serialize())	
}

Display.prototype.stateSaved = function(name)
{
	console.log("State saved as "+name)
}

Display.prototype.serialize = function()
{
	state={}
	state.status_mgr=display.status_mgr.serialize()
	state.data_field_mgr=display.data_field_mgr.serialize()
	return JSON.stringify(state)	
}

Display.prototype.deserialize = function(state,callback)
{
	if( typeof(state)=='string' )	
	{
		state=JSON.parse(serialized_obj)
	}
	console.log(state)
	this.status_mgr.deserialize(state.status_mgr)
	this.data_field_mgr.deserialize(state.data_field_mgr,callback)
}

Display.prototype.updateXY = function(e)
{
	var self=this
	// Update the XY locations
	var xy=this.lastXY=e?this.xy(e):this.lastXY
	xy.x=Math.floor(xy.x)
	xy.y=Math.floor(xy.y)
	var fmt="%s"
	var dfxy={x:'-',y:'-'}
	var unit=''
	if( this.data_field_mgr.reference_data_field )
	{
		var df=this.data_field_mgr.reference_data_field
		dfxy=df.xy(xy.x,xy.y)
		fmt=df.dimension_format
		unit=df.dimension_unit
	}
	
	this.status_mgr.set_status('xy','('+xy.x+','+xy.y+')')

	var status_string=sprintf('('+fmt+' <span class="label">%s</span>,'+fmt+' <span class="label">%s</span>)',dfxy.x,unit,dfxy.y,unit)
	this.status_mgr.set_status('dimensional_xy',status_string)
	if( this.projector && !this.projector.playing )
	{
		this.data_field_mgr.updateXY(this.projector.movie.frame,xy.x,xy.y)
	}
}


Display.prototype.addDataField = function (df)
{
	this.data_field_mgr.addDataField(df)
}

Display.prototype.addDepiction = function (obj,n)
{
	this.depiction_mgr.addDepiction(obj,n);
}

Display.prototype.removeDepiction = function (obj)
{
	this.depiction_mgr.removeDepiction(obj);
}

Display.prototype.selectDepiction = function(obj)
{
	this.depiction_mgr.selectDepiction(obj);
}

Display.prototype.setSize = function (w,h)
{
	this.container.style.width=w+"px";
	this.container.style.height=h+"px";
	this.resize();
}

Display.prototype.save = function()
{
	window.open(this.canvas.toDataURL())
}

Display.prototype.resize = function ()
{
	var s=window.getComputedStyle(this.container);
	this.canvas.width=this.container.clientWidth-parseInt(s.getPropertyValue('padding-left'))-parseInt(s.getPropertyValue('padding-right'));
	this.canvas.height=this.container.clientHeight-parseInt(s.getPropertyValue('padding-top'))-parseInt(s.getPropertyValue('padding-bottom'));;
	this.canvas.style.width=this.canvas.width+"px";
	this.canvas.style.height=this.canvas.height+"px";
	this.w=this.canvas.width/this.zoom_level;
	this.h=this.canvas.width/this.zoom_level;
	this.redraw();
}

Display.prototype.getBounds = function()
{
	var top=Number.MAX_VALUE;
	var bottom=Number.MIN_VALUE;
	var left=Number.MAX_VALUE;
	var right=Number.MIN_VALUE;
	var bounds=null;

	for( var i=0; i<this.depictions.length; i++)
	{
		if( this.depictions[i].getBounds )
		{
			bounds=this.depictions[i].getBounds();
			top=Math.min(top,bounds.y);
			left=Math.min(left,bounds.x);
			bottom=Math.max(bottom,bounds.y+bounds.height);
			right=Math.max(right,bounds.x+bounds.width);
		}
	}
	var width=right-left;
	var height=bottom-top;
	return {x: left,
            y: top,
            width: width,
            height: height};
}

Display.prototype.reset = function()
{
	var bounds=this.getBounds();
	console.log(bounds);
	this.w=bounds.width;
	this.h=bounds.height;
	this.canvas.width=this.w;
	this.canvas.height=this.h;
	this.canvas.style.width=this.w+"px";
	this.canvas.style.height=this.h+"px";
	this.x=bounds.x;
	this.y=bounds.y;
	this.zoom_level=1.0;
	this.redraw();
}

Display.prototype.xy = function(e)
{
	var rect = this.canvas.getBoundingClientRect();
	var x=(e.clientX-rect.left)/this.zoom_level-this.x;
	var y=(e.clientY-rect.top)/this.zoom_level-this.y;
	return {'x':x,'y':y};
}

Display.prototype.zoom = function(n,x,y)
{ 
	if( x!=null )
	{
		this.x=(x+this.x)*this.zoom_level/n-x;
		this.y=(y+this.y)*this.zoom_level/n-y;
	}
	this.zoom_level=n;
	this.w=this.canvas.width/this.zoom_level;
	this.h=this.canvas.width/this.zoom_level;
	this.redraw();
}

Display.prototype.redraw = function()
{
	// Reset the canvas
	this.canvas.width=this.canvas.width;
	// We like chunky bitmaps
	this.paper.imageSmoothingEnabled=this.smooth;
	this.paper.scale(this.zoom_level,this.zoom_level); 
	this.paper.translate(this.x,this.y);
	for( var i=0; i<this.depiction_mgr.depictions.length; i++)
	{
		if( this.depiction_mgr.depictions[i].display )
		{
			this.depiction_mgr.depictions[i].draw(this);
		}
	}
}


