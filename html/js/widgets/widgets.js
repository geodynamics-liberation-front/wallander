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
EventBroadcaster.prototype.dispatchEvent = function(event_name,e)
{
    if(event_name in this.listeners)
    {   
        for( var n=0; n<this.listeners[event_name].length; n++)
        {
            this.listeners[event_name][n].apply(this,[e]);
        }
    }   
}

var regex={
	letters_numbers: '[a-zA-Z0-9\-]*',
	//letters_numbers: '[a-zA-Z0-9_]*',
	float: '[+-]?\\d+(?:\\.?\\d*)?(?:e[+-]?\\d+)?',
	hex: '[a-fA-F0-9]*' }

function event_xy(e,elem)
{
	var cr=elem.getBoundingClientRect()
	return {
		x: e.clientX-cr.left,
		y: e.clientY-cr.top
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
