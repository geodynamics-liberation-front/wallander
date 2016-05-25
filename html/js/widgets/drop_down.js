function Dropdown(button_elem,display_elem)
{
	var self=this
	this.button=button_elem;
	add_class(this.button,'closed')
	add_class(this.button,'dropdown')
	this.display=display_elem
	this.display.style.height="0"
	this.display.style.overflow="hidden"
	this.display.style.transitionProperty="height"
	this.display.style.transitionDuration="3s"
	this.button.addEventListener('click',function() { self.click() } )
}

Dropdown.prototype.click = function ()
{
	if(has_class(this.button,'closed'))
	{
		this.display.style.height=""
		remove_class(this.button,'closed')
		add_class(this.button,'open')
	}
	else
	{
		this.display.style.height="0"
		remove_class(this.button,'open')
		add_class(this.button,'closed')
	}
}

