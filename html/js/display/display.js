/*
 *  display.js
 *  Utility functions and main Display object
 */
var script_src=document.currentScript.src;
var path=script_src.substring(0,script_src.lastIndexOf('/')+1)+'display/'

function toggle_class(node,classname1,classname2)
{
	/* if classname1 exists */
	if( node.className.search( re=new RegExp('\\b'+classname1+'\\b','g')) >-1 )
	{
		node.className=node.className.replace( re,'')
		node.className=node.className+' '+classname2;
		node.className=node.className.replace( /\s{2,}/g,' ')
	}
	/* if classname 2 exists */
	else if( node.className.search( re=new RegExp('\\b'+classname2+'\\b','g')) >-1 )
	{
		node.className=node.className.replace( re,'')
		node.className=node.className+' '+classname1;
		node.className=node.className.replace( /\s{2,}/g,' ')
	}
}

function add_class(node,classname)
{
	var cn=node.className;
	if( cn.search( new RegExp('\\b'+classname+'\\b')) == -1 )
	{
		node.className=cn+' '+classname;
	}
}

function remove_class(node,classname)
{
	node.className=node.className.replace( new RegExp('\\b'+classname+'\\b','g'),'')
	node.className=node.className.replace( /\s{2,}/g,' ')
}

function has_class(node,classname)
{
	return node.className.search( new RegExp('\\b'+classname+'\\b')) == -1 
}

function add_stylesheet(stylesheet)
{
	var style=document.createElement('link');
	style.rel="stylesheet";
	style.href=path+"css/"+stylesheet;
	document.head.appendChild(style);
}

function get_img_url(img)
{
	return path+"img/"+img;
}

/*
 * The data field manager
 */
function DataFieldManager(elem)
{
	this.elem=elem
	this.reference_data_field=null;
	this.data_fields={}
}

DataFieldManager.prototype.add_data_field = function(data_field)
{
	console.log('Adding data field: ')
	console.log(data_field)
	if( !('xy' in data_field) )
	{
		if( data_field.dimensions==1 )
		{
			data_field['x']=function(x) { return this.x0+this.dx*x }
		}
		else if ( data_field.dimensions==2 )
		{
			data_field['xy']=function(x,y) { return [this.x0+this.dx*x,this.y0+this.dy*y] }
		}
	}
	if( !this.reference_data_field ) { this.reference_data_field=data_field }
	this.data_fields[data_field.path]=data_field
	movie.addDataField(data_field,'frame')

	var display=document.getElementById('data_field_template').cloneNode(true)
	display.id=data_field.path
	this.elem.appendChild(display)
}

DataFieldManager.prototype.del_data_field = function(data_field)
{
	console.log('Deleting data field: ')
	console.log(data_field)
	delete this.data_fields[data_field]
}

/*
 * The depiction manager
 */
function DepictionManager(elem)
{
	this.elem=elem;
	this.display=null;
	this.depictions=[];
}

DepictionManager.prototype.addDepiction = function (obj,n)
{
	this.depictions.splice(n!=null?n:this.depictions.length,0,obj);
	if( obj.editable )
	{
//		obj.div=document.createElement('div');
//		obj.div.depiction=obj;
//		obj.div.className='depiction';
//		var self=this;
//		obj.div.addEventListener('click',function(e) {self.selectDepiction(e.target.depiction)}); 
//		obj.div.innerHTML=obj;
//		this.elem.appendChild(obj.div);
//		this.selectDepiction(obj);
	}
}

DepictionManager.prototype.removeDepiction = function (obj)
{
	var ndx;
	while( (ndx=this.depictions.indexOf(obj)) != -1 ) 
	{ 
		var depiction=this.depictions[ndx];
		this.depictions.splice(ndx,1); 
		if( depiction.div )
		{
			depiction.div.parentElement.removeChild(depiction.div);
		}
	}
}

DepictionManager.prototype.selectDepiction = function(obj)
{
	for( var i=0; i<this.depictions.length; i++)
	{
		var d=this.depictions[i];
		if( d.div )
		{
			if( obj===d )
			{
				add_class(d.div,'selected');
				document.getElementById(d.getEditor()).style.display='block';
				d.selected=true;
			}
			else
			{
				remove_class(d.div,'selected');
				d.selected=false;
			}
		}
	}	
	this.display.redraw();
}

/*
 *  The display object
 */
function Display(elem,depiction_mgr,data_field_mgr)
{
	var self=this

	// Our internal state
	this.w=0;
	this.h=0;
	this.x=0;
	this.y=0;
	this.zoom_level=1.0;
	this.smooth=false;
	this.data_field_mgr=data_field_mgr
	this.data_field_mgr.display=this
	Object.defineProperty(this,'reference_data_field',{ get: function() { return self.data_field_mgr.reference_data_field } } )
	this.depiction_mgr=depiction_mgr;
	this.depiction_mgr.display=this;
	this.listeners={};

	// The Current tool
	this.tool=null;
	// Add a stylesheet
	add_stylesheet("display.css");

	// Make the canvas
	this.canvas=document.createElement("canvas");
	this.paper=this.canvas.getContext('2d');
	this.canvas.width=100;
	this.canvas.height=100;
	this.canvas.tabIndex=0;
	add_class(this.canvas,"glf_canvas");
	this.container=document.createElement("div");
	add_class(this.container,"glf_container");
	this.container.appendChild(this.canvas);
	elem.appendChild(this.container);
	this.controls=document.createElement("div");
	add_class(this.controls,"glf_controls");
	elem.appendChild(this.controls);	
	this.info=document.createElement("div");
	add_class(this.info,"glf_info");
	elem.appendChild(this.info);
	this.info_status=document.createElement("div");
	add_class(this.info_status,"glf_info_status");
	this.info.appendChild(this.info_status);
	this.model_info=document.createElement("div");
	add_class(this.info,"glf_info");
	this.info.appendChild(this.model_info);

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
	this.updateXY({clientX:rect.left,clientY:rect.top})
}

Display.prototype.toString = function()
{
	return "Display[canvas#"+this.canvas.id+"]";
}

Display.prototype.setStatus = function(name,value,formatter)
{ 
	var e=document.getElementById(name+'_status');
	if (formatter!=undefined)
	{
		formatter(e,value);
	}
	else
	{
		e.innerHTML=value;
	}
}

Display.prototype.updateXY = function(e)
{
	var self=this
	var xy=this.xy(e);
	xy.x=Math.floor(xy.x)
	xy.y=Math.floor(xy.y)
	var fmt="%s"
	var df_x="-"
	var df_y="-"
	var unit=''
	if( this.data_field_mgr.reference_data_field )
	{
		var df=this.data_field_mgr.reference_data_field
		fmt=df.dimension_format
		unit=df.dimension_unit
		df_x=df.x0+xy.x*df.dx
		df_y=df.y0+xy.y*df.dy
	}
	
	var status_string=sprintf('<span class="label">XY:</span>(%d,%d) / ('+fmt+' <span class="label">%s</span>,'+fmt+' <span class="label">%s</span>)',xy.x,xy.y,df_x,unit,df_y,unit)
	this.setStatus('xy',status_string)
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
			this.depiction_mgr.depictions[i].call(this);
		}
	}
}


