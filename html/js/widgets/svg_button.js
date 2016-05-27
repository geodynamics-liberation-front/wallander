function SVGToggleButton(o,initialValue)
{
	EventBroadcaster.call(this)
	var self=this
	this._value=initialValue
	this._svg=null
	this.o=o
	if( (this.svg=o.getSVGDocument())==null )
	{
		o.addEventListener('load',function (e) 
		{ 
			self.svg=e.target.getSVGDocument()
		})
	}
}
SVGToggleButton.prototype = new EventBroadcaster

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
				this.dispatchEvent('change',e)
            }   
        }   
    })

