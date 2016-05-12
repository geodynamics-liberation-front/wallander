var close_listeners=[]
function dialog_close()
{
	window.parent.hide_dialog()
	for(var i=0; i<close_listeners.length; i++) { close_listeners[i].call(); }
}

function dialog_init()
{
	console.debug("dialog_init")
	close_listeners=Array.from(arguments)
	document.getElementById('close_button').addEventListener('click',dialog_close);
}

function show_dialog()
{
	var dialog=document.getElementById('dialog');
	dialog.style.display='block';
	display.toolbox.close()
}

function hide_dialog()
{
	var dialog=document.getElementById('dialog');
	if( dialog ) { dialog.style.display='none'; }
}

