/*
 * projector.js
 */

function new_button(onclick,name,controls)
{
	var btn=new Image();
	btn.src=get_img_url(name+".svg");
	btn.addEventListener('click',onclick);
	controls.appendChild(btn)
	return btn;
}

function Projector(display)
{
	this.display=display;
	// some listeners

	var self=this;
	this.movie=new Movie()
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
	this.playing=false;
	this.player_controls=display.player_controls

	// Setup the controls
	this.player_controls.addEventListener('play',function(e) { self.play() })
	this.player_controls.addEventListener('pause',function(e) { self.pause() })
	this.player_controls.addEventListener('change',function(e) { self.goto(e.target.frame) })
	this.player_controls.addEventListener('input',function(e) { self.updateStatus(e.target.frame) })
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

Projector.prototype.next = function()
{
	this.movie.next(this.direction);
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
	//this.updateXY();
}

Projector.prototype.stopped = function(e)
{
	this.pause();
	this.direction=1;
	this.display.status_mgr.set_status('fps','-/'+this.fps)
}


