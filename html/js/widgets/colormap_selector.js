var default_colormap_loader

function DefaultColormapLoader(url)
{
	EventBroadcaster.call(this)
	this.url=url
	this.colormaps
}
DefaultColormapLoader.prototype=Object.create(EventBroadcaster.prototype)

DefaultColormapLoader.prototype.load = function()
{
	var self=this
	jsonCall(this.url,function(cm) { self.colormaps=cm; self.broadcastEvent('load',{target:self});})
}

function ColormapSelector(input,url)
{
	EventBroadcaster.call(this)
	var self=this
	this.colormaps=[]

	this.input=input
	this._value=input.value
	this.input.style.display='None'
	this.input.addEventListener('change',function(e) { self.value=e.target.value; })
	this.height=95
	this.selector=document.createElement('div')
	this.selector.className='colormap_selector'
	this.selector.style.display='inline-block'
	this.selector.style.verticalAlign='top'
	input.parentNode.replaceChild(this.selector,input)
	this.selector.appendChild(input)

	var span=document.createElement('span')
	span.className='colormap_swatch'
	this.selector.appendChild(span)

	this.selected_colormap=document.createElement('img')
	span.appendChild(this.selected_colormap)
	span.addEventListener('click',function() { self.toggle(); } )

	this.dropdown=document.createElement('div')
	this.dropdown.className='colormap_dropdown'
	this.dropdown.style.maxHeight='0px'
	this.selector.appendChild(this.dropdown)
	if(url) 
	{
		this.colormap_url=url
		this.refresh()
	}
	else
	{
		this.colormap_url=default_colormap_loader.url
		this.populate(default_colormap_loader.colormaps.slice())
	}
}
ColormapSelector.prototype = new EventBroadcaster

Object.defineProperty(ColormapSelector.prototype,'value',
    {enumerable: true,
     get: function() { return this._value;},
     set: function(value)
        {   
            if( value!=this._value )
            {   
                if( this.colormaps.indexOf(value)==-1 ) throw new Error ('"'+value+'" is not a valid colormap')
				var e={target:this,old_value:this._value,value:value}
                this._value=value
				this.selected_colormap.src=config['frame_prefix']+'_colorbar/'+this._value+'.png'
				this.selected_colormap.title=this._value
                if( this.input.value!=this._value ) this.input.value=this._value
				this.dispatchEvent('change',e)
            }   
        }   
    })

ColormapSelector.prototype.load = 
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

ColormapSelector.prototype.contains = function(colormap)
{
	return colormap in this.colormaps
}

ColormapSelector.prototype.select = function(colormap)
{
	this.value=colormap
	this.close()
}

ColormapSelector.prototype.populate = function(colormaps)
{
	// Remove the existing options
	this.colormaps=colormaps
	while( this.input.children.length>0 ) { this.input.removeChild(this.input.children[0]) }
	for( var i=0; i<colormaps.length; i++ )
	{
		var span=document.createElement('span')
		span.className='colormap_option'
		var img=document.createElement('img')
		img.src=config['frame_prefix']+'_colorbar/'+colormaps[i]+'.png'
		img.alt=colormaps[i]
		img.title=colormaps[i]
		span.appendChild(img)
		span.addEventListener('click',this.colormap_selector(colormaps[i]))
		this.dropdown.appendChild(span)
		var o=document.createElement('option')
		o.innerHTML=colormaps[i]
		this.input.appendChild(o)
	}
	this.selected_colormap.src=config['frame_prefix']+'_colorbar/'+this._value+'.png'
	this.selected_colormap.title=this._value
	this.dispatchEvent('load',{target:this})
}

ColormapSelector.prototype.colormap_selector = function(c,f)
{
	var self=this
	return  function() { self.select(c); }
}
