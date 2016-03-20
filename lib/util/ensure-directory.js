var fs = require( 'fs' );
var path = require( 'path' );
var mkdirp = require( 'mkdirp' );

module.exports = ensureDirectory;

function ensureDirectory( request ) {

	request.dest = path.resolve( request.dest );

	try {
		if( ! fs.statSync( request.dest ).isDirecotry() ) {
			throw new Error( request.dest + ' is not a directory.' );
		}
	} catch( e ) {
		mkdirp( request.dest );
	}
	return request;
}