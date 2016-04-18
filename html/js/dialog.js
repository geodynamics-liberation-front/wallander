function dialog_close()
{
	window.parent.hide_dialog()
}

function dialog_init()
{
	console.debug("dialog_init")
	document.getElementById('close_button').addEventListener('click',dialog_close);
}
