var fs = require('fs')
var jsonBody = require('body/json')
var JSONStream = require('JSONStream')
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
function handler (media, options, app) {
  app = app || {}
  options = options || {}
  var staticFileDir = app.staticFileDir
  var store = null
  var handler = {}

  createStore()

  handler.index = function (req, res, options) {
    if (req.method === 'GET') {
      media.createReadStream()
        .pipe(JSONStream.stringify())
        .pipe(res)
    }

    if (req.method === 'POST') {
      var busboy = new Busboy({headers: req.headers})
      var incomingFiles = []
      var parsedFiles = []

      function done() {
        return response.json(parsedFiles).pipe(res)
      }

      busboy.on('file', function(fieldname, file, filename, encoding, mimetype) {
        incomingFiles.push(filename)

        var writeStream = store.createWriteStream({key: filename}, function (err, opts) {
          if (err) return response.error(err).pipe(res)
          var attributes = {
            name: filename,
            path: opts.key,
            type: mimetype
          }
          media.create(attributes, function (err, file) {
            if (err) return response.error(err).pipe(res)
            parsedFiles.push(file)
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

      try {
        req.pipe(busboy)
      } catch (err) {
        if (err) return response.error(err).pipe(res)
      }

    }
  }

  handler.item = function (req, res, options) {
    if (req.method === 'GET') {
      media.get(options.params.key, function (err, mediaModel) {
        if (err) return response.error(err).pipe(res)
        return response.json(mediaModel).pipe(res)
      })
    }

    // Only used for updating file names?
    if (req.method === 'PUT') {
      jsonBody(req, res, function (err, body) {
        media.get(options.params.key, function (err, mediaModel) {
          store.exists(mediaModel.name, function (err, exists) {
            if (err) return response.error(err).pipe(res)
            if (!exists) return response.error('file does not exist').pipe(res)
            if (!body.name) return response.error('name is required').pipe(res)

            // Amazon S3
            if (store.s3 && store.bucket) {
              var s3 = store.client
              var params = {
                Bucket: store.bucket,
                CopySource: store.bucket + '/' + mediaModel.name,
                Key: body.name
              }

              s3.copyObject(params, function (err, data) {
                if (err) return response.error('S3 Error while renaming file')
                media.update(options.params.key, body, function (err, mediaModel) {
                  if (err) return response.error(err).pipe(res)
                  return response.json(mediaModel).pipe(res)
                })
              })
            }

            // Disk Storage
            var oldName = staticFileDir + '/' + mediaModel.name
            var newName = staticFileDir + '/' + body.name
            fs.rename(oldName, newName, function (err) {
              if (err) return response.error('Error while renaming file')
              media.update(options.params.key, body, function (err, mediaModel) {
                if (err) return response.error(err).pipe(res)
                return response.json(mediaModel).pipe(res)
              })
            })
          })
        })
      })
    }

    if (req.method === 'DELETE') {
      var modelKey = options.params.key

      function deleteModel () {
        media.delete(modelKey, function (err) {
          if (err) return response.error(err).pipe(res)
          res.writeHead(204)
          return res.end()
        })
      }

      media.get(modelKey, function (err, mediaModel) {
        // Amazon S3
        if (store.s3 && store.bucket) {
          var s3 = store.s3
          var bucket = store.bucket
          s3.listObjects({Bucket: bucket}, function (err, data) {
            if (err) return response.error(err).pipe(res)
            var objects = []
            data.Contents.some(function (content) {
              if (content.Key === mediaModel.name) objects.push({Key: content.Key})
            })
            s3.deleteObjects({
              Bucket: bucket,
              Delete: {
                Objects: objects
              }
            }, function (err, data) {
              if (err) return response.error(err).pipe(res)
              deleteModel()
            })
          })
        }

        // Disk Storage
        var filePath = staticFileDir + '/' + mediaModel.name
        fs.unlink(filePath, function (err) {
          if (err) return response.error(err).pipe(res)
          deleteModel()
        })
      })
    }
  }
  return handler

  /**
   * Create a new blob store using either S3 or the file system
   * @param  {Object} options
   * @return {Object} Returns the created store
   */
  function createStore () {
    if (!options.accessKeyId || !options.secretAccessKey || !options.bucket) {
      store = fsBlobs(staticFileDir)
      return
    }

    var client = new aws.S3({
      accessKeyId: options.accessKeyId,
      secretAccessKey: options.secretAccessKey
    })

    store = s3Blobs({client: client, bucket: options.bucket})
  }
}
