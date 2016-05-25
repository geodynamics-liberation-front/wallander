// Our location
var ds_location='/';

function canonical_path(p)
{
	path_elem=p.split('/')
	path=[]
	for(var i=0; i<path_elem.length; i++ )
	{
		e=path_elem[i]
		if (e=='.'||e=='')
		{
		}
		else if (e=='..')
		{
			path.pop()
		}
		else
		{
			path.push(e)
		}
	}
	return '/'+path.join('/')
}

function open(l)
{
	if(l[0]=='/')
	{
		loc=canonical_path(l)
	}
	else
	{
		loc=canonical_path(ds_location+'/'+l)
	}
	jsonCall(config['app_prefix']+loc,select,loc)
	return false
}

function reset_toolbox()
{
	parent.display.toolbox.toolClick({target: parent.display.toolbox.default_tool.html_img})
}

function select(resp,loc)
{
	if(resp.type=='data_field')
	{
		parent.display.addDataField(resp)
		dialog_close()
	} 
	else
	{
		ds_location=loc
		list_folder(resp)
	}
}

var favorite=false
var favorites=[]
var favorite_objects={}

function click_favorite()
{
	if(favorite)
	{
		uncolor_favorite()
		var favndx=favorites.indexOf(ds_location)
		favorites.splice(favndx,1)
		list_favorites()
		store_favorites()
	}
	else
	{
		jsonCall(config['app_prefix']+ds_location,add_favorite)
	}
}

function add_favorite(resp)
{
	if( ds_location==resp.path)
	{
		color_favorite()
	}
	favorites.push(resp.path)
	favorites.sort()
	favorite_objects[resp.path]=resp
	list_favorites()
	store_favorites()
}

function store_favorites()
{
	if( localStorage )
	{	
		localStorage.setItem("OpenDataSetFavorites",JSON.stringify(favorites))		
	}
}

function restore_favorites(resp,favs)
{
	if( resp )
	{
		add_favorite(resp)
	}
	else if( localStorage && "OpenDataSetFavorites" in localStorage)
	{	
		favs=JSON.parse(localStorage.getItem("OpenDataSetFavorites",JSON.stringify(favorites)))
	}
	if( favs && favs.length>0 )
	{
		jsonCall(config['app_prefix']+favs.shift(),restore_favorites,favs)
	}
}

function color_favorite()
{
	var star=document.getElementById('favorite').contentDocument.getElementById('star')
	star.style.fill="#ffff00"
	star.style.stroke="#000000"
	favorite=true
}

function uncolor_favorite()
{
	var star=document.getElementById('favorite').contentDocument.getElementById('star')
	star.style.fill="none"
	star.style.stroke="#858585"
	favorite=false
}


function compare_kids(a,b)
{
	a_name='display_name' in a ? a.display_name : 'name' in a ? a.name : a
	b_name='display_name' in b ? b.display_name : 'name' in b ? b.name : b
	return a_name==b_name ? 0 : a_name<b_name ? -1 : 1
}

function list_folder(resp)
{
	// write the breadcrumb
	var bc=document.getElementById('breadcrumb')
	var p=''
	var path=ds_location.split('/')
	bc.innerHTML=''
	path[0]='/'
	if(path[path.length-1]=='') { path.pop() }
	for(var i=0; i<path.length; i++)
	{
		p=p+'/'+path[i]
		var a=document.createElement('a')
		a.href="#"
		a.addEventListener('click',new Function('open("'+p+'"); return false;'))
		a.innerHTML=path[i]
		bc.appendChild(a)
	}
	
	// Turn on the favorite (if necessary)
	if( favorites.indexOf(ds_location)>-1 ) 
	{ 
		color_favorite() 
	}
	else
	{
		uncolor_favorite() 
	}

	// List the contents of the folder
	var contents=document.getElementById('contents')
	var kids=resp.children
	kids.sort(compare_kids)
	contents.innerHTML=''
	for(i=0;i<kids.length;i++)
	{
		contents.appendChild(create_icon(kids[i]))
	}
}

function list_favorites()
{
	var contents=document.getElementById('favorites')
	contents.innerHTML=''
	for(i=0;i<favorites.length;i++)
	{
		favo=favorite_objects[favorites[i]]
		contents.appendChild(create_icon(favorite_objects[favorites[i]],'path'))
	}
}

function create_icon(c,addr)
{
	// the achor
	addr=addr||'name'
	var a=document.createElement('a')
	a.className='icon';
	a.href="#"
	a.addEventListener('click',new Function('open("'+c[addr]+'"); return false;'))

	// The icon
	var icon=document.createElement('img');
	icon.src=config['app_prefix']+c.icon
	a.appendChild(icon)

	// The label
	var label;
	var label=document.createElement('div')
	label.innerHTML='display_name' in c ? c.display_name : c.name;
	a.appendChild(label);

	return a
}

function open_dataset_init()
{
	open('/');
	restore_favorites()
	document.getElementById('favorite').contentDocument.addEventListener('click',click_favorite);
}
