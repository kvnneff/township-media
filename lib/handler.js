var fsBlobs = require('fs-blob-store')
var aws = require('aws-sdk')
var s3Blobs = require('s3-blob-store')
var response = require('response')
var Busboy = require('busboy')

/**
 * Expose `handler`
 */
module.exports = handler

/**
 * Handle media uploads
 * @param  {Model} media
 * @param  {Object} options
 * @return {Object}
 * @api private
 */
function handler (media, options) {
  var handler = {}
<<<<<<< Updated upstream
  var store
  if (options.accessKeyId && options.secretAccessKey && options.bucket) {
    var client = new aws.S3({
      accessKeyId: options.accessKeyId,
      secretAccessKey: options.secretAccessKey
    })
    store = s3Blobs({
      client: client,
      bucket: options.bucket
    })
  } else {
    store = fsBlobs(options.uploadDir || process.cwd() + '/blobs')
  }
=======
>>>>>>> Stashed changes

  handler.index = function (req, res, options) {
    if (req.method === 'GET') {
      media.createReadStream()
        .pipe(JSONStream.stringify())
        .pipe(res)
    }

    if (req.method === 'POST') {
      var busboy = new Busboy({ headers: req.headers })
      var incomingFiles = []
      var parsedFiles = []

      function done() {
        return response.json(parsedFiles).pipe(res)
      }

      busboy.on('file', function(fieldname, file, filename, encoding, mimetype) {
        incomingFiles.push(filename)

        var writeStream = store.createWriteStream({key: filename}, function (err, opts) {
          if (err) return response.error(err).pipe(res)
          media.create({name: filename, path: opts.key, type: mimetype}, function (err, file) {
            if (err) return response.error(err).pipe(res)
            parsedFiles.push(filename)
          })
        })

        file.on('data', function (data) {
          writeStream.write(data)
        })

        file.on('end', function () {
          writeStream.end()
        })
      })

      busboy.on('finish', function () {
        var interval = setInterval(function () {
          if (parsedFiles.length === incomingFiles.length) {
            clearInterval(interval)
            done()
          }
        }, 50)
      })

      req.pipe(busboy)
    }
  }

  return handler
}
