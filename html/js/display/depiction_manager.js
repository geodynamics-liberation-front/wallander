/*
 * The depiction manager
 */
function DepictionManager(elem,display)
{
	Manager.call(this)
	this.elem=elem;
	this.display=display;
	this.depictions=[];
}
DepictionManager.prototype = Object.create(Manager.prototype)

DepictionManager.prototype.toString = function() { return "DepictionManager" }

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

