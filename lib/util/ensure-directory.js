var fs = require( 'fs' );
var path = require( 'path' );
var mkdirp = require( 'mkdirp' );

function ensureDirectory(dir) {
	dir = path.resolve(dir);
	try {
		if(!fs.statSync(dir).isDirecotry()){
			throw new Error(dir + ' is not a directory.');
		}
	}catch(e){
		mkdirp(dir);
	}
	return dir;
}

module.exports = ensureDirectory;
