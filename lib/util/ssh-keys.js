var rc = require( 'rc' );
var fs = require( 'fs' );
var path = require( 'path' );

module.exports = getSSHKey;

function getSSHKey( host ) {
	var key, config = getSSHConfig(), file = path.join( config.sshDir, 'id_rsa' );
	for ( key in config.hosts ) {
		if ( new RegExp( key ).test( host ) ) {
			file = path.join( config.sshDir, config.hosts[ key ] );
		}
	}

	try {
		return fs.readFileSync( file );
	} catch( e ) {
		return null;
	}
}

function getSSHConfig() {
	return rc( 'mcdownload', {
		sshDir: path.join(
			( process.platform === 'win32' ) ? process.env.USERPROFILE : process.env.HOME,
			'.ssh'
		),
		hosts: {}
	} );
}

function fileExists( file ) {
	try {
		fs.lstatSync( file );
		return true;
	} catch( e ) {
		return false;
	}
}
