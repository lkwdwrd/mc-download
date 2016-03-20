# MC-Download

A single file download utility for node working over http or scp. HTTP downloads use the [download](https://github.com/kevva/download) library, SCP works over [node-scp2](https://github.com/spmjs/node-scp2).

## Getting Started

```
$ npm install mc-download --save
```

You can then require MC-Download in your project and you will have access to the download function.

```
var download = require('mc-download');

// download via http
download( 'https://github.com/lkwdwrd/somefile.txt', '.', { force: true }, cb );

// download via scp
download( 'lkwdwrd@github.com:/var/www/html/somefile.txt', '.', { type: 'scp', force: 'true'}, cb );
```

## The Download Function

```
download( location, destination, [options], [callback] );
```

**Return:** `Promise`

While you can specify a node-style callback in the `callback` arg, the function will return a promise created using the [bluebird](http://bluebirdjs.com/docs/getting-started.html) promise library. This allows for chaining of the download function with other .then-able code as desired.

### location

Type: `string`

The location of the file. For http request this will be a URL, for SCP requests this will be at least a server name and file path, but can contain username and password as well.

### destination

Type: `string`

The folder where the file should be downloaded to. The file can be renames using the rename option.

### options

Type: `object`

A object controlling how the download takes place

#### options.type

Type: `string`
Default: `'http'`

Either 'http' or 'scp', this controls which channel is attempted for the download. Since the location string will be so diffent for each one but they are similar enough that it nearly impossible to auto-detect which channel to you, the type option allows you to speicify which channel to try.

#### options.username

Type: `string`

If not specified in the scp location, you can supply a username in the options object. This will work for both basic http auth and for scp. The username specified in the location string will take precedence over the username specified in the options object.

#### options.password

Type: `string`

If not specified in the scp location, you can supply a password in the options object. This will work for both basic http auth (and will be required) or for scp (and is optional). Any password specified in the location string will take precedence over the username specified in the options object.

#### options.force

Type: `boolean`

If a filename already exists, a check is performed and the user is prompted whether or not they would like to overwrite it. Currently, this check only works when no rename function is specified, or rename is specified as a hard coded string. Passing `force: true` will override this check and files will always be overwritten.

#### options.rewrite

Type: `string|object|function`

Rewrites a file name using either a hard coded string, a file path object, or a function. See the [gulp-rename](https://github.com/hparra/gulp-rename) for mor information.

#### options.extract

Type: `boolean`

Whether to attempt extracting the file after the download is complete. This will extract .zip, .tar, .tar.gz, and .tar.bz files using the [decompress](https://github.com/kevva/decompress/) library.

#### Additional Options

For http, the options object is passed to the (Download)[https://github.com/kevva/download] object. Any options supported by Download are also supported by MC-Download.

Similarly, MC-Download uses the low-level API of [scp2](https://github.com/spmjs/node-scp2), and the options object is passed to the Client instance allowing more control over how the SCP download client behaves and connects.

### SCP Download Tips

SCP is a bit trickier than HTTP downloads. To try and ease the complexit, MC-Download makes an attempt to be very flexible with SCP downloads. It will automatically look for an id_rsa key in `$HOME/.ssh/` and pass that along to the ssh client. This works on Windows as well using your user home directory. If the key requires a password, MC-Download will detect this and prompt the user for it. Since this is a pure node implementation of SSH, it does not currently pull SSH passkeys out of keychain. The Passkey for an ssh key can also be passed in the options object `passkey: secretcode`.

If your ssh keys are stored in a different folder, MC-Download uses (rc)[https://github.com/dominictarr/rc] to allow you to specify a different location. Simply create a file in your home folder called `.mcdownloadrc`. This file should contain a JSON object that looks like the following:

```
{
	"sshDir": "path/to/directory/with/ssh/keys",
	"hosts": {
		"RegexString": "key_name"
	}
}
```

You can map different keys to different SSH hosts by using a regular express -> key name mapping. MC-Download will cycle through each regex and see if it matches the requested host and if a match is found, will use the SSH key with that name. It will go from first defined to last defined, and stop at the first match.

When requesting a download with SCP, you the location string can contain username, password, host, and path:

```
download('username:password@host.com:/path/to/file.ext', '.', {type: 'scp'});
```

Alternately you can omit the password if using an ssh key, or the user will be prompted for it:

```
download('username@host.com:/path/to/file.ext', '.', {type:'scp'});
```

Or you can omit the username entirely. It can then be passed as part of the options object, or it the user will be prompted to enter it prior to downloading.

```
download( 'host.com:/path/to/file.ext', '.', {type:'scp'});
```

Username and password can also be passed as part of the options object as well.