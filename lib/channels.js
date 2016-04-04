var channels = {
	http: require('./channels/http' ),
	scp: require('./channels/scp' )
};

function getChannel(key){
	if(!channels[key]){
		throw new Error('The ' + key + ' channel has not been added, unable to continue.' );
	}
	return channels[key];
}

function addChannel(key, channel){
	if('function' !== typeof channel.getReadStreams){
		throw new Error(
			'Channels must be an object containing a function '+
			'returning an array of promised file objects.'
		);
	}
	channels[key] = channel;
}

module.exports = {
	get: getChannel,
	add: addChannel
};
