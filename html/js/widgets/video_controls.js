function PlayerControls(e)
{
	EventBroadcaster.call(this)
	var self=this
	this._frame=0
	this._broadcast_event=false
	this._total_frames=0
	this._playing=false

	this.playpause_elem=e
	this.btn=new SVGToggleButton(e,this._playing)
	this.btn.addEventListener('change',function(e) { self.playing=e.target.value })
	this.player_controls=document.createElement('div')
	this.player_controls.className='player_controls'
	e.parentNode.replaceChild(this.player_controls,e)
	this.player_controls.appendChild(e)

	this.progress_bar=document.createElement('div')
	this.progress_bar.className='progress_bar'
	this.player_controls.appendChild(this.progress_bar)
	this.progress_bar.addEventListener('mousedown',function(e) { self.mousedown(e)})
	document.addEventListener('mouseup',function(e)   { self.mouseup(e)})
	document.addEventListener('mousemove',function(e) { self.mousemove(e)})
	//this.progress_bar.addEventListener('mouseup',function(e)   { self.mouseup(e)})
	//this.progress_bar.addEventListener('mousemove',function(e) { self.mousemove(e)})
	this._dragging=false

	this.progress=document.createElement('div')
	this.progress.className='progress'
	this.progress.style.width="0px"
	this.progress_bar.appendChild(this.progress)
}
PlayerControls.prototype=new EventBroadcaster

Object.defineProperty(PlayerControls.prototype,'total_frames',
	{enumerable: true,
     get: function() { return this._total_frames; },
     set: function(total_frames) {
		if( total_frames!=this._total_frames )
		{	
			this._total_frames=total_frames
			var frame=this.frame
			this._frame=0
			this.frame=frame
		} 
	}
	})

Object.defineProperty(PlayerControls.prototype,'frame',
	{enumerable: true, 
     get: function() { return this._frame; },
     set: function(frame) {
		if( this._broadcast_event || frame!=this._frame )
		{
			this._broadcast_event=false
			this._frame=Math.max(0,Math.min(this.total_frames,frame))
			var s=getComputedStyle(this.progress_bar)
			var x=this.total_frames ? parseInt(s.width)*this._frame/this.total_frames : 0
			this.progress.style.width=x+"px"
			this.broadcastEvent(this._dragging?"input":"change",{target:this})
		} 
	}
	})

Object.defineProperty(PlayerControls.prototype,'playing',
	{enumerable: true, 
     get: function() { return this._playing; },
     set: function(playing) {
		if( playing!=this._playing )
		{
			this._playing=playing
			this.btn.value=this._playing
			this.broadcastEvent(this._playing?"play":"pause",{target:this})
		} 
	}
	})

PlayerControls.prototype.mouseSelect = function(e)
{
	var xy=event_xy(e,this.progress_bar,true)
	this.frame=Math.round(this.total_frames*xy.x/xy.width)
}

PlayerControls.prototype.mousedown = function(e)
{
	this._dragging=true
	this.progress_bar.style.cursor="col-resize"
	this.mouseSelect(e)
}

PlayerControls.prototype.mouseup = function(e)
{
	if( this._dragging )
	{
		this._dragging=false
		this.progress_bar.style.cursor="auto"
		this._broadcast_event=true
		this.mouseSelect(e)
	}
}

PlayerControls.prototype.mousemove = function(e)
{
	if( this._dragging )
	{
		this.mouseSelect(e)
	}
}
