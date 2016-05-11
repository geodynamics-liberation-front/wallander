/* 
 * The status manager 
 */
function StatusManager(elem,display)
{
	this.elem=elem
	this.display=display
	this.status_bar=document.createElement('div')
	this.status_editor=document.createElement('div')
	this.elem.appendChild(this.status_bar)
	this.elem.appendChild(this.status_editor)
	this.dropdown=new Dropdown(this.status_bar,this.status_editor)
	this.status_names=[]
	this.statuses={}
}

StatusManager.prototype.set_visibility = function(name,visible)
{
	if( name in this.statuses )
	{
		this.statuses[name].style.display=visible?'':'none'
	}
}
StatusManager.prototype.add_status = function(name,display_name,short_name)
{
	var self=this
	this.status_names.push(name)
	var status=document.createElement('span')
	status.status_name=name
	status.status_display_name=display_name
	status.status_short_name=short_name
	var label=document.createElement('span')
	label.className='label'
	label.innerHTML=(short_name || display_name || name) + ' : '
	var value=document.createElement('span')
	value.className='value'
	status.appendChild(label)
	status.appendChild(value)
	status.value_span=value
	status.label_span=label
	this.statuses[name]=status
	this.status_bar.appendChild(document.createTextNode('\n'))
	this.status_bar.appendChild(status)

	var status_editor=document.createElement('div')
	var editor_label=document.createElement('label')
	status.status_editor=status_editor
	var cb=document.createElement('input')
	cb.type='checkbox'
	cb.checked=true
	cb.addEventListener('change',function() { self.set_visibility(name,cb.checked) } )
	editor_label.appendChild(cb)
	editor_label.appendChild(document.createTextNode(display_name||name))
	status_editor.appendChild(editor_label)
	this.status_editor.appendChild(status_editor)
}

StatusManager.prototype.set_status = function(name,value)
{
	if( name in this.statuses )
	{
		this.statuses[name].value_span.innerHTML=value
	}
}

