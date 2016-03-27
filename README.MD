# MC-Download

A single file download utility for node working over http or scp. HTTP downloads use the [download](https://github.com/kevva/download) library, SCP works over [node-scp2](https://github.com/spmjs/node-scp2).

## Getting Started

```
$ npm install mc-download --save
```

You can then require MC-Download in your project and you will have access to the Download object and helpers.

```
var Download = require('mc-download');

// download via http
Download.download( 'https://github.com/lkwdwrd/somefile.txt', '.', {}, cb );

// download via scp
Download.download( 'lkwdwrd@github.com:/var/www/html/somefile.txt', '.', { type: 'scp' }, cb );
```

## The Download Object

```
var dl = new Download( location, destination, [options] );
```

This will set up a new download object for you, creating a file object with a read stream for each of the locations specified. You can then start the download with `Download.run()` which will stream all objects to the OS temp folder and then move them to the destination folder running them through plugins.

### location

Type: `String|Array`

The location or locations of the file. For http request this will be a URL, for SCP requests this will be at least a file path, but can contain server, username, and password as well. If more than one file is specified, items should be file paths. The first time can be used to designate the extra meta if desired.

### destination

Type: `String`

The folder where the files should be downloaded to. The files can be renamed after download using the rename option. They will be run through [gulp-rename](https://www.npmjs.com/package/gulp-rename)

### options

Type: `object`

A object controlling how the download takes place

#### options.type

Type: `string`
Default: `'http'`

Either 'http', 'scp', or an object containing a 'getReadStreams' method which returns a promise resolving to an array of readable streams. By using 'http' or 'scp', MC-Download will use the built in scp or https channels.

#### options.username

Type: `string`

If not specified in the scp location, you can supply a username in the options object. This will work for both basic http auth and for scp. The username specified in the location string will take precedence over the username specified in the options object.

#### options.password

Type: `string`

If not specified in the scp location, you can supply a password in the options object. This will work for both basic http auth (and will be required) or for scp (and is optional). Any password specified in the location string will take precedence over the password specified in the options object.

#### options.adapter

Type: `object`

By supplying an adapter, implementers can control how data flows to and from the user. An adapter object should have an `adapter.log` object which has methods defined for at least `adapter.log.info()` and `adapter.log.debug()`. The object should also have an `adapter.prompt` method for asking the user for information. Finally, if desired the adapter object can implement `adapter.progress()` as a method which will recieve a set of file objects, each of which will contain `file.stats`, an object which will emit `progress` events and can be used to report progress of the transfer.

The get an idea of how each of these can be implemented, take a look at the default [adapter object](lib/util/adapter.js). It uses [winston](https://github.com/winstonjs/winston) for logging, [inquirer](https://github.com/SBoudrias/Inquirer.js/) for prompting, and a custom implementation of [multi-progress](https://github.com/pitaj/multi-progress) to display progress bars for the downloads.

#### options.adapterOpts

Type: `object`

A set of options passed to the built in adapter. Currently this only supports a `adapterOpts.progress` property. This can either be a function allowing for a custom progress implementation, or can be `'text'` to switch the default progress bars to a simple 'Downloading file...' message. This is useful if the progress bars don't make much sense for your use case.

#### options.rewrite

Type: `string|object|function`

Rewrites a file name using either a hard coded string, a file path object, or a function. See the [gulp-rename](https://github.com/hparra/gulp-rename) for more information.

#### options.extract

Type: `boolean`

Whether to attempt extracting the file after the download is complete. This will extract .zip, .tar, .tar.gz, and .tar.bz files using the [decompress](https://github.com/kevva/decompress/) library.

#### Additional Options

For http, the options object is passed to the (got.stream)[https://github.com/sindresorhus/got] methd. Any options supported by Got are also supported by MC-Download.

Similarly, MC-Download uses the client API of [ssh2](https://github.com/mscdex/ssh2), and the options object is passed to the `.connect()` method allowing more control over how the SSH connection is made.

### SCP Download Tips

SCP is a bit trickier than HTTP downloads. To try and ease the complexit, MC-Download makes an attempt to be very flexible with SCP downloads. It will automatically look for an id_rsa key in `$HOME/.ssh/` and pass that along to the ssh client. This works on Windows as well using your user home directory. If the key requires a passphrase, MC-Download will detect this and prompt the user for it. Since this is a pure node implementation of SSH, it does not currently pull SSH passphrases out of keychain or similar tools. The Passphrase for an ssh key can also be passed in the options object `passkey: secretcode`.

If your ssh keys are stored in a different folder, MC-Download uses (rc)[https://github.com/dominictarr/rc] to allow you to specify a different location. Simply create a file in your home folder called `.mcdownloadrc`. This file should contain a JSON object that looks like the following:

```
{
	"sshDir": "path/to/directory/with/ssh/keys",
	"hosts": {
		"RegexString": "key_name"
	}
}
```

You can map different keys to different SSH hosts by using a regular expression -> key name mapping. MC-Download will cycle through each regex and see if it matches the requested host and if a match is found, will use the SSH key with that name. It will go from first defined to last defined, and stop at the first match.

When requesting a download with SCP, the location string can contain username, password, host, and path:

```
Download.download('username:password@host.com:/path/to/file.ext', '.', {type: 'scp'});
```

Alternately you can omit the password if using an ssh key, or the user will be prompted for it:

```
Download.download('username@host.com:/path/to/file.ext', '.', {type:'scp'});
```

Or you can omit the username entirely. It can then be passed as part of the options object, or it the user will be prompted to enter it prior to downloading.

```
Download.download( 'host.com:/path/to/file.ext', '.', {type:'scp'});
```

Or can you pull everything out of the location string except for the path and place it in the options object. This is also the most straight forward way to download multiple files from the connections.

```
Download.download( '/path/to/file.txt', '.', {
	type:'scp',
	host:'host.com',
	username:'username',
	password:'password'
} );
```

To download multple file, simply pass an array of file paths on the host. You can specify the username, password, and host in the first string if desired.

```
var locations = [
	'username:password@host.com:/path/to/file.txt',
	'/path/to/another/file.txt',
	'/path/to/third/file/etc.tar.gz'
];
var options = {
	type: 'scp',
	extract: true
};
Download.download( locations, '.', options );
```