"use strict";

function Dropdown(button_elem,display_elem)
{
	var self=this
	this.button=button_elem;
	add_class(this.button,'closed')
	add_class(this.button,'dropdown')
	this.display=display_elem
	this.display.style.height="0"
	this.display.style.overflow="hidden"
	this.display.style.transitionProperty="height"
	this.display.style.transitionDuration="0.3s"
	this.button.addEventListener('click',function() { self.click() } )
}

Dropdown.prototype.click = function ()
{
	if(has_class(this.button,'closed'))
	{
		this.display.style.height="inherit"
		remove_class(this.button,'closed')
		add_class(this.button,'open')
		
	}
	else
	{
		this.display.style.height="0"
		remove_class(this.button,'open')
		add_class(this.button,'closed')
	}
}

var regex={
	letters_numbers: '[a-zA-Z0-9_]*',
	float: '[+-]?\\d+\\.?\\d*e?-?\\d+',
	hex: '[a-fA-F0-9]*' }

var CM_RE=new RegExp('('+regex.letters_numbers+')-?('+regex.float+')?-?('+regex.float+')?-?('+regex.hex+')?-?('+regex.hex+')?-?('+regex.hex+')?')

function parse_renderer(renderer)
{
	var m=renderer.match(CM_RE)
	if( CM_RE )
	{
		var r={
			colormap: m[1],
			min: m[2],
			max: m[3],
			under_color: m[4],
			over_color:  m[5],
			bad_color:   m[6]}
		
		if( r.log=r.colormap.endsWith("_log") )
		{
			r.colormap=r.colormap.substr(0,r.colormap.length-4)
		}
		return r;
	}
}

function ColormapSelector(input,url)
{
	var self=this

	this.input=input
	this.value=input.value
	this.height=95
	this.input.style.display='None'
	this.selector=document.createElement('div')
	this.selector.className='colormap_selector'
	input.parentNode.replaceChild(this.selector,input)
	this.selector.appendChild(input)

	var span=document.createElement('span')
	span.className='colorbar_wrapper'
	this.selector.appendChild(span)

	this.selected_colormap=document.createElement('img')
	span.appendChild(this.selected_colormap)
	span.addEventListener('click',function() { self.toggle(); } )

	this.dropdown=document.createElement('div')
	this.dropdown.className='colormap_dropdown'
	this.dropdown.style.maxHeight='0px'
	this.selector.appendChild(this.dropdown)
	this.colormap_url=url
	this.refresh()
}

ColormapSelector.prototype.refresh = function()
{
	var self=this
	jsonCall(this.colormap_url,function(cm) { self.populate(cm); })
}

ColormapSelector.prototype.toggle = function()
{
	if( this.dropdown.style.maxHeight=='0px' )
	{
		this.dropdown.style.maxHeight=this.height+'px'
	}
	else
	{
		this.dropdown.style.maxHeight='0px'
	}
}

ColormapSelector.prototype.open = function()
{
	this.dropdown.style.maxHeight=this.height+'px'
}

ColormapSelector.prototype.close = function()
{
	this.dropdown.style.maxHeight='0px'
}

ColormapSelector.prototype.select = function(colormap)
{
	this.input.value=colormap
	this.value=colormap
	this.selected_colormap.src=config['frame_prefix']+'_colorbar/'+colormap+'.png'
	this.close()
}

ColormapSelector.prototype.populate = function(colormaps)
{
	while( this.input.children.length>0 ) { this.input.removeChild(this.input.children[0]) }
	for( var i=0; i<colormaps.length; i++ )
	{
		var span=document.createElement('span')
		span.className='colorbar_wrapper'
		var img=document.createElement('img')
		img.src=config['frame_prefix']+'_colorbar/'+colormaps[i]+'.png'
		img.alt=colormaps[i]
		span.appendChild(img)
		span.addEventListener('click',this.colormap_selector(colormaps[i]))
		this.dropdown.appendChild(span)
		var o=document.createElement('option')
		o.innerHTML=colormaps[i]
		this.input.appendChild(o)
	}
	if(this.value) { this.select(this.value); }
}

ColormapSelector.prototype.colormap_selector = function(c,f)
{
	var self=this
	return  function() { self.select(c); }
}
