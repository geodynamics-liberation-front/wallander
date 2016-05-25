"use strict";

var COS30=Math.cos(30*Math.PI/180)
var SIN30=Math.sin(30*Math.PI/180)

var nocolor_image="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUAAAAFCAYAAACNbyblAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAGXwAABl8BTcOklQAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAAA8SURBVAiZdcxBCUBRCEVB+5jMDLeqILgXbXBegf/3w5gkdheA3UUSdndEBFVFRDAzGEB34+5kJsCP/Dofjy1Q43U+MF0AAAAASUVORK5CYII="
var background_image="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAN1wAADdcBQiibeAAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAAAoSURBVBiVY/z//z8DOtiyZQuGIBOGKhxgABWyYHO4j48PI+2tpr5CAKIuCi6gLUyOAAAAAElFTkSuQmCC"

function is_in(e,elem)
{
	var cr=elem.getBoundingClientRect()
	return e.clientY<cr.bottom && e.clientY>cr.top && e.clientX>cr.left && e.clientX<cr.right
}

function hex2hsv(hex)
{
	return rgb2hsv.apply(rgb2hsv,hex2rgb(hex)) 
}

function hex2rgb(hex)
{
	var s=hex[0]=='#'?1:0
	return [parseInt(hex.slice(s,s+2),16)/255, parseInt(hex.slice(s+2,s+4),16)/255, parseInt(hex.slice(s+4,s+6),16)/255, 
		hex.length-s>6?parseInt(hex.slice(s+6,s+8),16)/255:1.0 ]
}

function rgb2hex(r,g,b,alpha,nohash)
{
	r=Math.round(r*255),g=Math.round(g*255),b=Math.round(b*255)
	if( alpha!=undefined ) alpha=Math.round(alpha*255)
	return ((nohash?'':'#') + 
            (r<16 ? '0':'')+r.toString(16) + 
            (g<16 ? '0':'')+g.toString(16) + 
            (b<16 ? '0':'')+b.toString(16) + 
            (alpha==undefined?'':((alpha<16 ? '0':'')+alpha.toString(16)))
           ).toUpperCase()
}

function hsv2rgb(H,S,V,alpha) 
{
	H=H%360
	if(H<0) H=H+360
	var C=V*S
	var Hp=H/60
	var X=C*(1-Math.abs(Hp%2-1))
	var rgb=[]
	if(Hp<1)       rgb=[C,X,0]
	else if(Hp<2)  rgb=[X,C,0]
	else if(Hp<3)  rgb=[0,C,X]
	else if(Hp<4)  rgb=[0,X,C]
	else if(Hp<5)  rgb=[X,0,C]
	else if(Hp<6)  rgb=[C,0,X]
	var m=V-C
	return alpha==undefined?[rgb[0]+m,rgb[1]+m,rgb[2]+m]:[rgb[0]+m,rgb[1]+m,rgb[2]+m,alpha]
}

function rgb2hsv(r,g,b,alpha) 
{
	var computedH = 0;
	var computedS = 0;
	var computedV = 0;

	var minRGB = Math.min(r,Math.min(g,b));
	var maxRGB = Math.max(r,Math.max(g,b));

	// Black-gray-white
	if (minRGB==maxRGB) 
	{
		computedV = minRGB;
		return [0,0,computedV,alpha];
	}

	 // Colors other than black-gray-white:
	 var d = (r==minRGB) ? g-b : ((b==minRGB) ? r-g : b-r);
	 var h = (r==minRGB) ? 3 : ((b==minRGB) ? 1 : 5);
	 computedH = 60*(h - d/(maxRGB - minRGB));
	 computedS = (maxRGB - minRGB)/maxRGB;
	 computedV = maxRGB;
	 return [computedH,computedS,computedV,alpha];
}

function line_function(x1,y1,x2,y2)
{
	var m=(y1-y2)/(x1-x2)
	var b=y1-x1*m
	return function(x) { return m*x+b; }
}

function addCanvas(w,h,elem,events)
{
	var o=new Object()
	o.canvas=document.createElement('canvas')
	o.canvas.style.position="absolute"
	o.canvas.style.padding="0"
	o.canvas.style.margin="0"
	o.canvas.width=w
	o.canvas.height=h
	o.ctx=o.canvas.getContext('2d')
	o.imgdata=o.ctx.createImageData(w,h)
	o.data=o.imgdata.data

	if(events)
	{
		for( var e in events )
		{
			//document.addEventListener(e,events[e],true)
			document.addEventListener(e,events[e])
		}
	}
	if(elem)
	{
		elem.appendChild(o.canvas)
	}
	return o
}

function ColorPicker(input,w,h)
{
	EventBroadcaster.call(this)

	var color=input.value || "#ffffff"
	var hsv=hex2hsv(color)

	this._H0=hsv[0]
	this._S0=hsv[1]
	this._V0=hsv[2]
	this._alpha0=hsv[3]
	this._H=hsv[0]
	this._S=hsv[1]
	this._V=hsv[2]
	this._alpha=hsv[3]
	this._listeners=new Object()
	this._nocolor=!input.value
	this._nocolor0=this._nocolor
	this._nocolor_image=new Image()
	this._nocolor_image.src=nocolor_image
	this.hash=true
	this.closed=true

	var color_picker=this

	this.input=input
	this._backgroundColor=window.getComputedStyle(input)['background-color']
	var input_box=input.getBoundingClientRect()
	input.addEventListener('change',function(e) {color_picker.value=input.value})
	input.style.display="none"
	this.width=w||input_box.width

	this.elem=document.createElement('div')
	this.elem.className="color_picker"
	this.elem.style.display="inline-block"
	this.input.parentNode.insertBefore(this.elem,input)

	this.swatch=new Object()
	this.swatch.canvas=document.createElement('canvas')
	this.swatch.canvas.addEventListener('click',function(e) {color_picker.swatch_click(e)},true)
	this.swatch.canvas.style.verticalAlign="middle"
	this.swatch.canvas.className='swatch'
	this.swatch.canvas.width=w||input_box.width
	this.swatch.canvas.height=h||input_box.height
	this.swatch.ctx=this.swatch.canvas.getContext('2d')
	this.swatch.canvas.style.backgroundColor=this._backgroundColor
	this.swatch.canvas.style.backgroundImage='url('+background_image+')'
	this.elem.appendChild(this.swatch.canvas)

	this.selector_elem=document.createElement('div')
	//this.selector_elem.style.position="absolute"
	this.selector_elem.style.position="relative"
	this.selector_elem.style.overflow="hidden"
	
	this.elem.appendChild(this.selector_elem)

	var width=w||input_box.width
	this.outer_radius=Math.round(0.5*width)
	this.inner_radius=0.8*this.outer_radius
	this.delta_radius=this.outer_radius-this.inner_radius
	this.triangle_height=this.inner_radius*(1+SIN30)
	this.triangle_base=2*this.inner_radius*COS30

	this.selecting_hue=false;
	this.selecting_saturation_value=false;
	this.selecting_alpha=false;

	this.svCanvas=addCanvas(2*this.outer_radius,2*this.outer_radius,this.selector_elem)
	this.svCanvas.canvas.style.backgroundColor=this._backgroundColor
	this.svBuffer=addCanvas(2*this.outer_radius,2*this.outer_radius)
	this.hCanvas=addCanvas(2*this.outer_radius,2*this.outer_radius,this.selector_elem)
	this.canvas=addCanvas(2*this.outer_radius,2*this.outer_radius,this.selector_elem,
	{
		mousedown: function(e) {color_picker.mousedown(e); return false},
		mouseup:   function(e) {color_picker.mouseup(e); return false},
		mousemove: function(e) {color_picker.mousemove(e); return false},
		click: function(e) {color_picker.mousemove(e); return false}
	})
	this.alphaCanvas=document.createElement('canvas')
	this.alphaCanvas.style.backgroundColor=this._backgroundColor
	this.alphaCanvas.style.backgroundImage='url('+background_image+')'
	this.alphaCanvas.style.position='relative'
	this.alphaCanvas.style.top=(2*this.outer_radius)+'px'
	this.alphaCanvas.width=2*this.outer_radius
	this.alphaCanvas.height=h||input_box.height
	this.alphaCanvas.ctx=this.alphaCanvas.getContext('2d')
	this.selector_elem.appendChild(this.alphaCanvas)

	this.ncd=document.createElement('div')
	this.ncd.style.position='relative'
	this.ncd.style.top=(2*this.outer_radius)+'px'
	this.selector_elem.appendChild(this.ncd)
	var label=document.createElement('label')
	this.ncd.appendChild(label)
	this.nc_cb=document.createElement('input')
	this.nc_cb.type='checkbox'
	this.nc_cb.addEventListener('change',function(e) { color_picker.nocolor=e.target.checked; })
	label.appendChild(this.nc_cb)
	label.appendChild(document.createTextNode('no color'))

	var rect=this.selector_elem.getBoundingClientRect()
	this.height=this.width+rect.height
	this.selector_elem.style.height="0px"
	this.selector_elem.style.transitionProperty="height"
	this.selector_elem.style.transitionDuration="0.3s"
	this.selector_showing=false

	document.addEventListener('keyup',function(e) {color_picker.keyup(e)})

	this.line_a=line_function(this.outer_radius,this.outer_radius-this.inner_radius,this.outer_radius-this.inner_radius*COS30,this.outer_radius+this.inner_radius*SIN30)
	this.line_b=line_function(this.outer_radius,this.outer_radius-this.inner_radius,this.outer_radius+this.inner_radius*COS30,this.outer_radius+this.inner_radius*SIN30)
	this.draw_hue()
	this.draw_saturation_value()
	this.draw_selectors()
	this.draw_alpha()
	this.draw_swatch()
}
ColorPicker.prototype = new EventBroadcaster

Object.defineProperty(ColorPicker.prototype,'h',
	{enumerable: true, 
     get: function() { return this._H;}, 
     set: function(H) { H=H%360; if(H<0) H=H+360; this._H=H; this.draw_saturation_value();this.draw_selectors();this.draw_alpha();this.draw_swatch();} 
	})
Object.defineProperty(ColorPicker.prototype,'s',
	{enumerable: true, 
     get: function() { return this._S;}, 
     set: function(S) { this._S=S; this.draw_selectors();this.draw_alpha();this.draw_swatch()} 
	})
Object.defineProperty(ColorPicker.prototype,'v',
	{enumerable: true, 
     get: function() { return this._V;}, 
     set: function(V) { this._V=V; this.draw_selectors();this.draw_alpha();this.draw_swatch()} 
	})
Object.defineProperty(ColorPicker.prototype,'alpha',
	{enumerable: true, 
     get: function() { return this._alpha;}, 
     set: function(alpha) { alpha=Math.max(0,Math.min(1,alpha)); this._alpha=alpha; this.draw_alpha(); this.draw_swatch();} 
	})
Object.defineProperty(ColorPicker.prototype,'nocolor',
	{enumerable: true, 
     get: function() { return this._nocolor;}, 
     set: function(nocolor) 
		{ 
			if( this.nc_cb.checked!=nocolor ) this.nc_cb.checked=nocolor
			this._nocolor=nocolor; 
			this.alphaCanvas.style.opacity=nocolor?'0.3':'1.0'
			this.svCanvas.canvas.style.opacity=nocolor?'0.3':'1.0'
			this.hCanvas.canvas.style.opacity=nocolor?'0.3':'1.0'
			this.draw_selectors();
			this.draw_swatch();
		} 
	})
Object.defineProperty(ColorPicker.prototype,'value',
	{enumerable: true, 
     get: function() { 
		if( this._nocolor ) return null;

		var args=hsv2rgb(this._H,this._S,this._V,this._alpha)
		args.push(!this.hash)
		return rgb2hex.apply(rgb2hex,args)
		}, 
     set: function(rgb) {
		if( rgb )
		{
			var hsv=hex2hsv(rgb);
			this._H0=hsv[0];
			this._S0=hsv[1];
			this._V0=hsv[2]; 
			this._alpha0=hsv[3]
			this._H=hsv[0];
			this._S=hsv[1];
			this._V=hsv[2]; 
			this._alpha=hsv[3]
			this.nocolor=this._nocolor0=false
			this.input.value=rgb2hex(hsv2rgb(this._H,this._S,this._V,this._alpha,!this.hash))
		} 
		else
		{
			this.nocolor=this._nocolor0=true
			this.input.value=''
		}	
		}
	})


ColorPicker.prototype.swatch_click = function(e)
{
	if( parseInt(this.selector_elem.style.height)==0 )
	{
		this.show_selector()
	}
	else
	{
// TODO : check the Y
		var xy=event_xy(e,this.swatch.canvas)
		if(xy.x>this.swatch.canvas.width/2)
		{
			this.set_color()
		}
		else
		{
			this.revert_color()
		}
	}
	e.preventDefault()
}

ColorPicker.prototype.mouseup = function(e)
{
	if(this.selecting_hue)
	{
		this.selecting_hue=false
	}
	else if(this.selecting_saturation_value)
	{
		this.selecting_saturation_value=false
	}
	else if(this.selecting_alpha)
	{
		this.selecting_alpha=false
	}
}

ColorPicker.prototype.mousedown = function(e)
{
	if( this.selector_showing && !this._nocolor)
	{
		var xy=event_xy(e,this.canvas.canvas)
		var rtheta=this.xy2rtheta(xy.x,xy.y)
		if(this.selecting_hue=(rtheta.r<this.outer_radius && rtheta.r>this.inner_radius))
		{
			this.h=rtheta.theta
			e.preventDefault()
		}
		else if(this.selecting_saturation_value=(xy.y<this.outer_radius+this.inner_radius*SIN30 && xy.y>this.line_a(xy.x) && xy.y>this.line_b(xy.x)) )
		{
			this.select_saturation_value(xy)
			e.preventDefault()
		}
		else if(this.selecting_alpha=(xy.x>=0 && xy.x<=2*this.outer_radius && xy.y>=2*this.outer_radius && xy.y<=2*this.outer_radius+this.alphaCanvas.height))
		{
			this.alpha=xy.x/(2*this.outer_radius)
			e.preventDefault()
		}
		else if( !(is_in(e,this.swatch.canvas) || is_in(e,this.ncd))  )
		{
			this.revert_color()
		}
	}
}

ColorPicker.prototype.mousemove = function(e)
{
	if( this.selecting_hue)
	{
		var xy=event_xy(e,this.canvas.canvas)
		this.h=this.xy2rtheta(xy.x,xy.y).theta
		e.preventDefault()
	}
	if( this.selecting_alpha)
	{
		var xy=event_xy(e,this.canvas.canvas)
		this.alpha=xy.x/(2*this.outer_radius)
		e.preventDefault()
	}
	else if( this.selecting_saturation_value)
	{
		var xy=event_xy(e,this.canvas.canvas)
		this.select_saturation_value(xy)
		e.preventDefault()
	}
}

ColorPicker.prototype.keyup = function(e)
{
	//if( this.selector_elem.style.display=="block" )
	if( this.selector_showing )
	{
		if(e.keyCode==27)
		{
			this.revert_color()
		}
		else if(e.keyCode==13)
		{
			this.set_color()
		}
	}
}

ColorPicker.prototype.show_selector = function()
{
	//this.selector_elem.style.display="block"
	this.selector_showing=true
	this.selector_elem.style.height=Math.ceil(this.height)+"px"
	this.draw_saturation_value()
	this.draw_alpha()
	this.draw_selectors()
}

ColorPicker.prototype.hide_selector = function()
{
	//this.selector_elem.style.display="none"
	this.selector_showing=false
	this.selector_elem.style.height="0"
}

ColorPicker.prototype.select_saturation_value = function(xy)
{
	xy=this.rotate(xy,-(this._H+30)*Math.PI/180)
	if(xy.y>this.delta_radius+this.triangle_height) { xy.y=this.delta_radius+this.triangle_height }

	xy=this.rotate(xy,120*Math.PI/180)
	if(xy.y>this.delta_radius+this.triangle_height) { xy.y=this.delta_radius+this.triangle_height }

	xy=this.rotate(xy,120*Math.PI/180)
	if(xy.y>this.delta_radius+this.triangle_height) { xy.y=this.delta_radius+this.triangle_height }
	if(xy.y<this.delta_radius) { xy.y=this.delta_radius; xy.x=this.outer_radius}
	if(xy.x>this.outer_radius+this.inner_radius*COS30) { xy.y=this.outer_radius+this.inner_radius*SIN30; xy.x=this.outer_radius+this.inner_radius*COS30 }
	if(xy.x<this.outer_radius-this.inner_radius*COS30) { xy.y=this.outer_radius+this.inner_radius*SIN30; xy.x=this.outer_radius-this.inner_radius*COS30 }

	xy=this.rotate(xy,120*Math.PI/180)

	this._V=(xy.y-this.delta_radius)/this.triangle_height
	this._S=(xy.x-this.outer_radius+this.inner_radius*COS30)/this.triangle_base

	this.draw_selectors()
	this.draw_alpha()
	this.draw_swatch()
}

ColorPicker.prototype.rotate = function(p,theta)
{
		// rotate anti-clockwise 
	p={x:p.x-this.outer_radius,y:this.outer_radius-p.y}
	p={x: p.x*Math.cos(theta)-p.y*Math.sin(theta), y: p.x*Math.sin(theta)+p.y*Math.cos(theta)}
	return {x:p.x+this.outer_radius,y:this.outer_radius-p.y}
}

ColorPicker.prototype.draw_swatch = function()
{
	var w=this.swatch.canvas.width
	var h=this.swatch.canvas.height
	var c=this.swatch.ctx
	c.clearRect(0,0,w,h)

	if( this._nocolor0 )
	{
		var pattern = display.paper.createPattern(this._nocolor_image,"repeat");
		c.fillStyle=pattern
	}
	else
	{
		var rgb=hsv2rgb(this._H0,this._S0,this._V0)
		c.fillStyle="rgba("+Math.round(255*rgb[0])+','+Math.round(255*rgb[1])+','+Math.round(255*rgb[2])+','+this._alpha0.toFixed(3)+')'
	}
	c.fillRect(0,0,w/2,h)

	if( this._nocolor )
	{
		var pattern = display.paper.createPattern(this._nocolor_image,"repeat");
		c.fillStyle=pattern
	}
	else
	{
		var rgb=hsv2rgb(this._H,this._S,this._V)
		c.fillStyle="rgba("+Math.round(255*rgb[0])+','+Math.round(255*rgb[1])+','+Math.round(255*rgb[2])+','+this._alpha.toFixed(3)+')'
	}
	c.fillRect(w/2,0,w/2,h)
}

ColorPicker.prototype.draw_alpha = function()
{
	var w=this.alphaCanvas.width
	var h=this.alphaCanvas.height
	var c=this.alphaCanvas.ctx
	var grd=c.createLinearGradient(0,0,w,0);
	var rgb=hsv2rgb(this._H,this._S,this._V)
	c.clearRect(0,0,w,h)
	grd.addColorStop(0,"rgba("+Math.round(255*rgb[0])+','+Math.round(255*rgb[1])+','+Math.round(255*rgb[2])+',0.0)')
	grd.addColorStop(1,"rgba("+Math.round(255*rgb[0])+','+Math.round(255*rgb[1])+','+Math.round(255*rgb[2])+',1.0)')
	c.fillStyle=grd
	c.fillRect(0,0,w,h)
	c.strokeStyle='rgb(255,255,255)'
	c.lineWidth=2
	c.fillStyle='rgb(0,0,0)'
	c.beginPath()
	var x=this.alpha*w
	var y=h*0.3
	c.moveTo(x,y)
	c.lineTo(x+y/2,0)
	c.lineTo(x-y/2,0)
	c.closePath()
	c.fill()
	c.stroke()
	c.moveTo(x,h-y)
	c.lineTo(x+y/2,h)
	c.lineTo(x-y/2,h)
	c.closePath()
	c.fill()
	c.stroke()
}

ColorPicker.prototype.revert_color = function()
{
	this._H=this._H0
	this._S=this._S0
	this._V=this._V0
	this._alpha=this._alpha0
	this.nocolor=this._nocolor0
	this.input.value=this._ncolor?'':rgb2hex(hsv2rgb(this._H0,this._S0,this._V0))
	this.draw_swatch()
	this.hide_selector()
}

ColorPicker.prototype.set_color = function()
{

	if( this._H0!=this._H || this._S0!=this._S || this._V0!=this._V || this._alpha0!=this._alpha || this._nocolor0!=this._nocolor)
	{
		var e={name:'change',target: this}
		e.old_value=this._nocolor0?null:rgb2hex.apply(rgb2hex,hsv2rgb(this._H0,this._S0,this._V0,this._alpha0))
		e.value=this._nocolor?null:rgb2hex.apply(rgb2hex,hsv2rgb(this._H,this._S,this._V,this._alpha))
		this._H0=this._H
		this._S0=this._S
		this._V0=this._V
		this._alpha0=this._alpha
		this._nocolor0=this._nocolor
		this.broadcastEvent('change',e)
	}
	this.draw_swatch()
	this.hide_selector()
}

ColorPicker.prototype.draw_hue = function()
{
	this.hCanvas.ctx.clearRect(0,0,2*this.outer_radius,2*this.outer_radius)
	for(var y=0; y<2*this.outer_radius; y++)
	{
		for(var x=0; x<2*this.outer_radius; x++)
		{
			var rtheta=this.xy2rtheta(x,y)
			if(rtheta.r<this.outer_radius && rtheta.r>this.inner_radius)
			{
				var rgb=hsv2rgb(rtheta.theta,1,1)
				var offset=(y*2*this.outer_radius+x)*4
				this.hCanvas.data[offset  ]=rgb[0]*255
				this.hCanvas.data[offset+1]=rgb[1]*255
				this.hCanvas.data[offset+2]=rgb[2]*255
				this.hCanvas.data[offset+3]=255
			}
		}
	}
	this.hCanvas.ctx.putImageData(this.hCanvas.imgdata,0,0)
}


ColorPicker.prototype.draw_saturation_value = function()
{
	this.svBuffer.ctx.clearRect(0,0,2*this.outer_radius,2*this.outer_radius)
	for(var y=0; y<2*this.outer_radius; y++)
	{
		for(var x=0; x<2*this.outer_radius; x++)
		{
			if( y<this.outer_radius+this.inner_radius*SIN30 && y>this.line_a(x) && y>this.line_b(x) )
			{
				var V=y/(this.outer_radius*(1+SIN30))
				var S=(x-this.outer_radius*(1-COS30))/(2*this.outer_radius*COS30)
				var rgb=hsv2rgb(this._H,S,V)
				var offset=(y*2*this.outer_radius+x)*4
				this.svBuffer.data[offset  ]=rgb[0]*255
				this.svBuffer.data[offset+1]=rgb[1]*255
				this.svBuffer.data[offset+2]=rgb[2]*255
				this.svBuffer.data[offset+3]=255
			}
		}
	}
	this.svBuffer.ctx.putImageData(this.svBuffer.imgdata,0,0)
	this.svCanvas.ctx.clearRect(0,0,2*this.outer_radius,2*this.outer_radius)
	this.svCanvas.ctx.save()
	this.svCanvas.ctx.translate(this.outer_radius,this.outer_radius)
	this.svCanvas.ctx.rotate((330-this._H)*Math.PI/180)
	this.svCanvas.ctx.translate(-this.outer_radius,-this.outer_radius)
	this.svCanvas.ctx.drawImage(this.svBuffer.canvas,0,0)
	this.svCanvas.ctx.restore()
}

ColorPicker.prototype.draw_selectors = function()
{
	// Draw the hue
	this.canvas.ctx.clearRect(0,0,2*this.outer_radius,2*this.outer_radius)
	if( !this._nocolor )
	{
		var xp=this.outer_radius+Math.cos(this._H*Math.PI/180)*(this.inner_radius+this.outer_radius)/2
		var yp=(this.outer_radius-Math.sin(this._H*Math.PI/180)*(this.inner_radius+this.outer_radius)/2)
		var c=this.canvas.ctx
		c.beginPath()
		c.arc(xp,yp,6,0,2*Math.PI)
		c.lineWidth=2
		c.strokeStyle="#000000"
		c.stroke()
		c.beginPath()
		c.arc(xp,yp,7,0,2*Math.PI)
		c.lineWidth=2
		c.strokeStyle="#ffffff"
		c.stroke()

		var p={x:this._S*this.triangle_base+this.outer_radius-this.inner_radius*COS30,y:this._V*this.triangle_height+this.delta_radius}
		p=this.rotate(p,(this._H+30)*Math.PI/180)
		c.save()
		c.beginPath()
		c.arc(p.x,p.y,6,0,2*Math.PI)
		c.lineWidth=2
		c.strokeStyle="#000000"
		c.stroke()
		c.beginPath()
		c.arc(p.x,p.y,7,0,2*Math.PI)
		c.lineWidth=2
		c.strokeStyle="#ffffff"
		c.stroke()
		c.restore()
	}
}

ColorPicker.prototype.xy2rtheta = function(x,y)
{
	x=x-this.outer_radius
	y=this.outer_radius-y
	return {
	theta: 180*Math.atan2(y,x)/Math.PI,
	r: Math.sqrt(x*x+y*y) }
}
