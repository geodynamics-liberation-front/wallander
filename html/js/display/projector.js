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

	this.movie=new Movie()
	movie.projector=this
	var self=this;
	movie.addEventListener('load',function(e) { self.loaded(e); });
	movie.addEventListener('stop',function(e) { self.stopped(e); });
	this.display.addDepiction( movie );
	movie.show();
	this.loop=false;
	this.fps=10;
	this.frameTime=0
	this.direction=1;
	this.playing=false;


	// Setup the controls
	this.controls=document.createElement("div");
	add_class(this.controls,"glf_projector_controls");
	display.controls.appendChild(this.controls);
	// And the buttons
	this.btn_begining=new_button(function(e){self.begining();},"begining",this.controls);
	this.btn_rr=new_button(function(e){self.rewind();},"rr",this.controls);
	this.btn_pause=new_button(function(e){self.pause();},"pause",this.controls);
	this.btn_pause.style.display='none';
	this.btn_play=new_button(function(e){self.play();},"play",this.controls);
	this.btn_ff=new_button(function(e){self.fastforward();},"ff",this.controls);
	this.btn_end=new_button(function(e){self.end();},"end",this.controls);
}

Projector.prototype.pause = function()
{
	this.playing=false;
	this.btn_play.style.display='';
	this.btn_pause.style.display='none';
	remove_class(this.controls,"glf_playing")
	this.frameTime=-1
}

Projector.prototype.play = function()
{
	this.playing=true;
	this.btn_play.style.display='none';
	this.btn_pause.style.display='';
	add_class(this.controls,"glf_playing")
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
	this.display.status_mgr.set_status('frame',frame)
}

Projector.prototype.next = function()
{
	this.movie.next(this.direction);
	frame=this.movie.frame
	if( this.playing && this.frameTime>0 ) 
	{
		this.actualFPS=Math.round(1000/(performance.now()-this.frameTime));
		this.display.status_mgr.set_status('fps',this.actualFPS+'/'+this.fps)
	}
	else
	{
		this.display.status_mgr.set_status('fps','-/'+this.fps)
	}
	this.frameTime=performance.now();

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
	time_status=sprintf(fmt+' <span class="label">%s</span>',t,unit)
	this.display.status_mgr.set_status('time',time_status)
	this.display.status_mgr.set_status('frame',frame)
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


