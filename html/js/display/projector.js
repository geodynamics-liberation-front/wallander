/*
 * projector.js
 */

sec_in_ma=1e6*365.25*24*3600
function new_button(onclick,name,controls)
{
	var btn=new Image();
	btn.src=get_img_url(name+".svg");
	btn.addEventListener('click',onclick);
	controls.appendChild(btn)
	return btn;
}

function Projector(display,movie)
{
	this.display=display;
	display.projector=this;
	// some listeners

	this.movie=movie
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

Projector.prototype.updateStatus = function(name,value)
{
	this.display.setStatus(name,'<span class="label">'+name+':</span>'+value);
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
	this.display.setStatus('frame','<span class="label">frame:</span>'+frame)
}

Projector.prototype.next = function()
{
	this.movie.next(this.direction);
	frame=this.movie.frame
	if( this.playing && this.frameTime>0 ) 
	{
			this.actualFPS=Math.round(1000/(performance.now()-this.frameTime));
			this.display.setStatus('fps','<span class="label">fps:</span>'+this.actualFPS+'/'+this.fps)
	}
	this.frameTime=performance.now();
	this.display.setStatus('frame','<span class="label">frame:</span>'+frame)
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
}


