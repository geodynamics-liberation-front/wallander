function httpRequest()
{
	var request
	if (window.XMLHttpRequest) 
	{ // Mozilla, Safari, ...
		  request = new XMLHttpRequest();
	} 
	else if (window.ActiveXObject) 
	{ // IE
		try 
		{
			request = new ActiveXObject("Msxml2.XMLHTTP");
		} 
		catch (e) 
		{
			try 
			{
				request = new ActiveXObject("Microsoft.XMLHTTP");
			} 
			catch (e) {}
		}
	}
	return request;
}

function jsonCall(url,response,args,post)
{
	var v=httpCall(url,response,'json',args,post);
	if( !response )
	{
		return JSON.parse(v);
	}
}

function textCall(url,response,args,post)
{
	return httpCall(url,response,'text',args,post);
}

function documentCall(url,response,args,post)
{
	return httpCall(url,response,'document',args,post);
}

function httpCall(url,response,type,args,post)
{
	var r=httpRequest();
	if (response)
	{
		r.responseType=type||'text';
		r.args=args;
		r.onreadystatechange=function() { if (r.readyState===4) {response(r.response,r.args);} };
	}
	r.open(post?"POST":"GET", url, response!=undefined);
	r.send(post);
	return r.response
}

function log(v)
{
	console.log(v);
}
