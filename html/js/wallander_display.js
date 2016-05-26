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

DataFieldManager.prototype.deserialize = function(serialized_data_field_mgr,callback,args)
{
	var self=this
	var paths=[]
	for( var i=0; i<serialized_data_field_mgr.paths.length; i++ )
	{
		paths.push(config['app_prefix']+serialized_data_field_mgr.paths[i])
	}
	if( paths.length>0 )
	{
		var resource_bundle=new JSONResourceBundle(paths,function(r,a){self.dataFieldsLoaded(r,a)},{callback:callback,args:args,serialized_data_field_mgr:serialized_data_field_mgr})
		resource_bundle.load()
	}
	else if( callback )
	{
		callback()
	}
}

DataFieldManager.prototype.dataFieldsLoaded = function(resource_bundle,args)
{
	for( var i=0; i<resource_bundle.urls.length; i++ )
	{
		var data_field=resource_bundle.responses[resource_bundle.urls[i]]
		// Add the data_field in it's default state
		var data_field_obj=this.addDataField(data_field)
		data_field_obj.deserialize(args.serialized_data_field_mgr.data_fields[data_field_obj.path])
	}
	this.setReferenceDataField(this.data_fields[args.serialized_data_field_mgr.reference_data_field])
	if(args.callback) args.callback(args.args)
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
	return df
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
	if( this.contour_options.show && this.contour_options.contour_levels.length>0)
	{
		loadSVG(sprintf(this.contour_options.url,frame),this.contour_options.image, this.contour_options.style)
		expected_frames++
	}
	return expected_frames
}

ScalarDataField.prototype.getImages = function()
{
	var images=[]
	if( this.frame_options.show ) images.push({image:this.frame_options.image,opacity:this.frame_options.opacity})
	if( this.contour_options.show ) images.push({image:this.contour_options.image,opacity: this.contour_options.opacity})
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
// TODO: have frame and contour options serialize themselves
	serialized_data_field.renderer=this.frame_options.renderer
	serialized_data_field.frame_opacity=this.frame_options.opacity
	return serialized_data_field
}

ScalarDataField.prototype.deserialize = function(serialized_data_field)
{
	Object.getPrototypeOf(ScalarDataField.prototype).deserialize.call(this,serialized_data_field);
// TODO: have frame and contour options deserialize themselves
	this.frame_options.renderer = serialized_data_field.renderer
	this.frame_options.opacity=serialized_data_field.frame_opacity
}

function ContourOptions(data_field)
{
	var self=this
	this.data_field=data_field
	this.allow_updates=true
	this._show=false
	this._projector=data_field.data_field_mgr.display.projector

	this.url=''
	this.image=new Image()
	var movie=data_field.data_field_mgr.display.projector.movie
	this.image.addEventListener('load', function(e) { movie.loaded(e); });
	this._opacity=1.0

	this.contour_levels=[]
	this._contours=''
	this._style=''

	// Image button
	this.table=data_field.html_display.getElementsByClassName('data_field_contour_options')[0]
	this.table.style.display=this._show?'':'none'
	var svg_obj=data_field.html_display.getElementsByClassName('data_field_control_contour')[0]
	this.svg=svg_obj.getSVGDocument()
	svg_obj.addEventListener('load',function (e) { self.svg=e.target.getSVGDocument()})
	svg_obj.nextElementSibling.addEventListener('click',function(e) { self.show=!self.show })

	// The opacity slider
	this.opacity_range=data_field.html_display.getElementsByClassName('data_field_contour_opacity')[0]
	this.opacity_range.value=1.0
	this.opacity_range.addEventListener('input',function(e) { self.opacity=e.target.value })

	// Add contour button
	this.add_button=data_field.html_display.getElementsByClassName('data_field_contour_add')[0]
	this.add_button.addEventListener('click',function(e) { self.addContourFields() })
}

ContourOptions.prototype.updateContours = function(e)
{
	if( this.allow_updates )
	{
		var levels=[]
		var style=[]
		for( var i=0; i<this.contour_levels.length; i++ )
		{
			var c=this.contour_levels[i]
			if( !c.width || c.value==undefined ) return
			levels.push(this.contour_levels[i].value)
			style.push(sprintf(".contour_%s { stroke: %s; stroke-width: %0.2f; fill: none}",c.value.replace('.','_'),c.rgba,parseFloat(c.width)))
		}
		levels.sort(function(a,b) { return parseFloat(a)-parseFloat(b)})
		this._contours=levels.join('_')
		this._style=style.join('\n')
		this.url=config['contour_prefix']+this.data_field.path+'.'+this._contours+'.%05d.svg'
		this._projector.redraw()
	}
}

Object.defineProperty(ContourOptions.prototype,'style', {enumerable: true, get: function() { return this._style;}})

Object.defineProperty(ContourOptions.prototype,'show',
    {enumerable: true,
     get: function() { return this._show;},
     set: function(show)
        {
			if( show!=this._show )
			{
				if( typeof(show)!='boolean' ) throw new Error ('show must be a boolean not a ' + typeof(show) + ' : '+show)
				this._show=show
				this.svg.defaultView.highlight(show)
				this.table.style.display=show?'':'none'
				this._projector.redraw()
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
				this._projector.redraw()
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

ContourOptions.prototype.addContourFields = function()
{
	var row=document.getElementById('data_field_contour_field_template').cloneNode(true)
	row.id=''
	this.table.appendChild(row)
	this.contour_levels.push(new Contour(this,row))
}

function Contour(contour_options,row)
{
	var self=this
	this.contour_options=contour_options
	this._value=null
	this._width=1
	this._color='#000000FF'

	// value
	this.value_input=row.getElementsByClassName('data_field_contour_value')[0]
	this.value_input.addEventListener('change',function(e) { self.value=e.target.value })
	// width
	this.width_input=row.getElementsByClassName('data_field_contour_width')[0]
	this.width_input.value=this._width
	this.width_input.addEventListener('change',function(e) { self.width=e.target.value })
	// color
	this.colorpicker=new ColorPicker(row.getElementsByClassName('data_field_contour_color')[0])
	this.colorpicker.hash=true
	this.colorpicker.allow_nocolor=false
	this.colorpicker.value=this._color
	this.colorpicker.addEventListener('change',function(e) { self.color=e.target.value })
}

Object.defineProperty(Contour.prototype,'value',
    {enumerable: true,
     get: function() { return this._value;},
     set: function(value)
        {
			if( value!=this._value )
			{
				this._value=isNaN(parseFloat(value))?null:value
				if( this.value_input.value!=this._value ) this.value_input.value=this._value
				this.contour_options.updateContours()
			}
        }
    })

Object.defineProperty(Contour.prototype,'width',
    {enumerable: true,
     get: function() { return this._width;},
     set: function(width)
        {
			if( width!=this._width )
			{
				this._width=isNaN(parseFloat(width))?null:width
				if( this.width_input.value!=this._width ) this.width_input.value=this._width
				this.contour_options.updateContours()
			}
        }
    })

Object.defineProperty(Contour.prototype,'rgba', 
	{enumerable: true, 
	 get: function() 
		{ 
			var rgba=hex2rgb(this._color); 
			return sprintf("rgba(%d,%d,%d,%0.2f)",255*rgba[0],255*rgba[1],255*rgba[2],rgba[3]); 
		}
	})

Object.defineProperty(Contour.prototype,'color',
    {enumerable: true,
     get: function() { return this._color;},
     set: function(color)
        {
			if( color!=this._color )
			{
				this._color=color
				if( this.colorpicker.value!=this._color ) this.colorpicker.value=this._color
				this.contour_options.updateContours()
			}
        }
    })

function FrameOptions(data_field)
{
	var self=this
	this.data_field=data_field
	this.allow_updates=true

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
	if( this.allow_updates )
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
				this.allow_updates=false

				var renderer=parse_renderer(renderer)
				this.colormap=renderer.colormap
				this.log=renderer.log
				this.min=renderer.min
				this.max=renderer.max
				this.undercolor=renderer.undercolor
				this.overcolor=renderer.overcolor
							
				this.allow_updates=true
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
/*
 * depection.js
 */
function Line(x0,y0,x1,y1)
{	
	this.editable=true;
	this.display=true;
	this.selected=false;
	this.style="#ff0000";
	this.lineWidth=1;
	this.setStart(x0||0,y0||0);
	this.setEnd(x1||0,y1||0);
}

Line.prototype.getEditor = function() { return 'line_editor'; }
Line.prototype.toString = function()
{
	return "Line[("+Math.floor(this.x0)+","+Math.floor(this.y0)+") - ("+Math.floor(this.x1)+","+Math.floor(this.y1)+")]";
}

Line.prototype.setStart = function(x,y)
{
	this.x0=Math.floor(x)+.5;
	this.y0=Math.floor(y)+.5;
}

Line.prototype.setEnd = function(x,y)
{
	this.x1=Math.floor(x)+.5;
	this.y1=Math.floor(y)+.5;
}

Line.prototype.getBounds = function()
{
	return {x: Math.min(this.x0,this.x1),
            y: Math.min(this,y0,this,y0),
            width: Math.abs(this.x0-this.x1),
            height: Math.abs(this.y0-this.y1)};
}

Line.prototype.call = function(display)
{
	if( this.selected )
	{
		display.paper.beginPath();
    	display.paper.lineWidth = this.lineWidth+1;
		display.paper.strokeStyle='rgba(255,0,0,.5)';
		display.paper.moveTo(this.x0,this.y0);
		display.paper.lineTo(this.x1,this.y1);
		display.paper.stroke();
	}
	display.paper.beginPath();
    display.paper.lineWidth = this.lineWidth;
	display.paper.beginPath();
	display.paper.strokeStyle=this.style;
	display.paper.moveTo(this.x0,this.y0);
	display.paper.lineTo(this.x1,this.y1);
	display.paper.stroke();
}

Line.prototype.clone = function()
{
	var l = new Line(this.x0,this.y0,this.x1,this.y1);
	l.style=this.style;
	return l;
}


function Measure(x0,y0,x1,y1)
{	
	this.editable=true;
	this.display=true;
	this.selected=false;
	this.style="#ff0000";
	this.size=18;
	this.text=""
	this.setStart(x0||0,y0||0);
	this.setEnd(x1||0,y1||0);
}
Measure.prototype = new Line;
Measure.prototype.super_call = Measure.prototype.call;
Measure.prototype.super_setStart = Measure.prototype.setStart;
Measure.prototype.super_setEnd = Measure.prototype.setEnd;

Measure.prototype.measure = function()
{
	var dx=this.x0-this.x1
	var dy=this.y0-this.y1
	var scale=1
	this.length=Math.sqrt(dx*dx+dy*dy);
	this.angle=Math.atan2(Math.abs(dy),Math.abs(dx))
	this.text=sprintf("%0.2f \u2220 %0.2f\u00B0",this.length,this.angle*180/Math.PI);
}

Measure.prototype.setStart  = function(x,y)
{
	this.super_setStart(x,y);
	this.measure();
}

Measure.prototype.setEnd  = function(x,y)
{
	this.super_setEnd(x,y);
	this.measure();
}

Measure.prototype.call = function(display)
{

	// Draw the line
	this.super_call(display);

	display.paper.translate(-display.x,-display.y)
	display.paper.scale(1.0/display.zoom_level,1.0/display.zoom_level);
	
    display.paper.lineWidth = 2
	var x=(this.x1+display.x)*display.zoom_level;
	var y=(this.y1+display.y)*display.zoom_level;
	display.paper.font = '16px sans-serif';
	display.paper.textBaseline = 'middle';
	display.paper.strokeStyle = '#000';
	display.paper.fillStyle = '#ccc';
	display.paper.strokeText(this.text, x, y);
	display.paper.fillText(this.text, x, y);

	display.paper.scale(display.zoom_level,display.zoom_level);
	display.paper.translate(display.x,display.y)
}

Measure.prototype.clone = function()
{
	var l = new Measure(this.x0,this.y0,this.x1,this.y1);
	l.style=this.style;
	l.size=this.size;
	return l;
}

Measure.prototype.toString = function()
{
	return "Measure[("+Math.floor(this.x0)+","+Math.floor(this.y0)+") - ("+Math.floor(this.x1)+","+Math.floor(this.y1)+")]";
}

function Marker(x,y,size)
{
	this.editable=true;
	this.display=true;
	this.selected=false;
	this.size=size||5;
	this.setXY(x,y);
	this.strokeStyle="#000000";
	this.fillStyle="rgba(0,0,0,.5)"
	this.lineJoin="miter";
	this.lineWidth=1;
}

Marker.prototype.getEditor = function() { return 'point_editor'; }

Marker.prototype.toString = function()
{
	return "Marker["+Math.floor(this.x)+","+Math.floor(this.y)+"]";
}

Marker.prototype.setXY = function(x,y)
{
	this.x=Math.floor(x)+.5;
	this.y=Math.floor(y)+.5;
}

Marker.prototype.getBounds = function()
{
	return {x: this.x-this.size,
            y: this.y-3*this.size,
            width: this.size*2,
            height: this.size*3};
}

Marker.prototype.call = function(display)
{
	var p = display.paper;
	if( this.selected )
	{
		p.beginPath();
		p.lineJoin=this.lineJoin;
		p.lineWidth=this.lineWidth+1;
		p.strokeStyle='rgba(255,0,0,.5)';
		p.moveTo(this.x,this.y);
		p.quadraticCurveTo(this.x-this.size,this.y-1.8*this.size,this.x-this.size,this.y-2*this.size)
		p.arc(this.x,this.y-2*this.size,this.size,Math.PI,0);
		p.quadraticCurveTo(this.x+this.size,this.y-1.8*this.size,this.x,this.y)
		p.closePath();
		p.stroke();
	}
	p.beginPath();
	p.lineJoin=this.lineJoin;
	p.strokeStyle=this.strokeStyle;
	p.fillStyle=this.fillStyle;
	p.lineWidth=this.lineWidth;
	p.moveTo(this.x,this.y);
	p.quadraticCurveTo(this.x-this.size,this.y-1.8*this.size,this.x-this.size,this.y-2*this.size)
	p.arc(this.x,this.y-2*this.size,this.size,Math.PI,0);
	p.quadraticCurveTo(this.x+this.size,this.y-1.8*this.size,this.x,this.y)
	p.closePath();
	p.fill();
	p.stroke();
}

Marker.prototype.outline = function(p)
{
	p.moveTo(this.x,this.y);
	p.quadraticCurveTo(this.x-this.size,this.y-1.8*this.size,this.x-this.size,this.y-2*this.size)
	p.arc(this.x,this.y-2*this.size,this.size,Math.PI,0);
	p.quadraticCurveTo(this.x+this.size,this.y-1.8*this.size,this.x,this.y)
	p.closePath();
}

function Circle(x,y,r)
{
	this.editable=true;
	this.r=r||5;
	this.x=x;
	this.y=y;
	this.strokeStyle="#000000";
	this.fillStyle="rgba(0,0,0,.5)"
	this.lineWidth=1;
	this.display=true;
}

Circle.prototype.toString = function()
{
	return "Circle["+Math.floor(this.x)+","+Math.floor(this.y)+" r:"+Math.floor(this.r)+"]";
}


Circle.prototype.getBounds = function()
{
	return {x: this.x-this.r,
            y: this.y-this.r,
            width: 2*r,
            height: 2*r};
}

Circle.prototype.call = function(display)
{
	var p = display.paper;
	p.beginPath();
	p.strokeStyle=this.strokeStyle;
	p.fillStyle=this.fillStyle;
	p.lineWidth=this.lineWidth;
	p.arc(this.x,this.y,this.r,2*Math.PI,0);
	//p.fill();
	p.stroke();
}
	
function Point(x,y)
{
	this.editable=false;
	this.x=x;
	this.y=y;
	this.setXY(x,y);
	this.strokeStyle="#000000";
	this.fillStyle="rgba(255,0,0,.5)"
	this.lineWidth=1;
	this.display=true;
}


Point.prototype.getBounds = function()
{
	return {x: this.x-this.r,
            y: this.y-this.r,
            width: 2*r,
            height: 2*r};
}

Point.prototype.setXY = function(x,y)
{
	this.x=Math.floor(x);
	this.y=Math.floor(y);
}

Point.prototype.call = function(display)
{
	var p = display.paper;
	p.fillStyle=this.fillStyle;
	p.fillRect(this.x,this.y,1,1);
}

function Background(src)
{
	this.editable=false;
	this.name="background";
	this.display=true;
	this.img=new Image()
	this.img.src=src||"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAN1wAADdcBQiibeAAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAAAoSURBVBiVY/z//z8DOtiyZQuGIBOGKhxgABWyYHO4j48PI+2tpr5CAKIuCi6gLUyOAAAAAElFTkSuQmCC"
}

Background.prototype.call = function(display)
{
	var pattern = display.paper.createPattern(this.img,"repeat");
	display.paper.translate(-display.x,-display.y)
	display.paper.scale(1.0/display.zoom_level,1.0/display.zoom_level);
	//display.paper.rect(0,0,display.canvas.width,display.canvas.height);
	display.paper.fillStyle=pattern;
	//display.paper.fill();
	display.paper.fillRect(0,0,display.canvas.width,display.canvas.height);
	display.paper.scale(display.zoom_level,display.zoom_level);
	display.paper.translate(display.x,display.y)
}

function Movie()
{
	this.editable=true;
	this.display=true;
	this.selected=false;
	this.name='movie';
	this.data_fields={}
	this.z_order=[]
	this.expected_frames=0
	this.loaded_frames=0
	this.x=0;
	this.y=0;
	this.frame=0;
	this.last=0;
	this.first=0;
	this.listeners={};
}

Movie.prototype.getEditor = function() { return 'movie_editor'; }

Movie.prototype.getBounds = function()
{
	var width=0;
	var height=0;
	var bounds
	for( var p in this.data_fields )
	{
		bounds=this.data_fields[p].getBounds()
		width=Math.max(width,bounds.width);
		height=Math.max(height,bounds.height);
	}
	return {x: this.x,
            y: this.y,
            width: width,
            height: height};
}

Movie.prototype.addDataField = function(data_field)
{
	var path=data_field.path
	if( path in this.data_fields ) { return; }
	this.data_fields[path]=data_field
	this.z_order.push(path)
	this.last=Math.max(this.last,data_field.frame_count-1)
	this.show()
}

Movie.prototype.removeDataField = function(path)
{
	if( data_field_name in this.data_fields ) 
	{ 
		delete this.data_fields[path]
		var ndx=this.z_order.indexOf(path)
		this.z_order.splice(ndx,1)
		// TODO handle this.last
	}
}

Movie.prototype.reset = function()
{
	for( var i=0; i<this.z_order.length; i++)
	{
		delete(this.data_fields[this.z_order[i]].img);
	}
	this.data_fields={}=[];
	this.frame=0;
	this.last=last||timesteps.length-1;
	this.first=first||0;
}

Movie.prototype.loaded = function(e)
{
	this.loaded_frames++
	if( this.loaded_frames>=this.expected_frames )
	{
		this.expected_frames=0
		this.loaded_frames=0
		this.dispatchEvent('load',e);
	}
}

Movie.prototype.addEventListener = function(type,listener)
{
	if( !(type in this.listeners))
	{
		this.listeners[type]=[];
	}
	this.listeners[type].push(listener);
}

Movie.prototype.dispatchEvent = function(event_name,e)
{
	if(event_name in this.listeners)
	{
		for( var n=0; n<this.listeners[event_name].length; n++)
		{
			this.listeners[event_name][n](e);
		}
	}
}

Movie.prototype.toString = function()
{
	return "Movie";
}

Movie.prototype.call = function(display)
{
	for( var i=0; i<this.z_order.length; i++)
	{
		var df=this.data_fields[this.z_order[i]];
		if( df.visible )
		{
			var images=df.getImages()
			for( var j=0; j<images.length; j++ )
			{
				var image=images[j]
				if( image.opacity>0 )
				{
					display.paper.globalAlpha=image.opacity
					display.paper.drawImage(image.image,this.x,this.y)
				}

			}
		}
	}

	display.paper.globalAlpha=1.0
}

Movie.prototype.next = function(n)
{
	this.frame=Math.min(Math.max(this.frame+(n||1),this.first),this.last)
	this.show();
	if( (n<0 && this.frame==this.first) || (n>0 && this.frame==this.last) )
	{
		this.dispatchEvent('stop');
	}
}

Movie.prototype.previous = function()
{
	this.next(-1);
}

Movie.prototype.show = function()
{
	this.loaded_frames=0
	this.expected_frames=0
	for( var p in this.data_fields )
	{
		this.expected_frames+=this.data_fields[p].loadImages(this.frame)
	}
	if(this.expected_frames==0)
	{
		this.loaded()
	}
}
/*
 * The depiction manager
 */
function DepictionManager(elem,display)
{
	this.elem=elem;
	this.display=display;
	this.depictions=[];
}

DepictionManager.prototype.addDepiction = function (obj,n)
{
	n=n==null?this.depictions.length:n
	this.depictions.splice(n,0,obj);
	if( obj.editable )
	{
//		obj.div=document.createElement('div');
//		obj.div.depiction=obj;
//		obj.div.className='depiction';
//		var self=this;
//		obj.div.addEventListener('click',function(e) {self.selectDepiction(e.target.depiction)}); 
//		obj.div.innerHTML=obj;
//		this.elem.appendChild(obj.div);
//		this.selectDepiction(obj);
	}
}

DepictionManager.prototype.removeDepiction = function (obj)
{
	var ndx;
	while( (ndx=this.depictions.indexOf(obj)) != -1 ) 
	{ 
		var depiction=this.depictions[ndx];
		this.depictions.splice(ndx,1); 
		if( depiction.div )
		{
			depiction.div.parentElement.removeChild(depiction.div);
		}
	}
}

DepictionManager.prototype.selectDepiction = function(obj)
{
	for( var i=0; i<this.depictions.length; i++)
	{
		var d=this.depictions[i];
		if( d.div )
		{
			if( obj===d )
			{
				add_class(d.div,'selected');
				document.getElementById(d.getEditor()).style.display='block';
				d.selected=true;
			}
			else
			{
				remove_class(d.div,'selected');
				d.selected=false;
			}
		}
	}	
	this.display.redraw();
}

/*
 *  display.js
 *  Main Display object
 */

/*
 *  The display object
 */
function Display(elem,depiction_elem,data_field_elem,status_elem)
{
	var self=this

	// Our internal state
	this.w=0;
	this.h=0;
	this.x=0;
	this.y=0;
	this.zoom_level=1.0;
	this.smooth=false;

	// Add a stylesheet
	add_stylesheet("display.css");

	// create the depiction manager
	this.depiction_mgr=new DepictionManager(depiction_elem,this)

	// create the data field mananger
	this.data_field_mgr=new DataFieldManager(data_field_elem,this)
	Object.defineProperty(this,'reference_data_field',{ get: function() { return self.data_field_mgr.reference_data_field } } )

	// create the status manager
	this.status_mgr=new StatusManager(status_elem,this)
	this.status_mgr.add_status('fps')
	this.status_mgr.add_status('frame')
	this.status_mgr.add_status('time')
	this.status_mgr.add_status('xy')
	this.status_mgr.add_status('dimensional_xy','dimensional xy','xy')

	// Make the canvas
	this.canvas=document.createElement("canvas");
	this.paper=this.canvas.getContext('2d');
	this.canvas.width=100;
	this.canvas.height=100;
	this.canvas.tabIndex=0;
	add_class(this.canvas,"wallander_canvas");
	this.container=document.createElement("div");
	add_class(this.container,"wallander_container");
	this.container.appendChild(this.canvas);
	elem.appendChild(this.container);
	this.controls=document.createElement("div");
	add_class(this.controls,"wallander_controls");
	elem.appendChild(this.controls);	
	this.info=document.createElement("div");
	add_class(this.info,"wallander_info");
	elem.appendChild(this.info);
	this.info_status=document.createElement("div");
	add_class(this.info_status,"wallander_info_status");
	this.info.appendChild(this.info_status);
	this.model_info=document.createElement("div");
	add_class(this.info,"wallander_info");
	this.info.appendChild(this.model_info);

	// create the projector
	this.projector=new Projector(this)

	// create the toolbox
	this.tool=null;
	this.toolbox=new ToolBox(this);


	// Register some events
	var self=this;
	this.container.addEventListener('mouseup',function() { self.resize(); }); 
	this.canvas.addEventListener('mouseclick', function(e) { self.tool.mouseclick(self,e); });
	this.canvas.addEventListener('mousedown', function(e) { self.tool.mousedown(self,e); });
	this.canvas.addEventListener('mouseup',function(e) {self.tool.mouseup(self,e);});
	this.canvas.addEventListener('mousemove',function(e) {self.tool.mousemove(self,e);});
	this.canvas.addEventListener('mousemove',function(e) {self.updateXY(e);});
	this.canvas.addEventListener('mouseout',function(e) {self.tool.mouseout(self,e);});
	this.canvas.addEventListener('mousewheel',function(e) {self.tool.mousewheel(self,e);});
	this.canvas.addEventListener('keydown',function(e) {self.tool.keydown(self,e);});
	this.canvas.addEventListener('keyup',function(e) {self.tool.keyup(self,e);});
	this.resize();
	var rect = this.canvas.getBoundingClientRect();
	this.lastXY=this.xy({clientX:rect.left,clientY:rect.top})
	this.updateXY()
	this.projector.updateStatus()
}

Display.prototype.toString = function()
{
	return "Display[canvas#"+this.canvas.id+"]";
}

Display.prototype.restoreState = function(name,callback)
{
	var self=this
	console.log("Restoring state "+name)
	jsonCall('/wallander/s/'+name,function(state,callback) { self.stateRestored(state,callback) },callback)	
}

Display.prototype.stateRestored = function(state,callback)
{
	this.deserialize(state,callback)
}

Display.prototype.saveState = function()
{
	var self=this
	jsonCall('/wallander/s',function(name) { self.stateSaved(name) },null,this.serialize())	
}

Display.prototype.stateSaved = function(name)
{
	console.log("State saved as "+name)
}

Display.prototype.serialize = function()
{
	state={}
	state.status_mgr=display.status_mgr.serialize()
	state.data_field_mgr=display.data_field_mgr.serialize()
	return JSON.stringify(state)	
}

Display.prototype.deserialize = function(state,callback)
{
	if( typeof(state)=='string' )	
	{
		state=JSON.parse(serialized_obj)
	}
	console.log(state)
	this.status_mgr.deserialize(state.status_mgr)
	this.data_field_mgr.deserialize(state.data_field_mgr,callback)
}

Display.prototype.updateXY = function(e)
{
	var self=this
	// Update the XY locations
	var xy=this.lastXY=e?this.xy(e):this.lastXY
	xy.x=Math.floor(xy.x)
	xy.y=Math.floor(xy.y)
	var fmt="%s"
	var dfxy={x:'-',y:'-'}
	var unit=''
	if( this.data_field_mgr.reference_data_field )
	{
		var df=this.data_field_mgr.reference_data_field
		dfxy=df.xy(xy.x,xy.y)
		fmt=df.dimension_format
		unit=df.dimension_unit
	}
	
	this.status_mgr.set_status('xy','('+xy.x+','+xy.y+')')

	var status_string=sprintf('('+fmt+' <span class="label">%s</span>,'+fmt+' <span class="label">%s</span>)',dfxy.x,unit,dfxy.y,unit)
	this.status_mgr.set_status('dimensional_xy',status_string)
	if( this.projector && !this.projector.playing )
	{
		this.data_field_mgr.updateXY(this.projector.movie.frame,xy.x,xy.y)
	}
}


Display.prototype.addDataField = function (df)
{
	this.data_field_mgr.addDataField(df)
}

Display.prototype.addDepiction = function (obj,n)
{
	this.depiction_mgr.addDepiction(obj,n);
}

Display.prototype.removeDepiction = function (obj)
{
	this.depiction_mgr.removeDepiction(obj);
}

Display.prototype.selectDepiction = function(obj)
{
	this.depiction_mgr.selectDepiction(obj);
}

Display.prototype.setSize = function (w,h)
{
	this.container.style.width=w+"px";
	this.container.style.height=h+"px";
	this.resize();
}

Display.prototype.save = function()
{
	window.open(this.canvas.toDataURL())
}

Display.prototype.resize = function ()
{
	var s=window.getComputedStyle(this.container);
	this.canvas.width=this.container.clientWidth-parseInt(s.getPropertyValue('padding-left'))-parseInt(s.getPropertyValue('padding-right'));
	this.canvas.height=this.container.clientHeight-parseInt(s.getPropertyValue('padding-top'))-parseInt(s.getPropertyValue('padding-bottom'));;
	this.canvas.style.width=this.canvas.width+"px";
	this.canvas.style.height=this.canvas.height+"px";
	this.w=this.canvas.width/this.zoom_level;
	this.h=this.canvas.width/this.zoom_level;
	this.redraw();
}

Display.prototype.getBounds = function()
{
	var top=Number.MAX_VALUE;
	var bottom=Number.MIN_VALUE;
	var left=Number.MAX_VALUE;
	var right=Number.MIN_VALUE;
	var bounds=null;

	for( var i=0; i<this.depictions.length; i++)
	{
		if( this.depictions[i].getBounds )
		{
			bounds=this.depictions[i].getBounds();
			top=Math.min(top,bounds.y);
			left=Math.min(left,bounds.x);
			bottom=Math.max(bottom,bounds.y+bounds.height);
			right=Math.max(right,bounds.x+bounds.width);
		}
	}
	var width=right-left;
	var height=bottom-top;
	return {x: left,
            y: top,
            width: width,
            height: height};
}

Display.prototype.reset = function()
{
	var bounds=this.getBounds();
	console.log(bounds);
	this.w=bounds.width;
	this.h=bounds.height;
	this.canvas.width=this.w;
	this.canvas.height=this.h;
	this.canvas.style.width=this.w+"px";
	this.canvas.style.height=this.h+"px";
	this.x=bounds.x;
	this.y=bounds.y;
	this.zoom_level=1.0;
	this.redraw();
}

Display.prototype.xy = function(e)
{
	var rect = this.canvas.getBoundingClientRect();
	var x=(e.clientX-rect.left)/this.zoom_level-this.x;
	var y=(e.clientY-rect.top)/this.zoom_level-this.y;
	return {'x':x,'y':y};
}

Display.prototype.zoom = function(n,x,y)
{ 
	if( x!=null )
	{
		this.x=(x+this.x)*this.zoom_level/n-x;
		this.y=(y+this.y)*this.zoom_level/n-y;
	}
	this.zoom_level=n;
	this.w=this.canvas.width/this.zoom_level;
	this.h=this.canvas.width/this.zoom_level;
	this.redraw();
}

Display.prototype.redraw = function()
{
	// Reset the canvas
	this.canvas.width=this.canvas.width;
	// We like chunky bitmaps
	this.paper.imageSmoothingEnabled=this.smooth;
	this.paper.scale(this.zoom_level,this.zoom_level); 
	this.paper.translate(this.x,this.y);
	for( var i=0; i<this.depiction_mgr.depictions.length; i++)
	{
		if( this.depiction_mgr.depictions[i].display )
		{
			this.depiction_mgr.depictions[i].call(this);
		}
	}
}


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


	// Setup the controls
	this.controls=document.createElement("div");
	add_class(this.controls,"wallander_projector_controls");
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
	remove_class(this.controls,"wallander_playing")
	this.frameTime=-1
}

Projector.prototype.play = function()
{
	this.playing=true;
	this.btn_play.style.display='none';
	this.btn_pause.style.display='';
	add_class(this.controls,"wallander_playing")
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

Projector.prototype.updateStatus = function()
{
	var frame=this.movie.frame
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


/*
 * sprintf.js
 */
;
(function(win) {
    var re = {
        not_string: /[^s]/,
        number: /[def]/,
        text: /^[^\x25]+/,
        modulo: /^\x25{2}/,
/*        placeholder: /^\x25(?:([1-9]\d*)\$|\(([^\)]+)\))?(\+)?(0|'[^$])?(-)?(\d+)?(?:\.(\d+))?([b-fosuxX])/, */
        placeholder: /^\x25(?:([1-9]\d*)\$|\(([^\)]+)\))?(?:(_[., ]?))?(\+)?(0|'[^$])?(-)?(\d+)?(?:\.(\d+))?([b-fosuxX])/,
        key: /^([a-z_][a-z_\d]*)/i,
        key_access: /^\.([a-z_][a-z_\d]*)/i,
        index_access: /^\[(\d+)\]/,
        sign: /^[\+\-]/
    }

    function sprintf() {
        var key = arguments[0], cache = sprintf.cache
        if (!(cache[key] && cache.hasOwnProperty(key))) {
            cache[key] = sprintf.parse(key)
        }
        return sprintf.format.call(null, cache[key], arguments)
    }

    sprintf.format = function(parse_tree, argv) {
        var cursor = 1, tree_length = parse_tree.length, node_type = "", arg, output = [], i, k, match, pad, pad_character, pad_length, is_positive = true, sign = ""
        for (i = 0; i < tree_length; i++) {
            node_type = get_type(parse_tree[i])
            if (node_type === "string") {
                output[output.length] = parse_tree[i]
            }
            else if (node_type === "array") {
                match = parse_tree[i] // convenience purposes only
                if (match[2]) { // keyword argument
                    arg = argv[cursor]
                    for (k = 0; k < match[2].length; k++) {
                        if (!arg.hasOwnProperty(match[2][k])) {
                            throw new Error(sprintf("[sprintf] property '%s' does not exist", match[2][k]))
                        }
                        arg = arg[match[2][k]]
                    }
                }
                else if (match[1]) { // positional argument (explicit)
                    arg = argv[match[1]]
                }
                else { // positional argument (implicit)
                    arg = argv[cursor++]
                }

                if (get_type(arg) == "function") {
                    arg = arg()
                }

                if (re.not_string.test(match[9]) && (get_type(arg) != "number" && isNaN(arg))) {
                    throw new TypeError(sprintf("[sprintf] expecting number but found %s", get_type(arg)))
                }

				sign=""
				is_positive = re.number.test(match[9]) ? arg >= 0 : true

                switch (match[9]) {
                    case "b":
                        arg = arg.toString(2)
                    break
                    case "c":
                        arg = String.fromCharCode(arg)
                    break
                    case "d":
                        arg = parseInt(arg, 10).toString()
                    break
                    case "e":
                        arg = match[8] ? arg.toExponential(match[8]) : arg.toExponential()
                    break
                    case "f":
                        arg = match[8] ? parseFloat(arg).toFixed(match[8]) : parseFloat(arg).toString()
                    break
                    case "o":
                        arg = arg.toString(8)
                    break
                    case "s":
                        arg = ((arg = String(arg)) && match[8] ? arg.substring(0, match[8]) : arg)
                    break
                    case "u":
                        arg = arg >>> 0
                    break
                    case "x":
                        arg = arg.toString(16)
                    break
                    case "X":
                        arg = arg.toString(16).toUpperCase()
                    break
                }
				if( match[3] && (match[9]=='d' || match[9]=='f')) {
					seperator = match[3].length>1 ? match[3][1] : '\u2006'
					var dp = arg.indexOf('.')
					dp = dp<0 ? arg.length : dp
					// Seperate the the numbers to the left of the decimal point
					for (n=dp-3; n>0; n-=3)
					{
						arg=arg.substring(0,n)+seperator+arg.substring(n)	
					}
				}
                if (!is_positive || (re.number.test(match[9]) && match[4])) {
                    sign = is_positive ? "+" : "-"
                    arg = arg.toString().replace(re.sign, "")
                }
                pad_character = match[5] ? match[5] == "0" ? "0" : match[5].charAt(1) : " "
                pad_length = match[7] - (sign + arg).length
                pad = match[7] ? str_repeat(pad_character, pad_length) : ""
                output[output.length] = match[6] ? sign + arg + pad : (pad_character == 0 ? sign + pad + arg : pad + sign + arg)
            }
        }
        return output.join("")
    }

    sprintf.cache = {}

    sprintf.parse = function(fmt) {
        var _fmt = fmt, match = [], parse_tree = [], arg_names = 0
        while (_fmt) {
            if ((match = re.text.exec(_fmt)) !== null) {
                parse_tree[parse_tree.length] = match[0]
            }
            else if ((match = re.modulo.exec(_fmt)) !== null) {
                parse_tree[parse_tree.length] = "%"
            }
            else if ((match = re.placeholder.exec(_fmt)) !== null) {
                if (match[2]) {
                    arg_names |= 1
                    var field_list = [], replacement_field = match[2], field_match = []
                    if ((field_match = re.key.exec(replacement_field)) !== null) {
                        field_list[field_list.length] = field_match[1]
                        while ((replacement_field = replacement_field.substring(field_match[0].length)) !== "") {
                            if ((field_match = re.key_access.exec(replacement_field)) !== null) {
                                field_list[field_list.length] = field_match[1]
                            }
                            else if ((field_match = re.index_access.exec(replacement_field)) !== null) {
                                field_list[field_list.length] = field_match[1]
                            }
                            else {
                                throw new SyntaxError("[sprintf] failed to parse named argument key")
                            }
                        }
                    }
                    else {
                        throw new SyntaxError("[sprintf] failed to parse named argument key")
                    }
                    match[2] = field_list
                }
                else {
                    arg_names |= 2
                }
                if (arg_names === 3) {
                    throw new Error("[sprintf] mixing positional and named placeholders is not (yet) supported")
                }
                parse_tree[parse_tree.length] = match
            }
            else {
                throw new SyntaxError("[sprintf] unexpected placeholder")
            }
            _fmt = _fmt.substring(match[0].length)
        }
        return parse_tree
    }

    var vsprintf = function(fmt, argv, _argv) {
        _argv = (argv || []).slice(0)
        _argv.splice(0, 0, fmt)
        return sprintf.apply(null, _argv)
    }

    /**
     * helpers
     */
    function get_type(variable) {
        return Object.prototype.toString.call(variable).slice(8, -1).toLowerCase()
    }

    function str_repeat(input, multiplier) {
        return Array(multiplier + 1).join(input)
    }

    /**
     * export to either browser or node.js
     */
    if (typeof exports !== "undefined") {
        exports.sprintf = sprintf
        exports.vsprintf = vsprintf
    }
    else {
        win.sprintf = sprintf
        win.vsprintf = vsprintf

        if (typeof define === "function" && define.amd) {
            define(function() {
                return {
                    sprintf: sprintf,
                    vsprintf: vsprintf
                }
            })
        }
    }
})(typeof window === "undefined" ? this : window)
/* 
 * The status manager 
 */
function StatusManager(elem,display)
{
	this.elem=elem
	this.display=display
	this.status_bar=document.createElement('div')
	this.status_editor_table=document.createElement('table')
	this.status_editor_table.style.display='block'
	this.dropdown=new Dropdown(this.status_bar,this.status_editor_table)
	this.elem.appendChild(this.status_bar)
	this.elem.appendChild(this.status_editor_table)
	this.status_names=[]
	this.statuses={}
}

StatusManager.prototype.add_status = function(name,display_name,short_name)
{
	var status=new Status(this.status_bar,this.status_editor_table,name,display_name,short_name)
	this.statuses[name]=status
}

StatusManager.prototype.set_status = function(name,value)
{
	if( name in this.statuses )
	{
		this.statuses[name].value=value
	}
}

StatusManager.prototype.serialize = function()
{
	var status_visibility={}
	for( var status_name in this.statuses) 
	{
		status_visibility[status_name]=this.statuses[status_name].visibility
	}
	return status_visibility
}

StatusManager.prototype.deserialize = function(status_visibility)
{
	for( var status_name in status_visibility) 
	{
		console.log(status_name+".visibility = "+status_visibility[status_name] )
		this.statuses[status_name].visibility=status_visibility[status_name]
	}
}


function Status(status_bar,status_editors,name,display_name,short_name)
{
	var self=this
	this._visibility=true

	this.name_span=document.createElement('span')
	this.name_span.className='label'
	this.name_span.innerHTML=(short_name || display_name || name) + ' : '

	this.value_span=document.createElement('span')
	this.value_span.className='value'
	this.value_span.innerHTML="-"
	
	this.envelope=document.createElement('span')
	this.envelope.appendChild(this.name_span)
	this.envelope.appendChild(this.value_span)

	status_bar.appendChild(document.createTextNode('\n'))
	status_bar.appendChild(this.envelope)

	var status_editor_row=document.createElement('tr')
	var status_editor_cell=document.createElement('td')
	status_editor_row.appendChild(status_editor_cell)

	this.checkbox=document.createElement('input')
	this.checkbox.type='checkbox'
	this.checkbox.checked=true
	this.checkbox.addEventListener('change',function(e) { self.visibility=e.target.checked } )

	var label=document.createElement('label')
	label.appendChild(this.checkbox)
	label.appendChild(document.createTextNode(display_name||name))
	status_editor_cell.appendChild(label)

	this.status_editor=document.createElement('td')
	this.status_editor.style.whiteSpace='nowrap'
	status_editor_row.appendChild(this.status_editor)
	
	status_editors.appendChild(status_editor_row)
}

Object.defineProperty(Status.prototype,'visibility',
    {enumerable: true,
     get: function() { return this._visibility;},
     set: function(visibility)
        {
			if( visibility!=this._visibility )
			{
				if( typeof(visibility)!='boolean' ) throw new Error ('visibility must be a boolean not a ' + typeof(visibility) + ' : '+visibility)
				this._visibility=visibility
				if( this.checkbox.checked!=this._visibility ) this.checkbox.checked=this._visibility
				this.envelope.style.display=this._visibility?'':'none'
			}
        }
    })

Object.defineProperty(Status.prototype,'value',
    {enumerable: true,
     get: function() { return this.value_span.innerHTML;},
     set: function(value)
        {
			if( this.value_span.innerHTML!=value )
			{
				this.value_span.innerHTML=value
			}
        }
    })
/* 
 * toolbox.js
 */
function ToolBox(display)
{
	var self=this;
	this.display=display;
	this.toolbox_elem=document.createElement('div');
	this.toolbox_elem.className="toolbox";
	this.toolset_elem=document.createElement('div');
	this.toolset_elem.className="toolset";
	this.toolset_elem.style.left_margin="-100%"
	this.toolbox_elem.appendChild(this.toolset_elem);
	this.handle_elem=document.createElement('div');
	this.handle_elem.className="handle";
	this.toolbox_elem.appendChild(this.handle_elem);
	this.handle_elem.addEventListener('click',function(e) { self.click(e); });
	this.handle_elem.innerHTML="&#187;";

	this.addTool(new DataProviderTool());
	var move_tool=new MoveTool();
	this.addTool(move_tool);
	add_class(move_tool.html_img,'selected');
	this.default_tool=move_tool
	display.tool=move_tool
	this.display.tool=move_tool;	
	this.addTool(new ProjectorTool(display.projector));
	this.addTool(new MarkerTool());
	this.addTool(new MeasureTool());
	this.addTool(new CompassTool());
	this.addTool(new ZoomTool());
	this.addTool(new LineTool());
	this.addTool(new DrawTool());

	add_stylesheet("tools.css");	

	document.body.appendChild(this.toolbox_elem);
}

ToolBox.prototype.close=function()
{
	this.toolset_elem.style.marginLeft="-100%"
	this.handle_elem.innerHTML="&#187;"
}

ToolBox.prototype.open=function()
{
	this.handle_elem.innerHTML="&#171;"
	this.toolset_elem.style.marginLeft="0px"
}

ToolBox.prototype.click=function(e)
{
	e.stopPropagation();
	e.preventDefault();
	this.toggle();
}

ToolBox.prototype.toggle=function()
{
	if( this.toolset_elem.style.marginLeft!="0px" ) 
	{
		this.open()
	}
	else
	{
		this.close()
	}
	return false;
}

ToolBox.prototype.addTool=function(tool)
{	
	var self=this;
	var img=new Image()
	img.src=get_img_url(tool.getIcon());
	img.width=32;
	img.height=32;
	img.alt=tool.getName();
	img.className="tool_"+tool.getName().replace(' ','_');
	img.addEventListener('click',function(e) { self.toolClick(e); });
	img.tool=tool;
	tool.html_img=img
	this.toolset_elem.appendChild(img);
}

ToolBox.prototype.toolClick=function(e)
{
	this.display.tool.unselected(display);	
	remove_class(this.display.tool.html_img,'selected');
	this.display.tool=e.target.tool;
	this.display.tool.selected(display);
	add_class(this.display.tool.html_img,'selected');
}

//
// The abstract tool 
//
function AbstractTool()
{
}
AbstractTool.prototype.getName = function() { return "abstract"; }
AbstractTool.prototype.getIcon = function() { return ""; }
AbstractTool.prototype.selected = function(display) {}
AbstractTool.prototype.unselected = function(display) {}
AbstractTool.prototype.mouseclick = function(display,e) {}
AbstractTool.prototype.mousedown = function(display,e) {}
AbstractTool.prototype.mouseup = function(display,e) {}
AbstractTool.prototype.mousemove = function(display,e) {}
AbstractTool.prototype.mouseout = function(display,e) {}
AbstractTool.prototype.mousewheel = function(display,e) {}
AbstractTool.prototype.keydown = function(display,e) {}
AbstractTool.prototype.keyup = function(display,e) {}

// 
// The model selection tool
//
function DataProviderTool()
{
}
DataProviderTool.prototype = new AbstractTool;
DataProviderTool.prototype.getIcon = function(display,e) { return "data_provider.svg"; }
DataProviderTool.prototype.getName = function() { return "data provider"; }
DataProviderTool.prototype.selected = function(display) { show_dialog(); }

// 
// The model selection tool
//
function ModelTool()
{
}
ModelTool.prototype = new AbstractTool;
ModelTool.prototype.getIcon = function(display,e) { return "globe.svg"; }
ModelTool.prototype.getName = function() { return "model"; }

//
// The move tool
//
function MoveTool()
{
	this.mousedrag=false;
	this.mousex=0;
	this.mousey=0;
}
MoveTool.prototype = new AbstractTool;
MoveTool.prototype.getIcon = function(display,e) { return "cursor.svg"; }
MoveTool.prototype.getName = function() { return "move"; }

MoveTool.prototype.mousedown = function(display,e)
{
	display.canvas.style.cursor="move";
	this.mousedrag=true;
	this.mousex=e.clientX;
	this.mousey=e.clientY;
}

MoveTool.prototype.mouseup = function(display,e)
{
	display.canvas.style.cursor="default";
	this.mousedrag=false;
	this.mousex=0;
	this.mousey=0;
}

MoveTool.prototype.mousemove = function(display,e)
{
	if(!this.mousedrag) {return;}
	display.x+=(e.clientX-this.mousex)/display.zoom_level;
	display.y+=(e.clientY-this.mousey)/display.zoom_level;
	this.mousex=e.clientX;
	this.mousey=e.clientY;
	display.redraw();
}

MoveTool.prototype.mousewheel = function(display,e)
{
	var p=display.xy(e);
	e.stopPropagation();
	e.preventDefault();
	display.zoom(display.zoom_level*Math.pow(2,(e.wheelDelta/(2*Math.abs(e.wheelDelta)))),p.x,p.y);
}

//
// An abstract for tools that want to be moveable
//
function Movable()
{
}
Movable.prototype = new MoveTool;
Movable.prototype.super = new MoveTool;
Movable.prototype.mousedown = function(display,e)
{
	var self=this;
	this.timeout=setTimeout(function() { self._startDrag(display,e); },150);
}
Movable.prototype._startDrag = function(display,e)
{
	this.timeout=0;
	this.startDrag(display,e);
	this.super.mousedown.call(this,display,e);
	display.redraw();
}

Movable.prototype.mouseup = function(display,e)
{
	if( this.timeout )
	{
		clearTimeout(this.timeout);
		this.click(display,e);
	}
	else
	{
		this.super.mouseup.call(this,display,e);
		this.endDrag(display,e);
	}
}

Movable.prototype.mousemove = function(display,e)
{
	if(this.mousedrag) 
	{ 
		this.super.mousemove.call(this,display,e); 
	}
	else
	{
		this.move(display,e);
	}
}

// The methods that should be overriden
Movable.prototype.startDrag = function(display,e) {}
Movable.prototype.endDrag = function(display,e) {}
Movable.prototype.click = function(display,e) {}
Movable.prototype.move = function(display,e) {}

//
// The projector tool
//
function ProjectorTool(projector)
{
	this.projector=projector;

}
ProjectorTool.prototype = new Movable;
ProjectorTool.prototype.getIcon = function(display,e) { return "film.svg"; }
ProjectorTool.prototype.getName = function() { return "projector"; }
ProjectorTool.prototype.selected = function(display) 
{ 
	display.canvas.style.cursor="default"; 
}

//
// The marker tool
//
function MarkerTool()
{
	this.marker=new Marker(0,0);
    this.marker.editable=false;
}
MarkerTool.prototype = new Movable;
MarkerTool.prototype.getIcon = function(display,e) { return "marker.svg"; }
MarkerTool.prototype.getName = function() { return "marker"; }
MarkerTool.prototype.selected = function(display) 
{ 
	display.canvas.style.cursor="none"; 
	display.addDepiction(this.marker);
}
MarkerTool.prototype.unselected = function(display) 
{ 
	display.canvas.style.cursor="default"; 
	display.removeDepiction(this.marker);
}

MarkerTool.prototype.mouseout = function(display,e)
{
	this.marker.display=false;
	display.redraw();
}

MarkerTool.prototype.startDrag = function(display,e)
{
	this.marker.display=false;
}

MarkerTool.prototype.endDrag = function(display,e)
{
	this.move(display,e);	
}

MarkerTool.prototype.click = function(display,e)
{
	var p=display.xy(e);
	display.addDepiction(new Marker(p.x,p.y));
	display.redraw();
}

MarkerTool.prototype.move = function(display,e)
{
	display.canvas.style.cursor="none"; 
	var p=display.xy(e);
	this.marker.display=true;
	this.marker.setXY(p.x,p.y);
	display.redraw();
}

//
// The line tool
//
function LineTool(color)
{
	this.color=color || "#ff0000";
	this.line=new Line();
	this.line.display=false;
	this.line.editable=false;
	this.line.style="rgba(255,0,0,1.0)";
    this.p={x:0,y:0};
}
LineTool.prototype = new Movable;
LineTool.prototype.getIcon = function(display,e) { return "line_draw.svg"; }
LineTool.prototype.getName = function() { return "line draw"; }

LineTool.prototype.selected = function(display) 
{ 
	display.addDepiction(this.line);
}

LineTool.prototype.unselected = function(display) 
{ 
	display.removeDepiction(this.line);
}

LineTool.prototype.keyup = function(display,e) 
{
	if( this.line.display && !e.shiftKey )
	{
		this.line.setEnd(this.p.x,this.p.y);
		display.redraw();
	}
}

LineTool.prototype.keydown = function(display,e) 
{
	if( this.line.display )
	{
		if( e.shiftKey )
		{
			var p={x: this.line.x1, y: this.line.y1}
			this.orthoginalize(p);
			this.line.setEnd(p.x,p.y);
			display.redraw();
		}
	}
}

LineTool.prototype.orthoginalize = function(p)
{
	if(Math.abs(this.line.x0-p.x)>Math.abs(this.line.y0-p.y))
	{
		p.y=this.line.y0;
	}
	else
	{
		p.x=this.line.x0;
	}
}

LineTool.prototype.click = function(display,e)
{
	var p=display.xy(e);
	if(!this.line.display)
	{
		this.line.setStart(p.x,p.y);
		this.line.setEnd(p.x,p.y);
		this.line.display=true;
		display.canvas.style.cursor="none";
	}
	else
	{
		this.line.display=false;
        var line=this.line.clone();
	    display.addDepiction(line);
		display.canvas.style.cursor="default";
	}
	
	display.redraw();
}

LineTool.prototype.endDrag = function(display,e)
{
	display.canvas.style.cursor="default";
	if( this.line.display )
	{
		display.canvas.style.cursor="none";
	}
}


LineTool.prototype.move = function(display,e)
{
	var p=display.xy(e);
	this.p={x: p.x, y: p.y};
	if(this.line.display)
	{
		if( e.shiftKey )
		{
			this.orthoginalize(p);
		}
		this.line.setEnd(p.x,p.y);
		display.redraw();
	}
}

//
// The draw tool
//
function DrawTool(color)
{
	this.color=color || "#ff0000";
	this.line=null;
}
DrawTool.prototype = new AbstractTool;
DrawTool.prototype.getIcon = function(display,e) { return "free_draw.svg"; }
DrawTool.prototype.getName = function() { return "free draw"; }

//
// The zoom tool
//
function ZoomTool(color)
{
	this.color=color || "#ff0000";
	this.line=null;
}
ZoomTool.prototype = new AbstractTool;
ZoomTool.prototype.getIcon = function(display,e) { return "zoom.svg"; }
ZoomTool.prototype.getName = function() { return "zoom"; }

//
// The measure tool
//
function MeasureTool(color)
{
	this.color=color || "#ff0000";
	this.line=new Measure();
	this.line.display=false;
	this.line.editable=false;
	this.line.style="rgba(255,0,0,0.5)";
	this.p={x:0,y:0};
}
MeasureTool.prototype = new LineTool;
MeasureTool.prototype.getIcon = function(display,e) { return "measure.svg"; }
MeasureTool.prototype.getName = function() { return "measure"; }

//
// The compass tool
//
function CompassTool(color)
{
	this.color=color || "#ff0000";
	this.line=null;
	this.points=[];
	this.circle=new Circle(0,0);
	this.circle.display=false;
}
CompassTool.prototype = new Movable;
CompassTool.prototype.getIcon = function(display,e) { return "compass.svg"; }
CompassTool.prototype.getName = function() { return "compass"; }

CompassTool.prototype.selected = function(display) 
{
	display.addDepiction(this.circle);
}

CompassTool.prototype.unselected = function(display) 
{ 
	for(var n=0; n<this.points.length; n++)
	{
		display.removeDepiction(this.points[n]);
	}
	this.point=[];
	display.removeDepiction(this.circle);
	display.redraw();
}

CompassTool.prototype.recalculate = function()
{
// http://www.dtcenter.org/met/users/docs/write_ups/circle_fit.pdf
	var N=this.points.length;
	if( N>2 )
	{
		var xbar=0;
		var ybar=0;
		for(var n=0; n<N; n++)
		{
			xbar+=this.points[n].x;
			ybar+=this.points[n].y;
		}
		xbar/=N;
		ybar/=N;
		var u=[];
		var v=[];
		var Suu=0;
		var Svv=0;
		var Suv=0;
		var Suuu=0;
		var Svvv=0;
		var Suvv=0;
		var Svuu=0;
		for(var n=0; n<N; n++)
		{
			u[n]=this.points[n].x-xbar;
			v[n]=this.points[n].y-ybar;
			Suu+=u[n]*u[n];
			Svv+=v[n]*v[n];
			Suv+=u[n]*v[n];
			Suuu+=u[n]*u[n]*u[n];
			Svvv+=v[n]*v[n]*v[n];
			Suvv+=u[n]*v[n]*v[n];
			Svuu+=v[n]*u[n]*u[n];
		}
		var uc=.5*(Svv*(Suuu+Suvv)-Suv*(Svvv+Svuu))/(Suu*Svv-Suv*Suv);
		var vc=(.5*(Suuu+Suvv)-uc*Suu)/Suv;
		var xc=uc+xbar;
		var yc=vc+ybar;
		var r=Math.sqrt(uc*uc+vc*vc+(Suu+Svv)/N)
		this.circle.x=xc;
		this.circle.y=yc;
		this.circle.r=r;
		this.circle.display=true;
	}
}

CompassTool.prototype.click = function(display,e)
{
	var p=display.xy(e);
	var point=new Point(p.x,p.y);
	this.points.push(point);
	display.addDepiction(point);
	this.recalculate();
	display.redraw();
}

function fit_circle(points)
{
	var N=points.length;
	if( N>2 )
	{
		var xbar=0;
		var ybar=0;
		for(var n=0; n<N; n++)
		{
			xbar+=points[n].x;
			ybar+=points[n].y;
		}
		xbar/=N;
		ybar/=N;
		var u=[];
		var v=[];
		var Suu=0;
		var Svv=0;
		var Suv=0;
		var Suuu=0;
		var Svvv=0;
		var Suvv=0;
		var Svuu=0;
		for(var n=0; n<N; n++)
		{
			u[n]=points[n].x-xbar;
			v[n]=points[n].y-ybar;
			Suu+=u[n]*u[n];
			Svv+=v[n]*v[n];
			Suv+=u[n]*v[n];
			Suuu+=u[n]*u[n]*u[n];
			Svvv+=v[n]*v[n]*v[n];
			Suvv+=u[n]*v[n]*v[n];
			Svuu+=v[n]*u[n]*u[n];
		}
		var uc=.5*(Svv*(Suuu+Suvv)-Suv*(Svvv+Svuu))/(Suu*Svv-Suv*Suv);
		var vc=(.5*(Suuu+Suvv)-uc*Suu)/Suv;
		var xc=uc+xbar;
		var yc=vc+ybar;
		var r=Math.sqrt(uc*uc+vc*vc+(Suu+Svv)/N)
	}
	
}
var script_src=document.currentScript.src;
var path=script_src.substring(0,script_src.lastIndexOf('/')+1)+'../'
var img_path=path+'img/'
var css_path=path+'css/'

function toggle_class(node,classname1,classname2)
{
	/* if classname1 exists */
	if( node.className.search( re=new RegExp('\\b'+classname1+'\\b','g')) >-1 )
	{
		node.className=node.className.replace( re,'')
		node.className=node.className+' '+classname2;
		node.className=node.className.replace( /\s{2,}/g,' ')
	}
	/* if classname 2 exists */
	else if( node.className.search( re=new RegExp('\\b'+classname2+'\\b','g')) >-1 )
	{
		node.className=node.className.replace( re,'')
		node.className=node.className+' '+classname1;
		node.className=node.className.replace( /\s{2,}/g,' ')
	}
}

function add_class(node,classname)
{
	var cn=node.className;
	if( cn.search( new RegExp('\\b'+classname+'\\b')) == -1 )
	{
		node.className=cn+' '+classname;
	}
}

function remove_class(node,classname)
{
	node.className=node.className.replace( new RegExp('\\b'+classname+'\\b','g'),'')
	node.className=node.className.replace( /\s{2,}/g,' ')
}

function has_class(node,classname)
{
	return node.className.search( new RegExp('\\b'+classname+'\\b')) > -1 
}

function add_stylesheet(stylesheet)
{
	var style=document.createElement('link');
	style.rel="stylesheet";
	style.href=css_path+stylesheet;
	document.head.appendChild(style);
}

function get_img_url(img)
{
	return img_path+img;
}


