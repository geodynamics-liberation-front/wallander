/*
 *  Utility functions
 */
var script_src=document.currentScript.src;
var path=script_src.substring(0,script_src.lastIndexOf('/')+1)


function add_class(node,classname)
{
	cn=node.className;
	if( cn.search(classname) == -1 )
	{
		if( cn.length>0 && cn[0]!=" " )
		{
			cn=" "+cn
		}
		node.className=cn+" "+classname+" ";
	}
}

function remove_class(node,classname)
{
	cn=node.className;
	if( cn.length>0 && cn[0]!=" " )
	{
		cn=" "+cn+" ";
	}
	node.className=cn.replace(" "+classname+" ","");
}

function has_class(node,classname)
{
	return node.className.indexOf(" "+classname+" ")!=-1;
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
 * The depiction manager
 */
function DepictionManager(elem,editor)
{
	this.elem=elem;
	this.editor=editor;
	this.display=null;
	this.depictions=[];
}
DepictionManager.prototype.addDepiction = function (obj,n)
{
	this.depictions.splice(n!=null?n:this.depictions.length,0,obj);
	if( obj.editable )
	{
		obj.div=document.createElement('div');
		obj.div.depiction=obj;
		obj.div.className='depiction';
		var self=this;
		obj.div.addEventListener('click',function(e) {self.selectDepiction(e.target.depiction)}); 
		obj.div.innerHTML=obj;
		this.elem.appendChild(obj.div);
		this.selectDepiction(obj);
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
	var editors=this.editor.children;
	for( var i=0; i<editors.length; i++ )
	{
		editors[i].style.display='none';
	}
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
function Display(parent,depiction_mgr)
{
	// Add a stylesheet
	add_stylesheet("display.css");
	// Make the canvas as ours and put it in a frame
	this.canvas=document.createElement("canvas");
	this.canvas.width=100;
	this.canvas.height=100;
	this.canvas.tabIndex=0;
	add_class(this.canvas,"glf_canvas");
	this.container=document.createElement("div");
	add_class(this.container,"glf_container");
	this.container.appendChild(this.canvas);
	parent.appendChild(this.container);
	this.controls=document.createElement("div");
	add_class(this.controls,"glf_controls");
	parent.appendChild(this.controls);	
	this.info=document.createElement("div");
	add_class(this.info,"glf_info");
	parent.appendChild(this.info);
	this.info_status=document.createElement("div");
	add_class(this.info_status,"glf_info_status");
	this.info.appendChild(this.info_status);
	this.model_info=document.createElement("div");
	add_class(this.info,"glf_info");
	this.info.appendChild(this.model_info);
	

	// Get the context
	this.paper=this.canvas.getContext('2d');

	// Our internal state
	this.w=0;
	this.h=0;
	this.x=0;
	this.y=0;
	this.zoom_level=1.0;
	this.smooth=false;
	this.depiction_mgr=depiction_mgr;
	this.listeners={};

	// The Current tool
	this.tool=new AbstractTool();

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
	var xy=this.xy(e);
	this.setStatus('xy','<span class="label">XY:</span>('+Math.floor(xy.x)+','+Math.floor(xy.y)+')');
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


