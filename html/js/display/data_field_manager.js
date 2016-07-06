/* global Manager */
/*
 * The data field manager
 */
function DataFieldManager(elem,display)
{
	Manager.call(this)
	var self=this
	this.html_element=elem
	this.display=display
	this.reference_data_field=null;
	this.data_field_paths=[]
	this.data_fields={}
	this.templates
}
DataFieldManager.prototype = Object.create(Manager.prototype)

DataFieldManager.prototype.toString = function() { return "DataFieldManager" }

DataFieldManager.prototype.load = function()
{
	var self=this
	documentCall('/templates/data_field.html',
		function(d) { 
			self.templates=d 
			self.broadcastEvent('load',{target:self})
	})
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
			break;
		default:
			throw new Error('Unknown data type: "'+data_field.data_type+'"')
	}

	this.data_field_paths.push(data_field.path)
	this.data_fields[data_field.path]=df

	for( var i=0; i<this.data_field_paths.length; i++ )
	{
		this.data_fields[this.data_field_paths[i]].setOrder(i)
	}

	if( !this.reference_data_field ) 
	{ 
		this.setReferenceDataField(df)
	}
	// Finally show the data field
	this.display.projector.movie.addDataField(df)
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

	for( var i=0; i<this.data_field_paths.length; i++ )
	{
		this.data_fields[this.data_field_paths[i]].setOrder(i)
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
	if( this.reference_data_field != data_field )
	{
		// Set the reference data field
		if( this.reference_data_field ) this.reference_data_field.isReference=false
		this.reference_data_field=data_field 
		if( this.reference_data_field)
		{
			this.reference_data_field.isReference=true
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
		this.display.updateXY()
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
	this._isReference=false
	this._sync='frame'
	this.visible=true

	this.html_display=data_field_mgr.templates.getElementById('data_field_template').cloneNode(true)
	this.html_display.id=this.path
	this.html_display.style.order=data_field_mgr.data_field_paths.length
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

	// Move up/down
	this.moveup_btn = new SVGButton(this.html_display.getElementsByClassName('data_field_control_up')[0],false)
	this.movedown_btn=new SVGButton(this.html_display.getElementsByClassName('data_field_control_down')[0],true)
	this.moveup_btn.addEventListener('click',function(e) { self.moveup() })
	this.movedown_btn.addEventListener('click',function(e) { self.movedown() })

	// The reference button
	this.reference_btn=new SVGOnButton(this.html_display.getElementsByClassName('data_field_control_reference')[0])
	this.reference_btn.addEventListener('change',function(e) { self.isReference=e.value })
	// The frame/time sync buttons
	this.sync_btn=new SVGRadioButtons(this.html_display.getElementsByClassName('data_field_control_sync'),this._sync)
	this.sync_btn.addEventListener('change',function(e) { self.sync=e.value})
}

DataField.prototype.moveup = function()
{
	var ndx=this.data_field_mgr.data_field_paths.indexOf(this.path)
	if( ndx<this.data_field_mgr.data_field_paths.length-1 )
	{
		var other_df=this.data_field_mgr.data_fields[this.data_field_mgr.data_field_paths[ndx+1]]
		this.setOrder(ndx+1)
		other_df.setOrder(ndx)
		this.data_field_mgr.display.redraw()
	}
}

DataField.prototype.movedown = function()
{
	var ndx=this.data_field_mgr.data_field_paths.indexOf(this.path)
	if( ndx>0 )
	{
		var other_df=this.data_field_mgr.data_fields[this.data_field_mgr.data_field_paths[ndx-1]]
		this.setOrder(ndx-1)
		other_df.setOrder(ndx)
		this.data_field_mgr.display.redraw()
	}
}

DataField.prototype.setOrder = function(z)
{
	this.html_display.style.order=z
	this.data_field_mgr.data_field_paths[z]=this.path
	this.movedown_btn.enabled = (z!=0)
	this.moveup_btn.enabled = (z!=this.data_field_mgr.data_field_paths.length-1) 
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

Object.defineProperty(DataField.prototype,'sync',
    {enumerable: true,
     get: function() { return this._sync;},
     set: function(sync)
        {
			if( typeof(sync)!='string' ) throw new Error ('sync must be a string not a ' + typeof(sync) + ' : '+sync)
			if( sync!=this._sync )
			{
				this._sync=sync
				this.sync_btn.value=this._sync
			}
        }
    })

Object.defineProperty(DataField.prototype,'isReference',
    {enumerable: true,
     get: function() { return this._isReference;},
     set: function(isReference)
        {
			if( typeof(isReference)!='boolean' ) throw new Error ('isReference must be a boolean not a ' + typeof(isReference) + ' : '+isReference)
			if( isReference!=this._isReference )
			{
				this._isReference=isReference
				this.reference_btn.value=this._isReference
				if( this._isReference ) this.data_field_mgr.setReferenceDataField(this)
			}
        }
    })
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
				sprintf.parse(dimension_format) // Will thrown an error if not correctly formated
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
	serialized_data_field.frame_options=this.frame_options.serialize()
	serialized_data_field.contour_options=this.frame_options.serialize()
	return serialized_data_field
}

ScalarDataField.prototype.deserialize = function(serialized_data_field)
{
	Object.getPrototypeOf(ScalarDataField.prototype).deserialize.call(this,serialized_data_field);
	this.frame_options.deserialize(serialized_data_field.frame_options)
	this.contour_options.deserialize(serialized_data_field.contour_options)
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

	// Display button
	this.table=data_field.html_display.getElementsByClassName('data_field_contour_options')[0]
	this.table.style.display=this._show?'':'none'
	this.display_btn=new SVGToggleButton(data_field.html_display.getElementsByClassName('data_field_control_contour')[0],this._show)
	this.display_btn.addEventListener('change', function (e) { self.show=e.value } )

	// The opacity slider
	this.opacity_range=data_field.html_display.getElementsByClassName('data_field_contour_opacity')[0]
	this.opacity_range.value=1.0
	this.opacity_range.addEventListener('input',function(e) { self.opacity=e.target.value })

	// Add contour button
	this.add_button=data_field.html_display.getElementsByClassName('data_field_contour_add')[0]
	this.add_button.addEventListener('click',function(e) { self.addContourFields() })
}

Object.defineProperty(ContourOptions.prototype,'style', {enumerable: true, get: function() { return this._style;}})

Object.defineProperty(ContourOptions.prototype,'show',
    {enumerable: true,
     get: function() { return this._show;},
     set: function(show)
        {
			if( typeof(show)!='boolean' ) throw new Error ('show must be a boolean not a ' + typeof(show) + ' : '+show)
			if( show!=this._show )
			{
				this._show=show
				this.display_btn.value=show
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
	var row=this.data_field.data_field_mgr.templates.getElementById('data_field_contour_field_template').cloneNode(true)
	row.id=''
	this.table.appendChild(row)
	var contour=new Contour(this,row)
	this.contour_levels.push(contour)
	return contour
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

ContourOptions.prototype.serialize = function()
{
	var so={}
	so.opacity=this.opacity
	so.show=this.show
	so.levels=[]
	so.widths=[]
	so.colors=[]
	for( var i=0; i<this.contour_levels.length; i++ )
	{
		so.levels.push(this.contour_levels[i].value)
		so.widths.push(this.contour_levels[i].width)
		so.colors.push(this.contour_levels[i].color)
	}
	return so
}

ContourOptions.prototype.deserialize = function(so)
{
	this.allow_updates=false
	this.opacity=so.opacity
	this.show=so.show
	for( var i=0; i<so.levels.length; i++ )
	{
		var c = this.addContourFields()
		c.value=so.levels[i]
		c.width=so.widths[i]
		c.color=so.colors[i]
	}
	this.allow_updates=true
	this.updateContours()
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

	// Display button
	this.table=data_field.html_display.getElementsByClassName('data_field_frame_options')[0]
	this.table.style.display=this._show?'':'none'
	this.display_btn=new SVGToggleButton(data_field.html_display.getElementsByClassName('data_field_control_frame')[0],this._show)
	this.display_btn.addEventListener('change', function (e) { self.show=e.value } )

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

FrameOptions.prototype.serialize = function()
{
	var so={}
	so.opacity=this.opacity
	so.show=this.show
	so.renderer=this.renderer
	so.opacity=this.opacity
}

FrameOptions.prototype.deserialize = function(so)
{
	this.allow_updates=false
	this.renderer=so.renderer
	this.opacity=so.opacity
	this.show=so.show
	this.allow_updates=true
	this.updateRenderer()
}

Object.defineProperty(FrameOptions.prototype,'show',
    {enumerable: true,
     get: function() { return this._show;},
     set: function(show)
        {
			if( typeof(show)!='boolean' ) throw new Error ('show must be a boolean not a ' + typeof(show) + ' : '+show)
			if( show!=this._show )
			{
				this._show=show
				this.display_btn.value=show
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
			if( typeof(log)!='boolean' ) throw new Error ('log must be a boolean not a ' + typeof(log) + ' : '+log)
			if( log!=this._log )
			{
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
