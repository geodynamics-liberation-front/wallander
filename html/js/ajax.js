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

function jsonCall(url,response,args)
{
	var v=httpCall(url,response,'json',args);
	if( !response )
	{
		return JSON.parse(v);
	}
}

function textCall(url,response,args)
{
	return httpCall(url,response,'text',args);
}

function documentCall(url,response,args)
{
	return httpCall(url,response,'document',args);
}

function httpCall(url,response,type,args)
{
	var r=httpRequest();
	if (response)
	{
		r.responseType=type||'text';
		r.args=args;
		r.onreadystatechange=function() { if (r.readyState===4) {response(r.response,r.args);} };
	}
	r.open('GET', url, response!=undefined);
	r.send();
	return r.response
}

function log(v)
{
	console.log(v);
}
