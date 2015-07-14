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
  uploadDir: __dirname + '/uploads'
}

var server = township(db)
server.add(media(db, options, server))
server.listen()
```

## Options

Required when using AWS S3:

`uploadDir` - The path to prepend to the files being saved.  When using disk storage this will
look like `/assets/[uploadDir]/image.jpg`.  When using S3 this will look like `https://s3.amazonaws.com/[bucket]/[uploadDir]/image.jpg`

`accessKeyId` - Your AWS S3 access key id.
`secretAccessKey` - Your AWS S3 secret access key.
`bucket` - Your AWS S3 bucket name.

## License
MIT
