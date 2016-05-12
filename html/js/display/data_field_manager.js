/*
 * The data field manager
 */
function DataFieldManager(elem,display)
{
	this.elem=elem
	this.display=display
	this.reference_data_field=null;
	this.data_field_paths=[]
	this.data_fields={}
}

DataFieldManager.prototype.addDataField = function(data_field)
{
	console.log('Adding data field: ')
	console.log(data_field.path)

	data_field._unit=data_field.unit

	data_field._dimension_unit=data_field.dimension_unit
	data_field.xy=converted_xy

	data_field._time=data_field.time
	data_field._time_unit=data_field.time_unit
	data_field.time=converted_time
	data_field.frame_count=data_field._time.length
	data_field.visible=true
	
	this.data_field_paths.push(data_field.path)
	this.data_fields[data_field.path]=data_field
	this.display.projector.movie.addDataField(data_field,'frame')

	var df_display=document.getElementById('data_field_template').cloneNode(true)
	new Dropdown(df_display.getElementsByClassName('data_field_bar')[0], df_display.getElementsByClassName('data_field_details')[0])
	data_field.html_display=df_display
	df_display.id=data_field.path
	df_display.field_name=df_display.getElementsByClassName('data_field_name')[0]
	df_display.field_name.innerHTML=data_field.display_name
	df_display.field_value=df_display.getElementsByClassName('data_field_value')[0]
	df_display.field_value.innerHTML='-'
//	display.field_colormap=display.getElementsByClassName('data_field_colormap')[0]
	
	this.elem.appendChild(df_display)

	if( !this.reference_data_field ) 
	{ 
		this.setReferenceDataField(data_field)
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
			df.html_display.field_value.innerHTML="-"
		}
	}
}

DataFieldManager.prototype.updateDisplayValue = function(v,df)
{
	if( df.unit!=df._unit )
	{
		v=units.convert(df._unit,df.unit,v)
	}
	df.html_display.field_value.innerHTML=sprintf(df.format,v)+"<span class='label'>"+df.unit+"</span>"
}
	
DataFieldManager.prototype.setReferenceDataField = function(data_field)
{
	// Set the reference data field
	this.reference_data_field=data_field 
	if( data_field )
	{
		// Set the time units and format
		var time_status_editor=this.display.status_mgr.statuses['time'].status_editor
		time_editor=new StatusEditor('time',this)
		time_status_editor.appendChild(time_editor.html)

		// Set the time units and format
		var xy_status_editor=this.display.status_mgr.statuses['dimensional_xy'].status_editor
		xy_editor=new StatusEditor('dimension',this)
		xy_status_editor.appendChild(xy_editor.html)
	}
}

DataFieldManager.prototype.removeDataField = function(data_field)
{
	console.log('Deleting data field: ')
	console.log(data_field)
	var df=this.data_fields[data_field]
	delete this.data_fields[data_field]
	this.data_field_paths.splice(this.data_field_paths.indexOf(data_field),1)
	if( df===this.reference_data_field )
	{
		this.setReferenceDataField(this.data_field_paths[-1])
	}
}

function StatusEditor(name,data_field_mgr)
{
	var span=document.createElement('span')
	span.className='label'
	var select=document.createElement('select')
	units.unit_select(select,data_field_mgr.reference_data_field[name+'_unit'])
	select.addEventListener('change',function(e) {data_field_mgr.reference_data_field[name+'_unit']=e.target.value})
	span.appendChild(select)
	var input=document.createElement('input')
	input.value=data_field_mgr.reference_data_field[name+'_format']
	input.addEventListener('change',function(e) {data_field_mgr.reference_data_field[name+'_format']=e.target.value})
	span.appendChild(input)
	this.html=span
}

function converted_value(v)
{
	return 0
}

function converted_xy(x,y)
{
	x=this.dx*x + this.x0
	y=this.dy*y + this.y0
	if( this.dimension_unit!=this._dimension_unit )
	{
		x=units.convert(this._dimension_unit,this.dimension_unit,x)
		y=units.convert(this._dimension_unit,this.dimension_unit,y)
	}
	return {x:x,y:y}
}

function converted_time(t)
{
	t=this._time[t]
	if( this.time_unit!=this._time_unit )
	{
		t=units.convert(this._time_unit,this.time_unit,t)
	}
	return t
}

