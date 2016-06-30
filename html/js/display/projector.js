/*
 * projector.js
 */
function Projector(display)
{
	EventBroadcaster.call(this)
	this.display=display;
	// some listeners

	var self=this;
	this.movie=new Movie()
	this.movie.data_field_mgr=display.data_field_mgr
	this.movie.projector=this
	this.movie.addEventListener('load',function(e) { self.loaded(e); });
	this.movie.addEventListener('stop',function(e) { self.stopped(e); });
	this.display.addDepiction( this.movie );
	this.movie.show();
	this.loop=false;
	this.fps=10;
	this.actualFPS='-'
	this.frameTime=0
	this.direction=1;
	this._playing=false;
	this.player_controls=display.player_controls;

	// Setup the controls
	this.player_controls.addEventListener('play',function(e) { self.play() })
	this.player_controls.addEventListener('pause',function(e) { self.pause() })
	this.player_controls.addEventListener('change',function(e) { self.goto(e.target.frame) })
	this.player_controls.addEventListener('input',function(e) { self.updateStatus(e.target.frame) })
	// Listen for button events
	window.addEventListener('keydown',function(e) { self.keydown(e) })
}
Projector.prototype = Object.create(EventBroadcaster.prototype)

Object.defineProperty(Projector.prototype,'playing', {
	get: function() { return this._playing },
	set: function(p) {
			if( p!=this._playing )
			{
				this._playing=p
				this.player_controls.playing = p
			}
		}
	})

Projector.prototype.toString = function()
{
	return "Projector"
}

Projector.prototype.keydown = function(e)
{
	// Make sure an input isn't selected
	elem=document.activeElement
	if( elem==null || (elem.tagName!='INPUT' && elem.tagName!='SELECT') )
	{
		switch(e.keyCode)
		{
			case 37: // left
				if( e.shiftKey )
				{
					this.begining()
				}
				else
				{
					this.next(-1)
				}
				e.preventDefault()
				break
			case 39: //right
				if( e.shiftKey )
				{
					this.end()
				}
				else
				{
					this.next(1)
				}
				e.preventDefault()
				break
			case 32: // spacebar
				this.playing=!this.playing
				if( this.playing )
				{
					this.next()
				}
				else
				{
					this.frameTime=-1
				}
				e.preventDefault()
				break
			default:
				console.log("keyCode: "+e.keyCode)
		}
	}
}

Projector.prototype.pause = function()
{
	this.playing=false;
	this.frameTime=-1
}

Projector.prototype.play = function()
{
	this.playing=true;
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
	this.updateStatus()
}

Projector.prototype.redraw = function()
{
	this.movie.show()
}

Projector.prototype.next = function(direction)
{
	this.movie.next(direction || this.direction);
	if( this.playing && this.frameTime>0 ) 
	{
		this.actualFPS=Math.round(1000/(performance.now()-this.frameTime));
	}
	else
	{
		this.actualFPS='-'
	}
	this.frameTime=performance.now();
	this.updateStatus()
}

Projector.prototype.updateStatus = function(f)
{
	var frame=(f==undefined)?this.movie.frame:f
	// update the time
	var fmt="%s"
	var t=0
	var unit=''	
	if( this.display.data_field_mgr.reference_data_field )
	{
		var df=this.display.data_field_mgr.reference_data_field
		t=df.time(frame)
		fmt=df.time_format
		unit=df.time_unit
	}
	var time_status=sprintf(fmt+' <span class="label">%s</span>',t,unit)
	this.display.status_mgr.set_status('time',time_status)

	// update the frames per second
	this.display.status_mgr.set_status('fps',this.actualFPS+'/'+this.fps)

	// Update the frame number
	this.display.status_mgr.set_status('frame',frame)
	if(f==undefined)
	{
		this.player_controls.frame=frame
	}
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
	this.broadcastEvent('load',{target:this})
}

Projector.prototype.stopped = function(e)
{
	this.pause();
	this.direction=1;
	this.display.status_mgr.set_status('fps','-/'+this.fps)
}


