# township-media
[![alt text](https://travis-ci.org/staygrimm/township-media.svg)](https://travis-ci.org/staygrimm/township-media)

A [Township](https://github.com/civicmakerlab/township) plugin that adds routes and methods for managing media uploads.  Includes support for Amazon S3.

## Example
``` js
var township = require('township')
var media = require('township-media')
var memdown = require('memdown')
var levelup = require('levelup')
var db = levelup('db', {db: memdown})

var options = {
  uploadDir: __dirname + '/uploads',
  allowedMimeTypes: ['png', 'jpeg', 'gif', 'mpeg', 'avi', 'ogg']
  maxFileSize: 4000000
}

var server = township(db)
server.add(media(options))
server.listen()
```

## Options

* `maxFileSize` - The maximum allowed file size (in bytes).  The default is `2000000` (2mb)
* `allowedMimeTypes` - The allowed mime types for uploaded files.  [mime-types](https://github.com/jshttp/mime-types) is used to verify mime types so the following is all valid: `['json', 'markdown', '.png', 'jpeg']`.  Defaults to allowing all mime types.
* `uploadDir` - The path to prepend to the files being saved.  When using disk storage this will look like `/assets/[uploadDir]/image.jpg`.  When using S3 this will look like `https://s3.amazonaws.com/[bucket]/[uploadDir]/image.jpg`.  The default is `uploads`.

Required when using AWS S3:


* `accessKeyId` - Your AWS S3 access key id.
* `secretAccessKey` - Your AWS S3 secret access key.
* `bucket` - Your AWS S3 bucket name.

## License
MIT
