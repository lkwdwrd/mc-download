var _ = require( 'lodash' );
var path = require( 'path' );
var Download = require( 'download' );
var scpDownload = require( './channels/scp' );
var httpDownload = require( './channels/http' );

module.exports = downloadFile;

function downloadFile( fileLocation, destination, options, cb ) {
	var download, methodMap = {
		'scp': scpDownload,
		'http': httpDownload
	};

	// allow passing cb in the options position if no options are needed.
	if (  'function' === typeof options && ! cb ) {
		cb = options;
		options = {};
	}

	// Defaults type is http
	_.defaults( options, { type: 'http' } );

	// Either call the appropriate handler, or send rejection.
	if ( methodMap[ options.type ] ) {
		download = methodMap[ options.type ]( {
			location: fileLocation,
			dest: destination,
			opts: options
		} );
	} else {
		download = Promise.reject( new Error( 'No method call for download type ' + options.type ) );
	}

	// Return so this can be used as a thenable, or used with standeard callbacks.
	return ( 'function' === typeof cb ) ? download.asCallback( cb ) : download;
}
