var _ = require( 'lodash' );
var fs = require( 'fs' );
var path = require( 'path' );
var inquirer = require( 'inquirer' );
var Promise = require( 'bluebird' );

module.exports = checkForOverwrite;

function checkForOverwrite( request ) {
	var fileName;

	if ( 'function' === typeof request.opts.rename || 'object' === typeof request.opts.rename ) {
		return request;
	}

	if ( 'string' === typeof request.opts.rename ) {
		fileName = request.opts.rename;
	} else {
		fileName = path.basename( request.location );
	}

	try {
		if ( ! request.opts.force && fs.statSync( path.join( request.dest, fileName ) ) ) {
			return new Promise( _.curry( queryOverwrite )( request, fileName ) );
		}
	} catch( e ) { /* file doesn't exist, no big deal. */ }
	return request;
}

function queryOverwrite( request, filename, resolve, reject ) {
	inquirer.prompt( [ {
		type: 'confirm',
		name: 'overwrite',
		message: filename + ' aleady exists in this location. Overwrite?',
	} ], function( answers ) {
		if ( answers.overwrite ) {
			resolve( request );
		} else {
			reject( new Error( 'File exists and will not be overwritten.' ) );
		}
	} );
}