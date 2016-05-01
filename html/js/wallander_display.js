/*
 * sprintf.js
 */

(function(window) {
    var re = {
        not_string: /[^s]/,
        number: /[def]/,
        text: /^[^\x25]+/,
        modulo: /^\x25{2}/,
        placeholder: /^\x25(?:([1-9]\d*)\$|\(([^\)]+)\))?(\+)?(0|'[^$])?(-)?(\d+)?(?:\.(\d+))?([b-fosuxX])/,
        key: /^([a-z_][a-z_\d]*)/i,
        key_access: /^\.([a-z_][a-z_\d]*)/i,
        index_access: /^\[(\d+)\]/,
        sign: /^[\+\-]/
    }

    function sprintf() {
        var key = arguments[0], cache = sprintf.cache
        if (!(cache[key] && cache.hasOwnProperty(key))) {
            cache[key] = sprintf.parse(key)
        }
        return sprintf.format.call(null, cache[key], arguments)
    }

    sprintf.format = function(parse_tree, argv) {
        var cursor = 1, tree_length = parse_tree.length, node_type = "", arg, output = [], i, k, match, pad, pad_character, pad_length, is_positive = true, sign = ""
        for (i = 0; i < tree_length; i++) {
            node_type = get_type(parse_tree[i])
            if (node_type === "string") {
                output[output.length] = parse_tree[i]
            }
            else if (node_type === "array") {
                match = parse_tree[i] // convenience purposes only
                if (match[2]) { // keyword argument
                    arg = argv[cursor]
                    for (k = 0; k < match[2].length; k++) {
                        if (!arg.hasOwnProperty(match[2][k])) {
                            throw new Error(sprintf("[sprintf] property '%s' does not exist", match[2][k]))
                        }
                        arg = arg[match[2][k]]
                    }
                }
                else if (match[1]) { // positional argument (explicit)
                    arg = argv[match[1]]
                }
                else { // positional argument (implicit)
                    arg = argv[cursor++]
                }

                if (get_type(arg) == "function") {
                    arg = arg()
                }

                if (re.not_string.test(match[8]) && (get_type(arg) != "number" && isNaN(arg))) {
                    throw new TypeError(sprintf("[sprintf] expecting number but found %s", get_type(arg)))
                }

                if (re.number.test(match[8])) {
                    is_positive = arg >= 0
                }

                switch (match[8]) {
                    case "b":
                        arg = arg.toString(2)
                    break
                    case "c":
                        arg = String.fromCharCode(arg)
                    break
                    case "d":
                        arg = parseInt(arg, 10)
                    break
                    case "e":
                        arg = match[7] ? arg.toExponential(match[7]) : arg.toExponential()
                    break
                    case "f":
                        arg = match[7] ? parseFloat(arg).toFixed(match[7]) : parseFloat(arg)
                    break
                    case "o":
                        arg = arg.toString(8)
                    break
                    case "s":
                        arg = ((arg = String(arg)) && match[7] ? arg.substring(0, match[7]) : arg)
                    break
                    case "u":
                        arg = arg >>> 0
                    break
                    case "x":
                        arg = arg.toString(16)
                    break
                    case "X":
                        arg = arg.toString(16).toUpperCase()
                    break
                }
                if (!is_positive || (re.number.test(match[8]) && match[3])) {
                    sign = is_positive ? "+" : "-"
                    arg = arg.toString().replace(re.sign, "")
                }
                pad_character = match[4] ? match[4] == "0" ? "0" : match[4].charAt(1) : " "
                pad_length = match[6] - (sign + arg).length
                pad = match[6] ? str_repeat(pad_character, pad_length) : ""
                output[output.length] = match[5] ? sign + arg + pad : (pad_character == 0 ? sign + pad + arg : pad + sign + arg)
            }
        }
        return output.join("")
    }

    sprintf.cache = {}

    sprintf.parse = function(fmt) {
        var _fmt = fmt, match = [], parse_tree = [], arg_names = 0
        while (_fmt) {
            if ((match = re.text.exec(_fmt)) !== null) {
                parse_tree[parse_tree.length] = match[0]
            }
            else if ((match = re.modulo.exec(_fmt)) !== null) {
                parse_tree[parse_tree.length] = "%"
            }
            else if ((match = re.placeholder.exec(_fmt)) !== null) {
                if (match[2]) {
                    arg_names |= 1
                    var field_list = [], replacement_field = match[2], field_match = []
                    if ((field_match = re.key.exec(replacement_field)) !== null) {
                        field_list[field_list.length] = field_match[1]
                        while ((replacement_field = replacement_field.substring(field_match[0].length)) !== "") {
                            if ((field_match = re.key_access.exec(replacement_field)) !== null) {
                                field_list[field_list.length] = field_match[1]
                            }
                            else if ((field_match = re.index_access.exec(replacement_field)) !== null) {
                                field_list[field_list.length] = field_match[1]
                            }
                            else {
                                throw new SyntaxError("[sprintf] failed to parse named argument key")
                            }
                        }
                    }
                    else {
                        throw new SyntaxError("[sprintf] failed to parse named argument key")
                    }
                    match[2] = field_list
                }
                else {
                    arg_names |= 2
                }
                if (arg_names === 3) {
                    throw new Error("[sprintf] mixing positional and named placeholders is not (yet) supported")
                }
                parse_tree[parse_tree.length] = match
            }
            else {
                throw new SyntaxError("[sprintf] unexpected placeholder")
            }
            _fmt = _fmt.substring(match[0].length)
        }
        return parse_tree
    }

    var vsprintf = function(fmt, argv, _argv) {
        _argv = (argv || []).slice(0)
        _argv.splice(0, 0, fmt)
        return sprintf.apply(null, _argv)
    }

    /**
     * helpers
     */
    function get_type(variable) {
        return Object.prototype.toString.call(variable).slice(8, -1).toLowerCase()
    }

    function str_repeat(input, multiplier) {
        return Array(multiplier + 1).join(input)
    }

    /**
     * export to either browser or node.js
     */
    if (typeof exports !== "undefined") {
        exports.sprintf = sprintf
        exports.vsprintf = vsprintf
    }
    else {
        window.sprintf = sprintf
        window.vsprintf = vsprintf

        if (typeof define === "function" && define.amd) {
            define(function() {
                return {
                    sprintf: sprintf,
                    vsprintf: vsprintf
                }
            })
        }
    }
})(typeof window === "undefined" ? this : window)
/*
 *  display.js
 *  Utility functions
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


/*
 * projector.js
 */

sec_in_ma=1e6*365.25*24*3600
function new_button(onclick,name,controls)
{
	var btn=new Image();
	btn.src=get_img_url(name+".svg");
	btn.addEventListener('click',onclick);
	controls.appendChild(btn)
	return btn;
}

function Projector(display,movie)
{
	this.display=display;
	display.projector=this;
	// some listeners

	this.movie=movie
	movie.projector=this
	var self=this;
	movie.addEventListener('load',function(e) { self.loaded(e); });
	movie.addEventListener('stop',function(e) { self.stopped(e); });
	this.display.addDepiction( movie );
	movie.show();
	this.loop=false;
	this.fps=10;
	this.frameTime=0
	this.direction=1;
	this.playing=false;


	// Setup the controls
	this.controls=document.createElement("div");
	add_class(this.controls,"glf_projector_controls");
	display.controls.appendChild(this.controls);
	// And the buttons
	this.btn_begining=new_button(function(e){self.begining();},"begining",this.controls);
	this.btn_rr=new_button(function(e){self.rewind();},"rr",this.controls);
	this.btn_pause=new_button(function(e){self.pause();},"pause",this.controls);
	this.btn_pause.style.display='none';
	this.btn_play=new_button(function(e){self.play();},"play",this.controls);
	this.btn_ff=new_button(function(e){self.fastforward();},"ff",this.controls);
	this.btn_end=new_button(function(e){self.end();},"end",this.controls);
}

Projector.prototype.updateStatus = function(name,value)
{
	this.display.setStatus(name,'<span class="label">'+name+':</span>'+value);
}

Projector.prototype.pause = function()
{
	this.playing=false;
	this.btn_play.style.display='';
	this.btn_pause.style.display='none';
	remove_class(this.controls,"glf_playing")
	this.frameTime=-1
}

Projector.prototype.play = function()
{
	this.playing=true;
	this.btn_play.style.display='none';
	this.btn_pause.style.display='';
	add_class(this.controls,"glf_playing")
	this.next();
}

Projector.prototype.rewind = function()
{
	if( this.direction==-1 && this.playing )
	{
		this.fps+=10;
	}
	else
	{
		this.direction=-1;
		this.next();
	}
}
Projector.prototype.fastforward = function()
{
	if( this.direction==1 && this.playing )
	{
		this.fps+=10;
	}
	else
	{
		this.direction=1;
		this.next();
	}
}

Projector.prototype.begining = function()
{
	this.goto(this.movie.first)
}

Projector.prototype.end = function()
{
	this.goto(this.movie.last)
}

Projector.prototype.goto = function(frame)
{
	this.movie.frame=frame
	this.movie.show()
	this.display.setStatus('frame','<span class="label">frame:</span>'+frame)
}

Projector.prototype.next = function()
{
	this.movie.next(this.direction);
	frame=this.movie.frame
	if( this.playing && this.frameTime>0 ) 
	{
			this.actualFPS=Math.round(1000/(performance.now()-this.frameTime));
			this.display.setStatus('fps','<span class="label">fps:</span>'+this.actualFPS+'/'+this.fps)
	}
	this.frameTime=performance.now();
	this.display.setStatus('frame','<span class="label">frame:</span>'+frame)
}

Projector.prototype.loaded = function(e)
{
	this.display.redraw();
	if( this.playing )
	{
		var self=this;
		window.setTimeout(function() { self.next(); } ,(1000-(performance.now()-this.frameTime))/this.fps);
	}
	// TODO fire load event
	//this.updateXY();
}

Projector.prototype.stopped = function(e)
{
	this.pause();
	this.direction=1;
}


/*
 * depection.js
 */
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
	this.length=Math.sqrt(dx*dx+dy*dy);
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
	this.name="background";
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

function Movie()
{
	this.editable=true;
	this.display=true;
	this.selected=false;
	this.name='movie';
	this.data_fields={}
	this.z_order=[]
	this.x=0;
	this.y=0;
	this.frame=0;
	this.last=0;
	this.first=0;
	this.listeners={};
	this.load_count=0;
}

Movie.prototype.getEditor = function() { return 'movie_editor'; }

Movie.prototype.getBounds = function()
{
	var width=0;
	var height=0;
	for( var n=0; n<this.z_order.length; n++)
	{
		width=Math.max(width,this.data_fields[this.z_order[n]].img.width);
		height=Math.max(height,this.data_fields[this.z_order[n]].img.height);
	}
	return {x: this.x,
            y: this.y,
            width: width,
            height: height};
}

//Movie.prototype.getValues = function(x,y,callback)
//{
//	x=Math.floor(x)
//	y=Math.floor(y)
//	if( x<this.x || y<this.y )
//	{
//		for( var i=0; i<this.layers.length; i++)
//		{
//			callback(this.layers[i].name,'-')
//		}
//	}
//	else
//	{
//		for( var i=0; i<this.layers.length; i++)
//		{
//			var layer=this.layers[i];
//			if( x>this.x+layer.img.width ||
//                y>this.y+layer.img.height )
//			{
//				callback(layer.name,'-')
//			}
//			else
//			{
//				var ndx=this.frame+','+y+','+x
//				var self=this;
//				var name=layer.name;
//				jsonCall(layer.path+'frame/'+ndx,function(value,arg) { callback(arg,value); },name);
//			}
//		}
//	}
//}

Movie.prototype.addDataField = function(data_field,frame_type)
{
	if( data_field_name in this.data_fields ) { return; }
	var df={data_field: data_field, path: data_field.path, prefix: config[frame_type+'_prefix'], img: new Image(), opacity: 1.0};
	var data_field_name=data_field.path+":"+frame_type
	this.data_fields[data_field_name]=df
	this.z_order.push(data_field_name)
	this.last=Math.max(this.last,data_field.time.length-1)
	var self=this;
	df.img.addEventListener('load', function(e) { self.loaded(e); });
	this.show()
}

Movie.prototype.removeDataField = function(path,frame_type)
{
	if( data_field_name in this.data_fields ) 
	{ 
		var data_field_name=path+":"+frame_type
		delete this.data_fields[data_field_name]
		var ndx=this.z_order.indexOf(data_field_name)
		this.z_order.splice(ndx,1)
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
	this.load_count++;
	if( this.load_count>=this.z_order.length )
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
	return "Movie";
}

Movie.prototype.call = function(display)
{
	for( var i=0; i<this.z_order.length; i++)
	{
		var df=this.data_fields[this.z_order[i]];
		display.paper.globalAlpha=df.opacity
		display.paper.drawImage(df.img,this.x,this.y);
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
	for( var i=0; i<this.z_order.length; i++)
	{
		var df=this.data_fields[this.z_order[i]];
		df.img.src=df.prefix+df.path+'.'+df.data_field.renderer+'.'+sprintf("%05d",this.frame)+'.png'
	}
}
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
	this.display.tool=move_tool;	
	this.addTool(new ProjectorTool(display.projector));
	this.addTool(new MarkerTool());
	this.addTool(new MeasureTool());
	this.addTool(new CompassTool());
	this.addTool(new ZoomTool());
	this.addTool(new LineTool());
	this.addTool(new DrawTool());

	add_stylesheet("tools.css");	

	document.body.appendChild(this.toolbox_elem);
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
	display.zoom(display.zoom_level*Math.pow(2,(e.wheelDelta/(2*Math.abs(e.wheelDelta)))),p.x,p.y);
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
points=[];
x=[0,.5,1,1.5,2,2.5,3]
for(var n=0;n<x.length;n++) { points[n]={x:x[n],y:x[n]*x[n]}; }
