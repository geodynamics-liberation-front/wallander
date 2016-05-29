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

EventBroadcaster.prototype.removeListener = function(type,listener)
{
	var ndx=this.listeners[type].indexOf(listener)
	if( ndx>-1 )
	{
		this.listeners[type].splice(ndx,1)
	}
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

function WaitFor(objects,events,callback,args)
{
	this.response_count=0
	this.callback=callback
	this.args=args
	this.objs=objects	
	for( var i=0; i<this.objs.length; i++ )
	{
		createListener(this.objs[i],events[i])
	}
}

WaitFor.prototype.createListener = function(o,e)
{
	var self=this
	var listener={type:e}
	listener.f=function() { self.ready(o,listener) }
	o.addEventListener(e,listener.f) 
}

WaitFor.prototype.ready = function(o,listener)
{
	this.response_count++
	console.log('loaded ['+this.response_count+'/'+this.objs.length+'] :'+o)
	o.removeListener(listener.type,listener.f)
	if(this.response_count==this.objs.length)
	{
		this.callback(this,this.args)
	}
}

function OnLoadGroup(objects,callback,args)
{
	this.response_count=0
	this.callback=callback
	this.args=args
	this.objs=objects	
}

OnLoadGroup.prototype.load = function() 
{
	var self=this
	for( var i=0; i<this.objs.length; i++ )
	{
		var o=this.objs[i]
		this.createListener(o,load')	
		o.load()
	}
}

OnLoadGroup.prototype.createListener = function(o,e)
{
	var self=this
	var listener={type:e}
	listener.f=function() { self.loaded(o,listener) }
	o.addEventListener(e,listener.f) 
}

OnLoadGroup.prototype.loaded = function(o.listener)
{
	this.response_count++
	console.log('loaded ['+this.response_count+'/'+this.objs.length+'] :'+o)
	o.removeListener(listener.type,listener.f)
	if(this.response_count==this.objs.length)
	{
		this.callback(this,this.args)
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
