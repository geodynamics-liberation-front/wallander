/*
 * Projector
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

function Projector(display)
{
	this.display=display;
	display.projector=this;
	this.loop=false;
	this.fps=10;
	this.frameTime=0
	this.direction=1;
	this.movies=[]
	this.playing=false;

	// some listeners
	var self=this;
	this.load_count=0;
	this.load_listener = function(e) { self.loaded(e); };
	this.stop_count=0;
	this.stop_listener = function(e) { self.stopped(e); };

	// Respond to mousemovements
	this.display.canvas.addEventListener('mousemove',function(e) {self.updateXY(e);});
	this.display.canvas.addEventListener('mouseout',function(e) {self.p=null;});
	this.p=null;

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

Projector.prototype.addMovie = function (movie)
{
	this.display.addDepiction( movie );
	this.movies.push(movie);
	movie.onload=this.load_listener;
	movie.addEventListener('load',this.load_listener);
	movie.addEventListener('stop',this.stop_listener);
	movie.show();
}

Projector.prototype.removeMovie = function (movie)
{
	this.display.removeDepiction( movie );
	var ndx;
	while( (ndx=this.movies.indexOf(movie)) != -1 ) 
	{ 
		this.movies.splice(ndx,1); 
	}
	movie.img.removeEventListener('load',this.load_listener);
	this.display.redraw();
}

Projector.prototype.updateXY = function(e)
{
	if (e!=undefined)
	{
		this.p=this.display.xy(e)
	}
	if( this.p!=null )
	{
		for(var i=0; i<this.movies.length; i++)
		{
			this.movies[i].getValues(this.p.x,this.p.y,this.updateStatus);
		}
	}
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
	this.fps=10;
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
	var frame='-'
	var time='-'
	var timestep='-'
	for( var n=0; n<this.movies.length; n++ )
	{
		this.movies[n].frame=this.movies[n].first;
		this.movies[n].show();
		frame=this.movies[n].frame
		time=this.movies[n].timesteps[frame][1]
		timestep=this.movies[n].timesteps[frame][0]
	}	
	this.display.setStatus('frame','<span class="label">frame:</span>'+frame)
	this.display.setStatus('time',sprintf('<span class="label">time:</span>%0.1f Ma',time/sec_in_ma))
	this.display.setStatus('timestep',sprintf('<span class="label">timestep:</span>%d',timestep))
}
Projector.prototype.end = function()
{
	var frame='-'
	var time='-'
	var timestep='-'
	for( var n=0; n<this.movies.length; n++ )
	{
		this.movies[n].frame=this.movies[n].last;
		this.movies[n].show();
		frame=this.movies[n].frame
		time=this.movies[n].timesteps[frame][1]
		timestep=this.movies[n].timesteps[frame][0]
	}	
	this.display.setStatus('frame','<span class="label">frame:</span>'+frame)
	this.display.setStatus('time',sprintf('<span class="label">time:</span>%0.1f Ma',time/sec_in_ma))
	this.display.setStatus('timestep',sprintf('<span class="label">timestep:</span>%d',timestep))
}

Projector.prototype.goto = function(frame)
{
	var time='-'
	var timestep='-'
	for( var n=0; n<this.movies.length; n++ )
	{
		this.movies[n].frame=frame;
		this.movies[n].show();
		time=this.movies[n].timesteps[frame][1]
		timestep=this.movies[n].timesteps[frame][0]
	}	
	this.display.setStatus('frame','<span class="label">frame:</span>'+frame)
	this.display.setStatus('time',sprintf('<span class="label">time:</span>%0.1f Ma',time/sec_in_ma))
	this.display.setStatus('timestep',sprintf('<span class="label">timestep:</span>%d',timestep))
}

Projector.prototype.next = function()
{
	var frame='-'
	var time='-'
	var timestep='-'
	for( var n=0; n<this.movies.length; n++ )
	{
		this.movies[n].next(this.direction);
		frame=this.movies[n].frame
		time=this.movies[n].timesteps[frame][1]
		timestep=this.movies[n].timesteps[frame][0]
	}
	if( this.playing && this.frameTime>0 ) 
	{
			var actualFPS=Math.round(1000/((new Date()).getTime()-this.frameTime));
			this.display.setStatus('fps','<span class="label">fps:</span>'+actualFPS+'/'+this.fps)
	}
	this.frameTime=(new Date()).getTime();
	this.display.setStatus('frame','<span class="label">frame:</span>'+frame)
	this.display.setStatus('time',sprintf('<span class="label">time:</span>%0.1f Ma',time/sec_in_ma))
	this.display.setStatus('timestep',sprintf('<span class="label">timestep:</span>%d',timestep))
}

Projector.prototype.loaded = function(e)
{
	this.load_count++;
	if( this.load_count>=this.movies.length )
	{
		this.display.redraw();
		this.load_count=0;
		if( this.playing )
		{
			var self=this;
			window.setTimeout(function() { self.next(); } ,1000/this.fps);
		}
		this.updateXY();
	}
}

Projector.prototype.stopped = function(e)
{
	this.stop_count++;
	if( this.stop_count>=this.movies.length )
	{
		this.stop_count=0;
		this.pause();
		this.direction=1;
	}
}


