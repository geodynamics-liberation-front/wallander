/*
The SVG document should expose a 'value' variable.  This code witll set value to true/false
*/
function SVGButton(o,enabled)
{
	EventBroadcaster.call(this)
	var self=this
	this._svg=null
	this._enabled=enabled
	if( (this.svg=o.getSVGDocument())==null )
	{
		o.addEventListener('load',function (e) { self.svg=e.target.getSVGDocument() })
	}
}
SVGButton.prototype = Object.create(EventBroadcaster.prototype)

Object.defineProperty(SVGButton.prototype,'svg',
    {enumerable: true,
     get: function() { return this._svg;},
     set: function(svg)
        {   
            if( svg!=this._svg )
            {   
				var self=this
				this._svg=svg
				this._svg.defaultView.value=this._enabled
				this._svg.addEventListener('click',function() { if( self.enabled  ) self.broadcastEvent('click',{target:self}) })   
        	}   
		}
    })

Object.defineProperty(SVGButton.prototype,'enabled',
    {enumerable: true,
     get: function() { return this._enabled;},
     set: function(value)
        {   
			this._enabled=value
            if( this._svg) this._svg.defaultView.value=this._enabled
        }   
    })

function SVGToggleButton(o,initialValue)
{
	EventBroadcaster.call(this)
	var self=this
	this._value=initialValue
	this._svg=null
	this.o=o
	if( (this.svg=o.getSVGDocument())==null )
	{
		o.addEventListener('load',function (e) { self.svg=e.target.getSVGDocument() })
	}
}
SVGToggleButton.prototype = Object.create(EventBroadcaster.prototype)

Object.defineProperty(SVGToggleButton.prototype,'svg',
    {enumerable: true,
     get: function() { return this._svg;},
     set: function(svg)
        {   
            if( svg!=this._svg )
            {   
				var self=this
				this._svg=svg
           		this._svg.defaultView.value=this._value
				this._svg.addEventListener('click',function() { self.value=!self.value })
            }   
        }   
    })

Object.defineProperty(SVGToggleButton.prototype,'value',
    {enumerable: true,
     get: function() { return this._svg.defaultView.value;},
     set: function(value)
        {   
            if( value!=this._value )
            {  
				this._value=value 
				var e={target:this,value:this._value}
				if( this._svg )
				{
                	this._svg.defaultView.value=this._value
				}
				this.broadcastEvent('change',e)
            }   
        }   
    })

/* A button that turns on with a click, but turns off only via the api */
function SVGOnButton(o,initialValue)
{
	SVGToggleButton.call(this,o,initialValue)	
}
SVGOnButton.prototype = Object.create(SVGToggleButton.prototype)

Object.defineProperty(SVGOnButton.prototype,'svg',
    {enumerable: true,
     get: function() { return this._svg;},
     set: function(svg)
        {   
            if( svg!=this._svg )
            {   
				var self=this
				this._svg=svg
           		this._svg.defaultView.value=this._value
				this._svg.addEventListener('click',function() { self.value=true })
            }   
        }   
    })

function SVGRadioButtons(objects,initialValue)
{
	EventBroadcaster.call(this)
	this._length=objects.length
	this._value=initialValue
	this._svg={}
	for( var i=0; i<objects.length; i++ )
	{
		this.setSVG(objects[i].dataset.value||i,objects[i])
	}
}
SVGRadioButtons.prototype = Object.create(EventBroadcaster.prototype)

Object.defineProperty(SVGRadioButtons.prototype,'value',
    {enumerable: true,
	 get: function() { return this._value },
     set: function(value) 
		{
			if( value!=this._value)
			{
				if( this._value ) this._svg[this._value].defaultView.value=false
				this._svg[value].defaultView.value=true
				this._value=value
				this.broadcastEvent('change',{target:this,value:value})
			}
		}	
	})

SVGRadioButtons.prototype.setSVG = function(value,o)
{
	var self=this
	var svg
	if( svg=o.getSVGDocument() )
	{
		this._svg[value]=svg
		svg.defaultView.value=(value==this._value)
		svg.addEventListener('click',function() { self.value=value })
		if( Object.keys(this._svg).length==this._length )
		{
			this.value=this._value
			this.broadcastEvent('load',{target:this})
		}
	}
	else
	{
		o.addEventListener('load',function (e) { self.setSVG(value,e.target) })
	}
}	

