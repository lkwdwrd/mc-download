var _ = require('lodash');
var Download = require('./download');
var Adapter = require('./util/adapter');


function MultiDownload(downloads, opts){
	this.downloads = [];
	this.files = [];

	opts = opts || {};


	this.adapter = opts.adapter || new Adapter(opts.adapterOpts);
	this.progressMethod = this.adapter.progress;
	this.adapter.progress = false;

	if(typeof downloads !== 'string' && downloads instanceof Array){
		downloads.map(this.add, this);
	}
}

function add(download){
	if(typeof download !== 'object' || !download.location || !download.dest){
		throw new Error('downloads must be objects with .location and .dest keys');
	}
	download.opts = _.assign(download.opts || {}, {adapter: this.adapter});
	return this.downloads.push(new Download(download.location, download.dest, download.opts));
}

function run(){
	var prepared = false, self = this;

	this.downloads.forEach(function prepareStreams(download){
		if(false === prepared){
			prepared = download.prepareStreams().then(self.compileFiles.bind(self));
		}else{
			prepared = prepared.then(function prepareOne(){
				return download.prepareStreams().then(self.compileFiles.bind(self));
			});
		}
	});

	if(typeof this.progressMethod === 'function'){
		prepared = prepared.then(this.setUpProgress.bind(this));
	}

	return prepared.then(this.downloadFiles.bind(this));
}

function downloadFiles(){
	return Promise.all(this.downloads.map(_.partial(_.invoke, _,'downloadFiles')));
}

function compileFiles(files){
	this.files = this.files.concat(files);
}

function setUpProgress(){
	return this.progressMethod(this.files);
}

MultiDownload.prototype.add = add;
MultiDownload.prototype.run = run;
MultiDownload.prototype.downloadFiles = downloadFiles;
MultiDownload.prototype.compileFiles = compileFiles;
MultiDownload.prototype.setUpProgress = setUpProgress;

module.exports = MultiDownload;
