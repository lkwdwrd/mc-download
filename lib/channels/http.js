var _ = require('lodash');
var url = require('url');
var caw = require('caw');
var got = require('got');
var path = require('path');
var Promise = require('bluebird');

module.exports = {
	getReadStreams: getReadStreams
};

function getReadStreams(request, opts){
	opts = setUpAuth(opts);
	return new Promise.all(request.location.map(_.curry(getOne)(opts)));
}

function getOne(opts, location){
	return new Promise(_.curry(makeStream)(location, opts));
}

function makeStream(location, opts, resolve, reject){
	var agent, file, protocol = url.parse(location).protocol;

	if (protocol) {
		protocol = protocol.slice(0, -1);
	}
	agent = caw(opts.proxy, {protocol: protocol});

	file = {
		stream: got.stream(location, _.assign(opts, {agent: agent})).pause(),
		name: path.basename(location)
	};

	file.stream
		.on('error', reject)
		.on('response', _.curry(recordLength)(file, resolve));
}

function setUpAuth(opts){
	if(opts.username && opts.password){
		opts.auth = request.opts.username + ':' + request.opts.password;
	}
	return _.omit(opts, ['username', 'password']);
}

function recordLength(file, resolve, response){
	file.size = parseInt( response.headers['content-length'], 10 );
	resolve(file);
}
