function kwargsToStr(a)
{
	var k=Object.keys(a).sort()
	var n
	var kv=[]
	for( n in k ) { kv.push(k[n]+"="+a[k[n]]); }
	return kv.join(',')
}

