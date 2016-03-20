var _ = require( 'lodash' );
var fs = require( 'fs' );
var path = require( 'path' );
var scp = require( 'scp2' );
var inquirer = require( 'inquirer' );
var Promise = require( 'bluebird' );
var Decompress = require( 'decompress' );
var getKey = require( '../util/ssh-keys' );
var ensureDirectory = require( '../util/ensure-directory' );
var overwriteCheck = require( '../util/overwrite-check' );

module.exports = download;

function download( request ) {
	return new Promise.resolve( request )
		.then( parseRemote )
		.then( ensureUser )
		.then( ensureDirectory )
		.then( overwriteCheck )
		.then( privateKey )
		.then( processRename )
		.then( createClient )
		.then( doDownload )
		.then( maybeDecompress );
}

function parseRemote( request ) {
	var opts = {};

	// Split the request string.
	var parts = request.location.split( '@' ),
	server = ( 1 < parts.length ) ? parts[ 1 ].split( ':' ) : parts[ 0 ].split( ':' ),
	auth = ( 1 < parts.length ) ? parts[ 0 ].split( ':' ) : false;

	// Make sure we have a host and path since they are required in the location string.
	if ( 1 === server.length ) {
		throw new Error( 'This SCP host does not have a path associated with it.' );
	}
	opts.host = server.shift();
	request.location = server.shift();

	// Parse auth if it was sent in the location string.
	if ( auth ) {
		opts.username = auth.shift() || request.opts.username;
		opts.password = auth.shift() || request.opts.password;
	}

	// Filter out non-strings
	request.opts = _.assign( request.opts, _.pickBy( opts, _.isString ) );

	// Send back the request object with the parsed remote.
	return request;
}

function ensureUser( request ) {
	if ( request.opts.username ) {
		return request;
	}

	return new Promise( _.curry( promptForUser )( request ) );
}

function promptForUser( request, resolve, reject ) {
	inquirer.prompt( [ {
		name: 'username',
		message: 'Username:',
		validate: _.negate( _.isEmpty )
	} ], function( answers ) {
		request.opts.username = answers.username;
		resolve( request );
	} );
}

function privateKey( request ) {
	if ( ! request.opts.privateKey ) {
		request.opts.privateKey = getKey( request.opts.host );
	}
	return request;
}

function processRename( request ) {

	if ( 'string' === typeof request.opts.rename ) {
		request.dest = path.join( request.dest, request.opts.rename );
	} else if ( 'function' === typeof request.opts.rename ) {
		request.dest = path.join(
			path.dest,
			request.opts.rename(
				path.parse(
					path.resolve(
						path.join(
							request.dest,
							path.basename( request.location )
						)
					)
				)
			)
		);
	} else if ( 'object' === typeof request.opts.rename ) {
		request.dest = path.format( _.assign(
			path.parse(
				path.resolve(
					path.join(
						request.dest,
						path.basename( request.location )
					)
				)
			),
			request.opts.rename
		) );
	} else {
		request.dest = path.join( request.dest, path.basename( request.location ) );
	}

	return request;
}

function createClient( request ) {
	request.client = new scp.Client( request.opts );
	// Eat errors events that are thrown because we'll handle them in our promise chain.
	request.client.on( 'error', _.isError );
	return request;
}

function doDownload( request ) {
	return new Promise( _.curry( tryDownload )( request ) )
		.catch( _.curry( handleError )( request ) )
		.then( closeConnection );
}

function tryDownload( request, resolve, reject ) {
	request.client.download( request.location, request.dest, function( err ) {
		if ( err ) {
			reject( err );
		}
		resolve( request );
	} );
}

function closeConnection( request ) {
	if ( request.client.__ssh ) {
		clearTimeout( request.client.__ssh._readyTimeout );
	}
	request.client.close();
	return request;
}

function handleError( request, err ) {
	var passphraseErrors = [
		'Encrypted private key detected, but no passphrase given',
		'Unable to parse private key while generating public key (expected sequence)'
	];

	if ( 'authentication' === err.level ) {
		console.log( 'auth error' );
		console.log( err.message );
	} else if ( passphraseErrors.indexOf( err.message ) !== -1 ) {
		return new Promise( _.curry( promptPassphrase )( request ) )
			.then( closeConnection )
			.then( doDownload );
	} else {
		throw err;
	}
}

function promptPassphrase( request, resolve, reject ) {
	inquirer.prompt( [ {
		type: 'password',
		name: 'passphrase',
		message: 'SSH Key passphrase:'
	} ], function( answers ){
		request.client._options.passphrase = answers.passphrase;
		request.client.remote.passphrase = answers.passphrase;
		resolve( request );
	} );
}

function maybeDecompress( request ) {
	if ( request.opts.extract ) {
		return new Promise( _.curry( extract )( request ) );
	}
	return request;
}

function extract( request, resolve, reject ) {
	var numFiles = fs.readdirSync( path.dirname( request.dest ) ).length;
	new Decompress()
		.src( request.dest )
		.dest( path.dirname( request.dest ) )
		.run( function(){
			if ( numFiles < fs.readdirSync( path.dirname( request.dest ) ).length ) {
				fs.unlink( request.dest );
			}
			resolve( request );
		} );
}
