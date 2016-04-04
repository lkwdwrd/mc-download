var rc = require('rc');
var fs = require('fs');
var path = require('path');
var hostCache = {};
var keyCache = {};

function getKey(host){
	var key, config = getConfig(), file = path.join(config.sshDir, 'id_rsa');

	// See if we've seen this exactly host before
	if(hostCache[host] && keyCache[hostCache[host]]){
		return keycache[hostCache[host]];
	}

	// Check for special config for this host key file.
	for(key in config.hosts){
		if(new RegExp(key).test(host)){
			file = path.join(config.sshDir, config.hosts[key]);
		}
	}

	//Check to see if this file is in cache, if so cache it for this host.
	if(keyCache[file]){
		hostCache[host] = file;
		return keyCache[file];
	}

	// If missed caches, get the file and cache it.
	try{
		keyCache[file] = {
			privateKey: fs.readFileSync(file),
			keyName: path.basename(file)
		};
		hostCache[host] = file;
		return keyCache[hostCache[host]];
	}catch(e){
		return {};
	}
}

function cachePassphrase(host, passphrase){
	if(!hostCache[host] || !keyCache[hostCache[host]]){
		return {};
	}
	keyCache[hostCache[host]].passphrase = passphrase;
	return keyCache[hostCache[host]];
}

function getConfig() {
	return rc('mcdownload', {
		sshDir: path.join(
			(process.platform === 'win32') ? process.env.USERPROFILE : process.env.HOME,
			'.ssh'
		),
		hosts: {}
	});
}

function fileExists(file){
	try{
		fs.lstatSync(file);
		return true;
	}catch(e){
		return false;
	}
}

module.exports = getKey;
getKey.cachePassphrase = cachePassphrase;
