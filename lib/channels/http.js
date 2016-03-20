var Download = require( 'download' );
var Promise = require( 'bluebird' );
var ensureDirectory = require( '../util/ensure-directory' );
var overwriteCheck = require( '../util/overwrite-check' );

module.exports = download;

function download( request ) {
	return Promise.resolve( request )
		.then( setUpAuth )
		.then( ensureDirectory )
		.then( overwriteCheck )
		.then( createClient )
		.then( runClient );

		// .use(function (res) {
		// res.on('readable', function () {
		// log.write('.');
		// });
		// });
}


function setUpAuth( request ) {
	if ( request.opts.username && request.opts.password ) {
		request.opts.auth = request.opts.username + ':' + request.opts.password;
	}
	return request;
}

function createClient( request ) {
	request.client = new Download( request.opts )
		.get( request.location )
		.dest( request.dest );

	return request;
}

function runClient( request ) {
	return new Promise( function( resolve, reject ){
		request.client.run( function ( err ) {
			if ( err ) {
				return reject( err );
			}
			resolve( request );
		} );
	} );
}
