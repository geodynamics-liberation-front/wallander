"use strict";

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

function JSONResourceBundle(urls,callback,args)
{
	this.responses={}
	this.response_count=0
	this.callback=callback
	this.args=args
	this.urls=urls	
}

JSONResourceBundle.prototype.load = function()
{
	var self=this
	for( var i=0; i<this.urls.length; i++ )
	{
		jsonCall(this.urls[i],function(response,url){self.loaded(response,url)},this.urls[i])
	}
}

JSONResourceBundle.prototype.loaded = function(response,url)
{
	this.response_count++
	this.responses[url]=response
	console.log('loaded ['+this.response_count+'/'+this.urls.length+'] :'+url)
	if(this.response_count==this.urls.length)
	{
		this.callback(this,this.args)
	}
}

var DOMURL = window.URL || window.webkitURL || window;

function loadSVG(url,img,style_text)
{
	documentCall(url,svgLoaded,{img:img,style:style_text})
}

function svgLoaded(doc,arg)
{
	var svg=doc.rootElement
	var img=arg.img
	var style=document.createElement('style')
	style.innerHTML=arg.style
	svg.insertBefore(style,svg.children[0])

	var svgBlob = new Blob([svg.outerHTML], {type: 'image/svg+xml;charset=utf-8'});
	var url = DOMURL.createObjectURL(svgBlob);
	if( !('DOMURL' in img ) )
	{
		img.DOMURL=DOMURL
		img.addEventListener('load',function (e) { img.DOMURL.revokeObjectURL(url) })
	}
	arg.img.src=url
}

function log(v)
{
	console.log(v);
}
