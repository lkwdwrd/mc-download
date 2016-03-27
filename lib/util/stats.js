var EventsEmitter = require( 'events' ).EventEmitter;
var util = require( 'util' );

module.exports = Stats;

function Stats( name, stream, options ) {
	stream.on( 'data', this.recordStats.bind( this ) );
	stream.on( 'end', this.recordEnd.bind( this ) );

	this.options = options || {};

	this.options.delay = parseInt( this.options.delay || 500, 10 );
	if ( this.options.delay < 20 ) {
		this.options.delay = 500;
	}

	this._stream = stream;
	this._initialTime = 0;
	this._pauseStart = 0;
	this._pauseTime = 0;
	this._lastSize = 0;

	this.data = {
		name: name,
		time: {
			elapsed: 0,
			elapsedCalc: '--:--:--',
			remainingRaw: null,
			remainingCalc: '--:--:--'
		},
		speed: {
			raw: 0,
			calculated: '  -.- bps '
		},
		percentage: {
			raw: 0,
			calculated: '--.-%'
		},
		size: {
			total: this.options.size || null,
			transferred: 0,
			chunk: 0
		}
	};
}

function reportStats() {
	var now = Date.now();

	// If the stream has been paused, stop reporting stats and set a pauseStart time.
	if ( this._stream.isPaused() ) {
		clearInterval( this._reporter );
		this._reporter = null;
		this._pauseStart = now;
	}

	this.data.time.elapsed = Math.floor( ( now - this._pauseTime - this._initialTime ) / 1000 );
	this.data.time.elapsedCalc = humanReadableTime( this.data.time.elapsed );

	// Make a second has passed before calculating speed
	if ( this.data.time.elapsed > 1 ) {
		this.data.speed.raw = Math.floor( this.data.size.transferred / this.data.time.elapsed );
		this.data.speed.calculated = humanReadableSpeed( this.data.speed.raw );
	}

	if ( this.data.size.total ) {
		this.data.size.transferred = Math.min( this.data.size.transferred, this.data.size.total );
		this.data.percentage.raw = Math.round( this.data.size.transferred / this.data.size.total * 1000 ) / 1000;
		this.data.percentage.calculated = padString(((Math.round(this.data.percentage.raw*1000))/10).toFixed(1)+'%', 6);

		if ( this.data.speed.raw ) {
			this.data.time.remainingRaw = Math.floor( ( this.data.size.total / this.data.speed.raw ) - this.data.time.elapsed );
			this.data.time.remainingCalc = humanReadableTime( this.data.time.remainingRaw );
		}
	}

	this.data.size.chunk = this.data.size.transferred - this._lastSize;
	this._lastSize = this.data.size.transferred;

	this.emit( 'progress', this.data );
	this.data.size.chunk =  0;
}

function recordStats( data ) {
	// Record the first data event we get.
	if ( ! this._initialTime ) {
		this._initialTime = Date.now();
	}

	// Add to the pause interval if restarting after a pause.
	if ( this._pauseStart ) {
		this._pauseTime += Date.now() - this._pauseStart;
		this._pauseStart = 0;
	}

	// If the reporter interval is not running, start running it.
	if ( ! this._reporter ) {
		this._reporter = setInterval( this.reportStats.bind( this ), this.options.delay );
	}

	// Add to the transferred length.
	this.data.size.transferred += data.length;
}

function recordEnd() {
	if ( this.data.size.total ) {
		this.data.transferred = this.data.size.total;
	} else {
		this.data.size.total = this.data.size.transferred;
	}

	this.reportStats();

	if ( this._reporter ) {
		clearInterval( this._reporter );
		this._reporter = null;
	}
}

function humanReadableSpeed( bps ) {
	var speed;
	bps = bps * 8;
	// get bits per second from bytes per seconds sent.

	var key, calcTable = {
		'Gbps': 1073741824, // 2^30
		'Mbps': 1048576,    // 2^20
		'Kbps': 1024,       // 2^10
		'Bps ': 8,
		'bps ': 1
	};

	for ( key in calcTable ) {
		if ( bps >= calcTable[ key ] ) {
			break;
		}
	}

	return padString((Math.floor((bps/calcTable[key])*100)/100).toFixed(2) + key, 10);
}

function humanReadableTime( seconds ) {
	var calcTime, time = '';
	// 60 * 60 * 24 === 86400
	// Don't do times over a day.
	if ( seconds > 86400 ) {
		return '--:--:--';
	}

	// hours
	calcTime = Math.floor( seconds / 3600 );
	time = time + ( calcTime < 10 ) ? '0' + calcTime : calcTime;
	seconds = seconds % 3600;
	// minutes
	calcTime = Math.floor( seconds/ 60 );
	time += ':' + ( ( calcTime < 10 ) ? '0' + calcTime : calcTime );
	seconds = seconds % 60;
	// seconds
	time += ':' + ( ( seconds < 10 ) ? '0' + seconds : seconds );

	return time;
}

function padString( str, length ) {
	while( str.length < length ) {
		str = ' ' + str;
	}
	return str;
}

Stats.prototype.reportStats = reportStats;
Stats.prototype.recordStats = recordStats;
Stats.prototype.recordEnd = recordEnd;
util.inherits( Stats, EventsEmitter );
