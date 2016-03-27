var _ = require( 'lodash' );
var fs = require( 'fs' );
var path = require( 'path' );
var Promise = require( 'bluebird' );
var getKey = require( '../util/ssh-keys' );
var Connection = require( 'ssh2' );

module.exports = {
	getReadStreams: getReadStreams,
	cleanup: closeConnection
};

function getReadStreams(request, opts) {
	var config = {request: request, opts: opts};
	return new Promise.resolve(config)
		.then(parseRemote)
		.then(ensureUser)
		.then(privateKey)
		.then(makeConnection)
		.then(processFiles);
}

function parseRemote(config){
	if ('string' === typeof config.opts.host) {
		return config;
	}

	var opts = {};

	// Split the request string.
	var parts = config.request.location[0].split('@'),
	server = (1 < parts.length) ? parts[1].split(':') : parts[0].split(':'),
	auth = (1 < parts.length) ? parts[0].split(':') : false;

	// Make sure we have a host and path since they are required in the location string.
	if ( 1 === server.length ) {
		throw new Error( 'This SCP host does not have a path associated with it.' );
	}
	opts.host = server.shift();
	config.request.location[0] = server.shift();

	// Parse auth if it was sent in the location string.
	if ( auth ) {
		opts.username = auth.shift() || config.opts.username;
		opts.password = auth.shift() || config.opts.password;
	}

	// Filter out non-strings
	config.opts = _.assign( config.opts, _.pickBy( opts, _.isString ) );

	// Send back the request object with the parsed remote.
	return config;
}

function ensureUser(config){
	if(config.opts.username){
		return config;
	}

	return new Promise(function promptForUser(resolve, reject){
		config.request.adapter.prompt([{
			name: 'username',
			message: 'Username:',
			validate: _.negate(_.isEmpty)
		}], function processAnswers(answers) {
			config.opts.username = answers.username;
			resolve(config);
		});
	});
}

function privateKey(config){
	if(!config.opts.privateKey){
		config.opts.privateKey = getKey(config.opts.host);
	}
	return config;
}

function makeConnection(config){
	return Promise.resolve(config)
		.then(makeClient)
		.then(tryConnecting)
		.catch(_.curry(handleError)(config));
}

function makeClient(config){
	if (!config.request.client) {
		config.request.client = new Connection();
	}
	return config;
}

function tryConnecting(config) {
	return new Promise(function connect(resolve, reject){
		config.request.client.once('ready', function sshReady() {
			config.request.client.sftp(function sftpReady(err, sftp) {
				if (err){
					reject(err);
				}
				// save for reuse
				config.request.client.__sftp = sftp;
				resolve(config);
			});
		});
		config.request.client.once('error', function(err){
			reject(err);
		});
		config.request.client.connect(config.opts);
	});
}

function handleError(config, err){
	var passphraseErrors = [
		'Encrypted private key detected, but no passphrase given',
		'Unable to parse private key while generating public key (expected sequence)',
	];

	if('authentication' === err.level){
		config.request.adapter.log.info('auth error');
		config.request.adapter.log.info(err.message);
	}else if(passphraseErrors.indexOf(err.message) !== -1 || err.name === 'InvalidAsn1Error'){
		return new Promise(_.curry(promptPassphrase)(config))
			.then(closeConnection)
			.then(makeConnection);
	}else{
		throw err;
	}
}

function promptPassphrase(config, resolve, reject){
	config.request.adapter.prompt([{
		type: 'password',
		name: 'passphrase',
		message: 'SSH Key passphrase:'
	}], function processAnswers( answers ){
		config.opts.passphrase = answers.passphrase;
		resolve(config);
	});
}

function closeConnection(config){
	// Accept both request object and config objects.
	var client, request = false;
	if (config.request && config.request.client) {
		client = config.request.client;
	}else if(config.client){
		client = config.client;
		request = true;
	}else{
		return config;
	}
	// End the SFTP connection should one exist.
	if(client.__sftp) {
		client.__sftp.end();
		delete(client.__sftp);
	}
	// End the client connection and clear any ready timeout.
	client.end();
	if (client._readyTimeout){
		clearTimeout(client._readyTimeout);
	}
	// Clear the client from the request object.
	if(request){
		delete(config.client);
	}else{
		delete(config.request.client);
	}
	// Return the config.
	return config;
}

function processFiles(config) {
	return Promise.all(config.request.location.map(_.curry(getOne)(config)));
}

function getOne(config, location) {
	var file = {
		config: config,
		location: location,
		name: path.basename(location)
	};

	return stat(file).then(getStream);
}

function stat( file ) {
	return new Promise(function requestStats(resolve, reject){
		file.config.request.client.__sftp.stat(
			file.location,
			function recordStats(err, stat){
				if(err){
					return reject(err);
				}
				file.size = stat.size;
				resolve(file);
			}
		);
	});
}

function getStream(file){
	file.stream = file.config.request.client.__sftp.createReadStream(file.location);
	return _.omit(file, ['config']);
}
