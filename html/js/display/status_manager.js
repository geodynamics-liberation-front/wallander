/* 
 * The status manager 
 */
function StatusManager(elem,display)
{
	Manager.call(this)
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
StatusManager.prototype = Object.create(Manager.prototype)

StatusManager.prototype.toString = function() { return "StatusManager" }

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
