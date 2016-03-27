var _ = require('lodash');
var winston = require('winston');
var inquirer = require('inquirer');
var MultiProgress = require('multi-progress');

function Adapter(opts) {
	this.opts = _.defaults( opts || {}, {
		progress: 'bars'
	});

	this.log = this.opts.log || winston;
	this.prompt = this.opts.prompt || inquirer.prompt;
	if ('function' === typeof this.opts.progress) {
		this.progress = this.opts.progress.bind(this);
	} else {
		this.progress = progress.bind(this);
	}
}

function progress(files){
	if ( 'function' === typeof this[this.opts.progress] ) {
		this[this.opts.progress](files);
	}
}

function makeBars(files){
	var i, length, bars;
	this.bars = new MultiProgress();
	files.forEach(this.bar, this);
}

function makeBar(file){
	if ( file.stats.data.size.total ) {
		this.totalBar(file);
	} else {
		this.indeterminentBar(file);
	}
}

function totalBar(file){
	var bar = this.bars.newBar(
		'|:bar| :pct :speed :remainingTime ' + file.name,
		{
			width: 28,
			complete: '◼',
			incomplete: ' ',
			renderThrottle: 500,
			total: file.stats.data.size.total
		}
	);
	file.stats.on('progress', function(data){
		var tick = 0;
		bar.tick(
			data.size.chunk,
			{
				pct: data.percentage.calculated,
				speed: data.speed.calculated,
				remainingTime: data.time.remainingCalc
			}
		);
	});
}

function indeterminentBar(file){
	var bar = this.bars.newBar(
		'|:bar| :transferred :fullTime ' + file.name,
		{
			width: 28,
			complete: '◼',
			incomplete: '.',
			renderThrottle: 500,
			total: 1
		}
	);
	file.stats.on('progress', function(data){
		bar.tick(
			data.percentage.raw,
			{
				transferred: data.size.transferred,
				fullTime: data.time.elapsedCalc
			}
		);
	});
}

function textNotification(files){
	files.forEach(function(file){
		this.log.info('Downloading ' + file.name + '...');
	}, this);
}

// Set up prototype
Adapter.prototype = _.assign(Adapter.prototype, {
	bars: makeBars,
	bar: makeBar,
	totalBar: totalBar,
	indeterminentBar: indeterminentBar,
	text: textNotification
});

// Export the adapter
module.exports = Adapter;
