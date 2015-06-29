# township-media
![travis](https://travis-ci.org/staygrimm/township-media.svg)

A [Township](https://github.com/civicmakerlab/township) plugin that adds routes and methods for managing media uploads

## Example
``` js
var township = require('township')
var media = require('township-media')
var memdown = require('memdown')
var levelup = require('levelup')
var db = levelup('db', {db: memdown})

var mediaOptions = {
  uploadDir: __dirname + '/uploads'
}

var serverOptions = {
  apps: [media(db, mediaOptions)]
}

var server = township(db, serverOptions)

server.listen()
```

## License
MIT
