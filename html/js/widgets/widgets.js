function EventBroadcaster()
{
    this.listeners={}
}

EventBroadcaster.prototype.addEventListener = function(type,listener)
{
    if( !(type in this.listeners))
    {   
        this.listeners[type]=[];
    }   
    this.listeners[type].push(listener);
}

EventBroadcaster.prototype.broadcastEvent = 
EventBroadcaster.prototype.dispatchEvent = function(event_type,e)
{
    if(event_type in this.listeners)
    {   
		e.type=event_type
        for( var n=0; n<this.listeners[event_type].length; n++)
        {
            this.listeners[event_type][n].apply(this,[e]);
        }
    }   
}

var regex={
	letters_numbers: '[a-zA-Z0-9\-]*',
	//letters_numbers: '[a-zA-Z0-9_]*',
	float: '[+-]?\\d+(?:\\.?\\d*)?(?:e[+-]?\\d+)?',
	hex: '[a-fA-F0-9]*' }

function event_xy(e,elem,relative_content)
{
	var cr=elem.getBoundingClientRect()
	if ( relative_content )
	{
		var s=getComputedStyle(elem)
		return {
			x: e.clientX-cr.left-(parseInt(s.borderLeft)+parseInt(s.paddingLeft)),
			y: e.clientY-cr.top -(parseInt(s.borderTop )-parseInt(s.paddingTop )),
			width: cr.width-(parseInt(s.borderLeft)+parseInt(s.borderRight)+parseInt(s.paddingLeft)+parseInt(s.paddingRight)),
			height: cr.height-(parseInt(s.borderTop)+parseInt(s.borderBottom)+parseInt(s.paddingLeft)+parseInt(s.paddingBottom)),
			client_rect: cr
		}
	}
	return {
		x: e.clientX-cr.left-(parseInt(s.borderLeft)+parseInt(s.paddingLeft)),
		y: e.clientY-cr.top -(parseInt(s.borderTop )-parseInt(s.paddingTop )),
		client_rect: cr
	}
}

function selectIndexOf(value)
{
	var valid=false
	var ndx=-1
	for( var i=0; !valid && i<this.options.length; i++ ) 
	{ 
		if( valid=(this.options[i].value==value)) 
		{
			ndx=i
			break 
		}
	}
	return ndx
}
