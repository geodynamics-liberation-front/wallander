/*
 * The data field manager
 */
function DataFieldManager(elem,display)
{
	this.html_element=elem
	this.display=display
	this.reference_data_field=null;
	this.data_field_paths=[]
	this.data_fields={}
}

DataFieldManager.prototype.serialize = function()
{
	var serialized_data_field_mgr={}
	serialized_data_field_mgr.paths=this.data_field_paths.slice()
	if( this.reference_data_field )
		serialized_data_field_mgr.reference_data_field=this.reference_data_field.path
	serialized_data_field_mgr.data_fields={}
	
	for( var path in this.data_fields) 
	{
		serialized_data_field_mgr.data_fields[path]=this.data_fields[path].serialize()
	}
	return serialized_data_field_mgr
}

DataFieldManager.prototype.deserialize = function(serialized_data_field_mgr,callback)
{
	var self=this
	var paths=serialized_data_field_mgr.paths.slice()
	if( paths.length>0 )
	{
		jsonCall(config['app_prefix']+paths.pop(),function(df,a) {self.loadDataField(df,a)}, {
			paths:paths,
			display:display,
			serialized_data_field_mgr:serialized_data_field_mgr,
			callback:callback})
	}
	else if( callback )
	{
		callback()
	}
}

DataFieldManager.prototype.loadDataField = function(data_field,args)
{
	var self=this
	this.addDataField(data_field)
	// Load another data field if necessary
	if( args.paths.length>0 )
	{
		jsonCall(config['app_prefix']+args.paths.pop(),function(fd,a) {self.loadDataField(df,a)},args)
	}
	else
	{
		var display=args.display
		var serialized_data_field_mgr=args.serialized_data_field_mgr
		var callback=args.callback

		for( var path in this.data_fields) 
		{
			this.data_fields[path].deserialize(args.serialized_data_field_mgr.data_fields[path])
		}
		if( serialized_data_field_mgr.reference_data_field )
		{
			this.setReferenceDataField(this.data_fields[serialized_data_field_mgr.reference_data_field])
		}

		if(callback) callback()
	}
}

DataFieldManager.prototype.addDataField = function(data_field)
{
	console.log('Adding data field: ')
	console.log(data_field.path)

	var df
	switch( data_field.data_type )
	{
		case 'scalar':
			df=new ScalarDataField(data_field,this)
			this.display.projector.movie.addDataField(df)
			break;
		default:
			throw new Error('Unknown data type: "'+data_field.data_type+'"')
	}


	this.data_field_paths.push(data_field.path)
	this.data_fields[data_field.path]=df

	if( !this.reference_data_field ) 
	{ 
		this.setReferenceDataField(df)
	}
}

DataFieldManager.prototype.removeDataField = function(data_field)
{
	var df=this.data_fields[data_field]
	delete this.data_fields[data_field]
	this.data_field_paths.splice(this.data_field_paths.indexOf(data_field),1)
	if( df===this.reference_data_field )
	{
		this.setReferenceDataField(this.data_field_paths[-1])
	}
}

DataFieldManager.prototype.updateXY = function(t,x,y)
{
	var df=null;
	var self=this
	for( var i=0; i<this.data_field_paths.length; i++)
	{
		df=this.data_fields[this.data_field_paths[i]]
		if( df.visible && 
				t>-1 && t<df.frame_count &&
				x>-1 && x<df.nx &&
				y>-1 && y<df.ny )
		{
			// The data array are indexed by frame,row,column
			jsonCall(df.path+'/'+t+','+y+','+x,self.updateDisplayValue,df)
		}
		else
		{
			df.html_value.innerHTML="-"
		}
	}
}

DataFieldManager.prototype.updateDisplayValue = function(v,df)
{
	if( df._unit!=df.native.unit )
	{
		v=units.convert(df.native.unit,df._unit,v)
	}
	df.html_value.innerHTML=sprintf(df.format,v)+"<span class='label'>"+df.unit+"</span>"
}

DataFieldManager.prototype.setReferenceDataField = function(data_field)
{
	// Set the reference data field
	this.reference_data_field=data_field 
	if( data_field )
	{
		// Set the time units and format
		var editor=display.status_mgr.statuses['time'].status_editor
		editor.innerHTML=''
		editor.appendChild(data_field.time_unit_select)
		editor.appendChild(data_field.time_format_input)


		var editor=display.status_mgr.statuses['dimensional_xy'].status_editor
		editor.innerHTML=''
		editor.appendChild(data_field.dimension_unit_select)
		editor.appendChild(data_field.dimension_format_input)
	}
}

function DataField(native_data_field,data_field_mgr)
{
	if( arguments.length==0 ) return
	var self=this
	this.data_field_mgr=data_field_mgr
	this.native=native_data_field

	this.display_name=this.native.display_name
	this.name=this.native.name
	this.path=this.native.path
	this.dx=this.native.dx
	this.dy=this.native.dy
	this.nx=this.native.nx
	this.ny=this.native.ny
	this.frame_count=this.native.time.length
	this._unit=this.native.unit
	this._format=this.native.format
	this._time_unit=this.native.time_unit
	this._time_format=this.native.time_format
	this._dimension_unit=this.native.dimension_unit
	this._dimension_format=this.native.dimension_format
	this.visible=true
	
	this.html_display=document.getElementById('data_field_template').cloneNode(true)
	this.html_display.id=this.path
	data_field_mgr.html_element.appendChild(this.html_display)
	new Dropdown(this.html_display.getElementsByClassName('data_field_status')[0], this.html_display.getElementsByClassName('data_field_details')[0])

	// The name value in the status bar
	this.html_name=this.html_display.getElementsByClassName('data_field_name')[0]
	this.html_name.innerHTML=this.display_name
	this.html_value=this.html_display.getElementsByClassName('data_field_value')[0]
	this.html_value.innerHTML='-'

	// The unit selector
	this.unit_select=this.html_display.getElementsByClassName('data_field_unit')[0]
	this.unit_select.indexOf=selectIndexOf
	units.unit_select(this.unit_select,this.native.unit)
	this.unit_select.addEventListener('change',function(e) {self.unit=e.target.value;})

	// The format input
	this.format_input=this.html_display.getElementsByClassName('data_field_format')[0]
	this.format_input.value=this.native.format
	this.format_input.addEventListener('change',function(e) {self.format=e.target.value})


	// The time unit selector
	this.time_unit_select=document.createElement('select')
	this.time_unit_select.indexOf=selectIndexOf
	this.time_unit_select.className='data_field_time_unit'
	units.unit_select(this.time_unit_select,this._time_unit)
	this.time_unit_select.addEventListener('change',function(e) { self.time_unit=e.target.value; })

	// The time format input
	this.time_format_input=document.createElement('input')
	this.time_format_input.className='data_field_time_format'
	this.time_format_input.value=this._time_format
	this.time_format_input.addEventListener('change',function(e) { self.time_format=e.target.value; })

	// The dimension unit selector
	this.dimension_unit_select=document.createElement('select')
	this.dimension_unit_select.indexOf=selectIndexOf
	this.dimension_unit_select.className='data_field_dimension_unit'
	units.unit_select(this.dimension_unit_select,this._dimension_unit)
	this.dimension_unit_select.addEventListener('change',function(e) { self.dimension_unit=e.target.value; })

	// The dimension format input
	this.dimension_format_input=document.createElement('input')
	this.dimension_format_input.className='data_field_dimension_format'
	this.dimension_format_input.value=this._dimension_format
	this.dimension_format_input.addEventListener('change',function(e) { self.dimension_format=e.target.value; })
}

DataField.prototype.serialize = function()
{
	var serialized_data_field={}
	serialized_data_field.unit = this.unit
	serialized_data_field.format = this.format
	serialized_data_field.time_unit = this.time_unit
	serialized_data_field.time_format = this.time_format
	serialized_data_field.dimension_unit = this.dimension_unit
	serialized_data_field.dimension_format = this.dimension_format
	return serialized_data_field
}

DataField.prototype.deserialize = function(serialized_data_field)
{
	this.unit = serialized_data_field.unit
	this.format = serialized_data_field.format
	this.time_unit = serialized_data_field.time_unit
	this.time_format = serialized_data_field.time_format
	this.dimension_unit = serialized_data_field.dimension_unit
	this.dimension_format = serialized_data_field.dimension_format
}

Object.defineProperty(DataField.prototype,'unit',
    {enumerable: true,
     get: function() { return this._unit;},
     set: function(unit)
        {
			if( unit!=this._unit )
			{
				if( this.unit_select.indexOf(unit)==-1 ) throw new Error("\""+unit+"\" is not a valid unit.")
				this._unit=unit
				if( this.unit_select.value!=unit ) this.unit_select.value=unit 
				this.data_field_mgr.display.updateXY()
			}
        }
    })

Object.defineProperty(DataField.prototype,'format',
    {enumerable: true,
     get: function() { return this._format;},
     set: function(format)
        {
			if( format!=this._format )
			{
				sprintf.parse(format) // Will thrown an error if not correctly formated
				this._format=format
				if( this.format_input.value!=format ) this.format_input.value=format 
				this.data_field_mgr.display.updateXY()
			}
        }
    })

Object.defineProperty(DataField.prototype,'time_unit',
    {enumerable: true,
     get: function() { return this._time_unit;},
     set: function(time_unit)
        {
			if( time_unit!=this._time_unit )
			{
				if( this.time_unit_select.indexOf(time_unit)==-1 ) throw new Error("\""+unit+"\" is not a valid unit.")
				this._time_unit=time_unit
				if( this.time_unit_select.value!=time_unit ) this.time_unit_select.value=time_unit 
				this.data_field_mgr.display.projector.updateStatus()
			}
        }
    })

Object.defineProperty(DataField.prototype,'time_format',
    {enumerable: true,
     get: function() { return this._time_format;},
     set: function(time_format)
        {
			if( time_format!=this._time_format )
			{
				sprintf.parse(time_format) // Will thrown an error if not correctly formated
				this._time_format=time_format
				if( this.time_format_input.value!=time_format ) this.time_format_input.value=time_format 
				this.data_field_mgr.display.projector.updateStatus()
			}
        }
    })

Object.defineProperty(DataField.prototype,'dimension_unit',
    {enumerable: true,
     get: function() { return this._dimension_unit;},
     set: function(dimension_unit)
        {
			if( dimension_unit!=this._dimension_unit )
			{
				if( this.dimension_unit_select.indexOf(dimension_unit)==-1 ) throw new Error("\""+unit+"\" is not a valid unit.")
				this._dimension_unit=dimension_unit
				if( this.dimension_unit_select.value!=dimension_unit ) this.dimension_unit_select.value=dimension_unit 
				this.data_field_mgr.display.updateXY()
			}
        }
    })

Object.defineProperty(DataField.prototype,'dimension_format',
    {enumerable: true,
     get: function() { return this._dimension_format;},
     set: function(dimension_format)
        {
			if( dimension_format!=this._dimension_format )
			{
				sprintf.parse(time_format) // Will thrown an error if not correctly formated
				this._dimension_format=dimension_format
				if( this.dimension_format_input.value!=dimension_format ) this.dimension_format_input.value=dimension_format 
				this.data_field_mgr.display.updateXY()
			}
        }
    })

DataField.prototype.xy = function(x,y)
{
	x=this.native.dx*x + this.native.x0
	y=this.native.dy*y + this.native.y0
	if( this._dimension_unit!=this.native.dimension_unit )
	{
		x=units.convert(this.native.dimension_unit,this._dimension_unit,x)
		y=units.convert(this.native.dimension_unit,this._dimension_unit,y)
	}
	return {x:x,y:y}
}

DataField.prototype.time = function(t)
{
	t=this.native.time[t]
	if( this._time_unit!=this.native.time_unit )
	{
		t=units.convert(this.native.time_unit,this._time_unit,t)
	}
	return t
}

function ScalarDataField(native_data_field,data_field_mgr)
{
	DataField.call(this,native_data_field,data_field_mgr)
	this.frame_options=new FrameOptions(this)
	this.contour_options=new ContourOptions(this)
}
ScalarDataField.prototype = Object.create(DataField.prototype);

ScalarDataField.prototype.loadImages = function(frame)
{
	var expected_frames=0
	if( this.frame_options.show )
	{
		this.frame_options.image.src=sprintf(this.frame_options.url,frame)
		expected_frames++
	}
	if( this.contour_options.show )
	{
		this.contour_options.image.src=sprintf(this.contour_options.url,frame)
		expected_frames++
	}
	return expected_frames
}

ScalarDataField.prototype.getImages = function()
{
	var images=[]
	if( this.frame_options.show ) images.push({image:this.frame_options.image,opacity:this.frame_options.opacity})
	if( this.contour_options.show ) images.push({image:this.contour_options.image,opacity: 1.0})
	return images
}

ScalarDataField.prototype.getBounds = function()
{
	return {
		width: Math.max(this.frame_options.image.width,this.contour_options.image.width),
		height: Math.min(this.frame_options.image.height,this.contour_options.image.height)
	}
}

ScalarDataField.prototype.serialize = function()
{
	var serialized_data_field = Object.getPrototypeOf(ScalarDataField.prototype).serialize.call(this);
	serialized_data_field.renderer=this.frame_options.renderer
	serialized_data_field.frame_opacity=this.frame_options.opacity
	return serialized_data_field
}

ScalarDataField.prototype.deserialize = function(serialized_data_field)
{
	Object.getPrototypeOf(ScalarDataField.prototype).deserialize.call(this,serialized_data_field);
	this.frame_options.renderer = serialized_data_field.renderer
	this.frame_options.opacity=serialized_data_field.frame_opacity
}

ScalarDataField.prototype.upateContours = function()
{
	if( this.allow_contour_updates )
	{
		this._contours=compose_contours(this.contour_levels)
		this.frame_info.frame.url=config['frame_prefix']+this.path+'.'+this._contours+'.%05d.png'
		this.data_field_mgr.display.projector.redraw()
	}
}

function ContourOptions(data_field)
{
	var self=this
	this.data_field=data_field
	this.allow_renderer_updates=true
	this._show=false

	this.url=''
	this.image=new Image()
	var movie=data_field.data_field_mgr.display.projector.movie
	this.image.addEventListener('load', function(e) { movie.loaded(e); });
	this._opacity=1.0

	this.contour_levels=[]
	this._contours=''

	// Image button
	this.table =data_field.html_display.getElementsByClassName('data_field_contour_options')[0]
	this.table.style.display=this._show?'':'none'
	var svg_obj=data_field.html_display.getElementsByClassName('data_field_control_contour')[0]
	this.svg=svg_obj.getSVGDocument()
	svg_obj.addEventListener('load',function (e) { self.svg=e.target.getSVGDocument()})
	svg_obj.nextElementSibling.addEventListener('click',function(e) { self.show=!self.show })

	// The opacity slider
	this.opacity_range=data_field.html_display.getElementsByClassName('data_field_contour_opacity')[0]
	this.opacity_range.value=1.0
	this.opacity_range.addEventListener('input',function(e) { self.opacity=e.target.value })
}

ContourOptions.prototype.updateContours = function(e)
{
	if( this.allow_contours_updates )
	{
		this._contours=this.contour_levels.join('_')
		this.url=config['contour_prefix']+this.data_field.path+'.'+this._contours+'.%05d.svg'
		this.data_field.data_field_mgr.display.projector.redraw()
	}
}

Object.defineProperty(ContourOptions.prototype,'show',
    {enumerable: true,
     get: function() { return this._show;},
     set: function(show)
        {
			if( show!=this._show )
			{
				if( typeof(show)!='boolean' ) throw new Error ('show must be a boolean not a ' + typeof(show) + ' : '+show)
				this._show=show
//				if(!this.show_btn) this.show_btn=this.svg.contentDocument.getElementById('img')
				this.svg.defaultView.highlight(show)
				this.table.style.display=show?'':'none'
				this.data_field.data_field_mgr.display.projector.redraw()
			}
        }
    })

Object.defineProperty(ContourOptions.prototype,'opacity',
    {enumerable: true,
     get: function() { return this._opacity;},
     set: function(opacity)
        {
			opacity=parseFloat(opacity)
			if( opacity!=this._opacity )
			{
				if(isNaN(opacity)) opacity=1.0
				if( opacity<0 || opacity>1.0 ) throw new Error("Opacity must be bteween 0.0 and 1.0 (inclusive)")
				this._opacity=opacity
				if( this.opacity_range.value!=opacity ) this.opacity_range.value=opacity 
				this.data_field.data_field_mgr.display.projector.redraw()
			}
        }
    })

Object.defineProperty(ContourOptions.prototype,'contours',
    {enumerable: true,
     get: function() { return this._contours;},
     set: function(contours)
        {
			if( contours!=this._contours )
			{
				this.contour_levels=contours.split()
				this.updateContours()
			}
        }
    })

function FrameOptions(data_field)
{
	var self=this
	this.data_field=data_field
	this.allow_renderer_updates=true

	this.url=''
	this._show=true
	this.image=new Image()
	var movie=data_field.data_field_mgr.display.projector.movie
	this.image.addEventListener('load', function(e) { movie.loaded(e); });

	this._opacity=1.0

	var renderer=parse_renderer(data_field.native.renderer)
	this._colormap=renderer.colormap
	this._log=renderer.log
	this._min=renderer.min
	this._max=renderer.max
	this._undercolor=renderer.undercolor
	this._overcolor=renderer.overcolor
	this._renderer=''

	// Image button
	this.table=data_field.html_display.getElementsByClassName('data_field_frame_options')[0]
	this.table.style.display=this._show?'':'none'
	var svg_obj=data_field.html_display.getElementsByClassName('data_field_control_frame')[0]
	this.svg=svg_obj.getSVGDocument()
	svg_obj.addEventListener('load',function (e) { self.svg=e.target.getSVGDocument()})
	svg_obj.nextElementSibling.addEventListener('click',function(e) { self.show=!self.show })

	// The opacity slider
	this.opacity_range=data_field.html_display.getElementsByClassName('data_field_frame_opacity')[0]
	this.opacity_range.value=1.0
	this.opacity_range.addEventListener('input',function(e) { self.opacity=e.target.value })

	// Colormap
	var opt=document.createElement('option')
	opt.value=renderer.colormap
	var select=data_field.html_display.getElementsByClassName('data_field_colormap')[0]
	select.appendChild(opt)

	// colormap selector
	this.colormap_selector=new ColormapSelector(select)
	this.colormap_selector.value=renderer.colormap
	this.colormap_selector.addEventListener('change',function(e) { self.colormap=e.target.value })

	// min
	this.min_input=data_field.html_display.getElementsByClassName('data_field_min')[0]
	this.min_input.value=renderer.min||''
	this.min_input.addEventListener('change',function(e) { self.min=e.target.value })

	// max
	this.max_input=data_field.html_display.getElementsByClassName('data_field_max')[0]
	this.max_input.value=renderer.max||''
	this.max_input.addEventListener('change',function(e) { self.max=e.target.value })

	// under
	this.under_colorpicker=new ColorPicker(data_field.html_display.getElementsByClassName('data_field_under')[0])
	this.under_colorpicker.hash=false
	this.under_colorpicker.value=renderer.undercolor||null
	this.under_colorpicker.addEventListener('change',function(e) { self.undercolor=e.target.value })

	// over	
	this.over_colorpicker=new ColorPicker(data_field.html_display.getElementsByClassName('data_field_over')[0])
	this.over_colorpicker.hash=false
	this.over_colorpicker.value=renderer.overcolor||null
	this.over_colorpicker.addEventListener('change',function(e) { self.overcolor=e.target.value })

	// log scale
	this.log_checkbox=data_field.html_display.getElementsByClassName('data_field_log')[0]
	this.log_checkbox.checked=renderer.log?'checked':''
	this.log_checkbox.addEventListener('change',function(e) { self.log=e.target.checked })
	this.updateRenderer()
}

FrameOptions.prototype.updateRenderer = function(e)
{
	if( this.allow_renderer_updates )
	{
		this._renderer=compose_renderer(this)
		this.url=config['frame_prefix']+this.data_field.path+'.'+this._renderer+'.%05d.png'
		this.data_field.data_field_mgr.display.projector.redraw()
	}
}

Object.defineProperty(FrameOptions.prototype,'show',
    {enumerable: true,
     get: function() { return this._show;},
     set: function(show)
        {
			if( show!=this._show )
			{
				if( typeof(show)!='boolean' ) throw new Error ('show must be a boolean not a ' + typeof(show) + ' : '+show)
				this._show=show
		//		if(!this.show_btn) this.show_btn=this.svg.contentDocument.getElementById('img')
				this.svg.defaultView.highlight(show)
				this.table.style.display=show?'':'none'
				this.data_field.data_field_mgr.display.projector.redraw()
			}
        }
    })

Object.defineProperty(FrameOptions.prototype,'opacity',
    {enumerable: true,
     get: function() { return this._opacity;},
     set: function(opacity)
        {
			opacity=parseFloat(opacity)
			if( opacity!=this._opacity )
			{
				if(isNaN(opacity)) opacity=1.0
				if( opacity<0 || opacity>1.0 ) throw new Error("Opacity must be bteween 0.0 and 1.0 (inclusive)")
				this._opacity=opacity
				if( this.opacity_range.value!=opacity ) this.opacity_range.value=opacity 
				this.data_field.data_field_mgr.display.projector.redraw()
			}
        }
    })

Object.defineProperty(FrameOptions.prototype,'renderer',
    {enumerable: true,
     get: function() { return this._renderer;},
     set: function(renderer)
        {
			if( renderer!=this._renderer )
			{
				this.allow_renderer_updates=false

				var renderer=parse_renderer(renderer)
				this.colormap=renderer.colormap
				this.log=renderer.log
				this.min=renderer.min
				this.max=renderer.max
				this.undercolor=renderer.undercolor
				this.overcolor=renderer.overcolor
							
				this.allow_renderer_updates=true
				this.updateRenderer()
			}
        }
    })

Object.defineProperty(FrameOptions.prototype,'colormap',
    {enumerable: true,
     get: function() { return this._colormap;},
     set: function(colormap)
        {
			if( colormap!=this._colormap )
			{
				if( this.colormap_selector.colormaps.indexOf(colormap)==-1 ) throw new Error ('"'+colormap+'" is not a valid colormap')
				this._colormap=colormap
				if( this.colormap_selector.value!=this._colormap ) this.colormap_selector.value=this._colormap
				this.updateRenderer()
			}
        }
    })

Object.defineProperty(FrameOptions.prototype,'log',
    {enumerable: true,
     get: function() { return this._log;},
     set: function(log)
        {
			if( log!=this._log )
			{
				if( typeof(log)!='boolean' ) throw new Error ('log must be a boolean not a ' + typeof(log) + ' : '+log)
				this._log=log
				if( this.log_checkbox.checked!=this._log ) this.log_checkbox.checked=this._log
				this.updateRenderer()
			}
        }
    })

Object.defineProperty(FrameOptions.prototype,'min',
    {enumerable: true,
     get: function() { return this._min;},
     set: function(min)
        {
			if( min!=this._min )
			{
				this._min=isNaN(parseFloat(min))?null:min
				if( this.min_input.value!=this._min ) this.min_input.value=this._min
				this.updateRenderer()
			}
        }
    })

Object.defineProperty(FrameOptions.prototype,'max',
    {enumerable: true,
     get: function() { return this._max;},
     set: function(max)
        {
			max=parseFloat(max)
			if( max!=this._max )
			{
				this._max=isNaN(parseFloat(max))?null:max
				if( this.max_input.value!=this._max ) this.max_input.value=this._max
				this.updateRenderer()
			}
        }
    })

Object.defineProperty(FrameOptions.prototype,'undercolor',
    {enumerable: true,
     get: function() { return this._undercolor;},
     set: function(undercolor)
        {
			if( undercolor!=this._undercolor )
			{
				this._undercolor=undercolor
				if( this.under_colorpicker.value!=this._undercolor ) this.under_colorpicker.value=this._undercolor
				this.updateRenderer()
			}
        }
    })

Object.defineProperty(FrameOptions.prototype,'overcolor',
    {enumerable: true,
     get: function() { return this._overcolor;},
     set: function(overcolor)
        {
			if( overcolor!=this._overcolor )
			{
				this._overcolor=overcolor
				if( this.over_colorpicker.value!=this._overcolor ) this.over_colorpicker.value=this._overcolor
				this.updateRenderer()
			}
        }
    })

function compose_renderer(r)
{
	var components=[r.colormap+(r.log?'-log':''),r.min,r.max,r.undercolor,r.overcolor,r.badcolor]	
	while( components.length>0 && components[components.length-1]==undefined ) components.splice(components.length-1,1) 
	var search_ndx=0
	var ndx=-1
	while( (ndx=components.indexOf(null,search_ndx))>-1 )
	{
		components[ndx]=''
		search_ndx=ndx+1
	}
	search_ndx=0
	ndx=-1
	while( (ndx=components.indexOf(undefined,search_ndx))>-1 )
	{
		components[ndx]=''
		search_ndx=ndx+1
	}
	return components.join('_')
}

var CM_RE=new RegExp('('+regex.letters_numbers+')_?('+regex.float+')?_?('+regex.float+')?_?('+regex.hex+')?_?('+regex.hex+')?_?('+regex.hex+')?')
function parse_renderer(renderer)
{
	var m=renderer.match(CM_RE)
	if( CM_RE )
	{
		var r={
			colormap: m[1],
			min: m[2],
			max: m[3],
			undercolor: m[4],
			overcolor:  m[5],
			badcolor:   m[6]}
		
		if( r.log=r.colormap.endsWith("-log") )
		{
			r.colormap=r.colormap.substr(0,r.colormap.length-4)
		}
		return r;
	}
}
