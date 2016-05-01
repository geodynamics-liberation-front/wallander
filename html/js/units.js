

function PrimaryUnit(symbol,dimension,unit_manager)
{
	this.symbol=symbol
	this.dimensions=[[dimension,1]]
	this.dimension=dimension
	this.unit_manager=unit_manager
	this.primary=true
	this.tosi=this.fromsi=function(amt) { return amt }
}

UNIT_RE=/(\d*\.?\d*e?[+-]?\d*)([a-zA-Zµ]+)\^?(-?\d+)?/
function Unit(symbol,base_units,unit_manager)
{
	this.symbol=symbol
	var dims=[]
	var units=base_units.split(' ')
	var conversion_factor=1
	for(var i=0; i<units.length; i++)
	{
		var result=UNIT_RE.exec(units[i])
		var coeff=parseFloat(result[1])||1
		var unit=unit_manager.units[result[2]]
		if( !unit )
		{
			throw "Unit "+result[2]+" not found!"
		}
		var exp=parseInt(result[3])||1
		if( !('primary' in unit) )
		{
			coeff=unit.tosi(coeff)
		}

		for( var j=0; j<unit.dimensions.length; j++ )
		{
			var d=unit.dimensions[j].slice(0)
			d[1]=exp*d[1]
			dims.push(d)
		}
		conversion_factor*=Math.pow(coeff,exp)
	}
	dims.sort()
	this.dimensions=[]
	for( var i=0; i<dims.length; i++ )
	{
		if( this.dimensions.length==0 || dims[i][0]!=this.dimensions[this.dimensions.length-1][0])
		{
			this.dimensions.push(dims[i].slice(0))
		}
		else
		{
			this.dimensions[this.dimensions.length-1][1]+=dims[i][1]
		}
	}

	this.dimension=this.dimensions.join(' ').replace(/,/g,'^')

	this.tosi=function(amt) { return (amt||1)*conversion_factor; }
	this.fromsi=function(amt) { return (amt||1)/conversion_factor; }
}

function FunctionUnit(symbol,tosi,fromsi,dimensions)
{
	this.symbol=symbol
	this.tosi=tosi
	this.fromsi=fromsi
	this.dimensions=dimensions
	this.dimension =dimensions.join(' ')
}


function Units()
{
	this._si_prefixes = {
    'yocto': -24, 
    'zepto': -21, 
    'atto':  -18, 
    'femto': -15, 
    'pico':  -12, 
    'nano':   -9,  
    'micro':  -6,  
    'milli':  -3,  
    'centi':  -2,  
    'deci':   -1,  
    'deca':    1,   
    'hecto':   2,   
    'kilo':    3,   
    'mega':    6,   
    'giga':    9,   
    'tera':   12,  
    'peta':   15,  
    'exa':    18,  
    'zetta':  21,  
    'yotta':  24,
    'y': -24, 
    'z': -21, 
    'a':  -18, 
    'f': -15, 
    'p':  -12, 
    'n':   -9,  
    'µ':  -6,  
    'm':  -3,  
    'c':  -2,  
    'd':   -1,  
    'da':    1,   
    'h':   2,   
    'k':    3,   
    'M':    6,   
    'G':    9,   
    'T':   12,  
    'P':   15,  
    'E':    18,  
    'Z':  21,  
    'Y':  24
	}

	this._dimension={
	'mass': 'm',
	'length': 'L',
	'time': 't',
	'temperature': 'T',
	'current': 'I',
	'light': 'C',
	'matter': 'n'
	}
	this._dimension_symbol={}
	for(var d in this._dimension) { this._dimension_symbol[this._dimension[d]]=d }

	this.by_dimension={}

	this.units={}
	this.add_primary_unit('kg','m')
	this.add_primary_unit('m','L')
	this.add_primary_unit('s','t')
	this.add_primary_unit('K','T')
	this.add_primary_unit('A','I')
	this.add_primary_unit('c','C')
	this.add_primary_unit('mol','n')

}

Units.prototype.convert = function(from,to,amt)
{
	var amt=amt==undefined?1:amt
	var unit_from=this.units[from]
	if(!unit_from)
	{
		unit_from=this.add_unit(from,from)
	}

	var unit_to=this.units[to]
	if(!unit_to)
	{
		unit_to=this.add_unit(to,to)
	}

	return unit_to.fromsi(unit_from.tosi(amt))
}

Units.prototype.add_primary_unit = function(symbol,dimension)
{
	this.units[symbol] = new PrimaryUnit(symbol,dimension)
	this.add_to_dimensions(this.units[symbol])
	return this.units[symbol]
}

Units.prototype.add_unit = function(symbol,base_units)
{
	this.units[symbol]=new Unit(symbol,base_units,this)
	this.add_to_dimensions(this.units[symbol])
	return this.units[symbol]
}

Units.prototype.add_function_unit = function(symbol,tosi,fromsi,dimensions)
{
	this.units[symbol]=new FunctionUnit(symbol,tosi,fromsi,dimensions)
	this.add_to_dimensions(this.units[symbol])
	return this.units[symbol]
}

Units.prototype.add_to_dimensions = function(unit)
{
	if( !(unit.dimension in this.by_dimension) )
	{
		this.by_dimension[unit.dimension]=[]
	}
	this.by_dimension[unit.dimension].push(unit)
	this.by_dimension[unit.dimension].sort(function (a,b) { if( a.symbol==b.symbol ) {return 0} else { return a.symbol.toLowerCase()<b.symbol.toLowerCase()?-1:1 } } )
}

Units.prototype.get_similar_units = function(unit)
{
	return this.by_dimension[unit.dimension]
}

units=new Units()
// Force
units.add_unit('Newton','N','kg m s^-2')
units.add_unit('pound','lbs','4.448221628254617N')
// Distance
units.add_unit('kilometer','km','1000m')
units.add_unit('centemeter''cm','0.01m')
units.add_unit('foot','ft','0.3048m')
units.add_unit('inch','in',(1/12)+'ft')
// Mass
units.add_unit('slug','slug','14.5939029kg')
// Pressure/Stress
units.add_unit('pounds per square inch','psi','lbs in^-2')
units.add_unit('Pascal','Pa','N m^-2')
units.add_unit('megapascal','MPa','1000000Pa')
units.add_unit('bar','bar','100000Pa')
units.add_unit('kilopascal','kPa','1000Pa')
units.add_unit('atmosphere','atm','1.01325e5Pa')
// Viscosity
units.add_unit('Pascal-second','Pa s','Pa s')
units.add_unit('Poiseuille','Pl','Pa s')
units.add_unit('poise','P','0.1Pa s')
units.add_unit('centepoise','cP','0.001Pa s')
// Time
units.add_unit('min','60s')
units.add_unit('hr','60min')
units.add_unit('day','24hr')
units.add_unit('yr','365.25day')
units.add_unit('Myr','1e6yr')
// Velocity
units.add_unit('m s^-1','m s^-1')
units.add_unit('cm yr^-1','cm yr^-1')
// Temperature
units.add_function_unit('°C',function(t) { return t+273.15 },function(t) { return t-273.15},['T'])
units.add_function_unit('°F',function(t) { return (t+459.67)*5/9 },function(t) { return t*9/5-459.67},['T'])
