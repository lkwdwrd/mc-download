var Download = require('./download');
var MultiDownload = require('./multi-download');
var Adapter = require('./util/adapter');
var Stats = require( './util/stats' );
var channels = require('./channels');

function doDownload(location, dest, opts, cb){
	var dl = new Download(location, dest, opts).run();

	if('function' === typeof cb){
		dl = dl.asCallback(cb);
	}

	return dl;
}

function doMultiDownload(locations, opts, cb){
	var dl = new MultiDownload(locations, opts).run();

	if('function' === typeof cb){
		dl = dl.asCallback(cb);
	}

	return dl;
}

Download.download = doDownload;
Download.multi = doMultiDownload;
Download.MultiDownload = MultiDownload;
Download.Adapter = Adapter;
Download.Stats = Stats;
Download.channels = channels;

module.exports = Download;
