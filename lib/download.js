var _ = require( 'lodash' );
var rename = require('gulp-rename');
var extract = require('gulp-decompress');
var vfs = require('vinyl-fs');
var vss = require('vinyl-source-stream');
var Promise = require('bluebird');
var combine = require('stream-combiner2');
var channels = require('./channels');
var Adapter = require('./util/adapter');
var Stats = require( './util/stats' );
var ensureDir = require('./util/ensure-directory');
var tmpDir = require('os').tmpdir();

function Download(location, dest, opts){
	// Set up options.
	opts = _.defaults(opts || {}, {
		type: 'http',
		extract: false,
		rename: false
	});

	// Set up adapter, stream, and file properties.
	this.adapter = opts.adapter || new Adapter(opts.adapterOpts);
	delete opts.adapter;
	this.streams = [];
	this.files = [];

	// If the extract option was passed, add the extract transform.
	if(opts.extract){
		this.adapter.log.debug('Adding the extract transform stream.');
		this.addTransform(extract(('object' === typeof opts.extract) ? opts.extract : {}));
	}
	delete opts.extract;

	// If the rename option was passed, add the rename transform.
	if(opts.rename){
		this.adapter.log.debug('Adding the rename transform stream.');
		this.addTransform(rename(opts.rename));
	}
	delete opts.rename;

	// If transforms were passed, add them to the transforms.
	if(opts.transforms instanceof Array && typeof opts.transforms !== 'string'){
		opts.transforms.map(this.addTransform, this);
	}
	delete opts.transforms;

	// Set up the destination.
	if('string' !== typeof dest){
		throw new Error('request.dest must be a string based path.');
	}
	this.dest = ensureDir(dest);
	this.adapter.log.debug('Destination resolved to ' + this.dest);


	// Set up the location
	if('string' === typeof location){
		this.location = [location];
	}else if(location instanceof Array){
		this.location = location;
	}else{
		throw new Error('request.location must be a string location or Array of locations.');
	}

	// Set up and verify the channel.
	this.channel = channels.get(opts.type);
	this.adapter.log.debug('Using ' + opts.type + ' read stream channel.');
	delete(opts.type);

	// Store opts
	this.opts = opts;
}

function run(){
	// Set up the promise chain mapping read streams to write streams.
	var prepared = this.prepareStreams();

	if( 'function' === typeof this.adapter.progress){
		prepared = prepared.then(this.adapter.progress);
	}

	return prepared.then(this.downloadFiles.bind(this));
}

function prepareStreams(){
	this.adapter.log.debug('Preparing stream pipes for all read streams.');
	return this.channel.getReadStreams(this, this.opts)
		.then(function mapStreams(streams){
			return Promise.all(streams.map(this.prepareOne.bind(this)));
		}.bind(this));
}

function prepareOne(file){
	this.adapter.log.debug('Preparing ' + file.name + ' stream pipe.');
	file.pipe = [file.stream, vss(file.name)];
	// Fire stats on this stream if necessary.
	if (this.adapter.reportStats){
		file.stats = new Stats(file.location || file.name, file.stream, {size: file.size});
		this.adapter.log.debug('Stats object for ' + file.name + ' set up.');
	}
	// Set up the destination stream and listen for finish event.
	file.destStream = vfs.dest(tmpDir);
	this.adapter.log.debug(file.name + ' destination stream created.');

	file.pipe.push(file.destStream);
	this.files.push( file );

	return file;
}

function downloadFiles(){
	var combined = Promise.all(this.files.map(this.pipeStream.bind(this)))
		.then(_.constant(this));

	if('function' === typeof this.channel.cleanup){
		combined = combined.then(this.channel.cleanup).then(_.constant(this));
	}


	return combined.then(this.toDest.bind(this)).then(_.constant(this));
}

function pipeStream(file){
	return new Promise(function combinePipe(resolve, reject){
		file.destStream.on('finish', resolve);
		file.pipe = combine( file.pipe ).on('error', reject);
	});
}

function toDest(self){
	return new Promise(function doPlugins(resolve, reject){
		var sources = vfs.src(self.files.map(function(file){return file.name;}), {cwd: tmpDir}),
			dest = vfs.dest(this.dest).on('finish', resolve);
		// If the files don't settle for some reason, extraction only gets ~25% of the
		// files. So, instead, we'll let node run this on the next tick.
		setImmediate(function concatPipe(){
			this.adapter.log.debug('Running plugins and moving files into place');
			combine([sources].concat(this.streams, dest)).on('error', reject);
		}.bind(this));
	}.bind(this));
}

function addTransform(stream){
	if('function' !== typeof stream._transform){
		throw new Error('The passed stream does not appear to do a transform');
	}
	this.streams.push( stream );
	return this;
}

Download.prototype.prepareStreams = prepareStreams;
Download.prototype.prepareOne = prepareOne;
Download.prototype.downloadFiles = downloadFiles;
Download.prototype.pipeStream = pipeStream;
Download.prototype.toDest = toDest;
Download.prototype.run = run;
Download.prototype.addTransform = addTransform;

module.exports = Download;
