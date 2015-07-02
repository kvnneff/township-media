# township-media
![travis](https://travis-ci.org/staygrimm/township-media.svg)

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

## License
MIT
