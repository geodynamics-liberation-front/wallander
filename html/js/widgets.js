function ColormapSelector(input)
{
	var self=this

	this.input=input
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

	jsonCall(config['frame_prefix']+'/_colormaps',function(cm) { self.populate(cm); })
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
	console.log(this)
	this.input.value=colormap
	this.selected_colormap.src=config['frame_prefix']+'_colorbar/'+colormap+'.png'
	this.close()
}

ColormapSelector.prototype.populate = function(colormaps)
{
	console.log('populate')
	console.log(this)
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
}

ColormapSelector.prototype.colormap_selector = function(c,f)
{
	var self=this
	return  function() { self.select(c); }
}
