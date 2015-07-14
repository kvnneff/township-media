var fs = require('fs')
var jsonBody = require('body/json')
var JSONStream = require('JSONStream')
var fsBlobs = require('fs-blob-store')
var aws = require('aws-sdk')
var s3Blobs = require('s3-blob-store')
var s3Url = require('s3-public-url')
var res = require('response')
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
  var staticFileUrl = app.staticFileUrl
  var uploadDir = options.uploadDir || 'uploads'
  var bucketLocation = options.bucketLocation || ''
  var handler = {}
  var store = null
  var s3 = false

  /**
   * Create a new blob store using either S3 or the file system
   * @param  {Object} options
   * @return {Object} Returns the created store
   */
  function createStore () {
    if (!options.accessKeyId ||
      !options.secretAccessKey ||
      !options.bucket ||
      !options.bucketLocation) {
      store = fsBlobs(staticFileDir + uploadDir)
      return
    }

    var client = new aws.S3({
      accessKeyId: options.accessKeyId,
      secretAccessKey: options.secretAccessKey
    })

    store = s3Blobs({client: client, bucket: options.bucket})
    s3 = true
  }

  /**
   * Retrieve all models and pipe output to `response`
   * @param  {Request} request
   * @param  {Response} response
   * @api private
   */
  function handleGetAll (request, response) {
    media.createReadStream()
      .pipe(JSONStream.stringify())
      .pipe(response)
  }

  /**
   * Retrieve a single model and pipe output to `response`
   * @param  {Request} request
   * @param  {Response} response
   * @param  {Object} options  Request parameters
   * @return {JSON}
   * @api private
   */
  function handleGetSingle (request, response, options) {
    media.get(options.params.key, function (err, model) {
      if (err) return res.error(err).pipe(response)
      return res.json(model).pipe(response)
    })
  }

  /**
   * Get the key to use for blob stores
   * @param  {String} filename File name
   * @return {String}
   * @api private
   */
  function getBlobKey (filename) {
    if (s3) return uploadDir + '/' + filename
    return filename
  }

  /**
   * Handle incoming `POST` requests
   * @param  {Request} request
   * @param  {Response} response
   * @api private
   */
  function handlePost (request, response) {
    var busboy = new Busboy({headers: request.headers})
    var incomingFiles = []
    var parsedFiles = []

    function done() {
      return res.json(parsedFiles).pipe(response)
    }

    function createWriteStream (key, filename, mimetype) {
      var writeStream = store.createWriteStream({key: key}, function (err, info) {
        if (err) return res.error(err).pipe(response)
        var path = staticFileUrl + uploadDir
        if (s3) {
          path = s3Url.getHttps(store.bucket, key, bucketLocation)
          path = path.substring(0, path.indexOf(filename))
        }

        var attributes = {
          name: filename,
          path: path,
          type: mimetype
        }
        media.create(attributes, function (err, file) {
          if (err) return res.error(err).pipe(response)
          parsedFiles.push(file)
        })
      })
      return writeStream
    }

    busboy.on('file', function(fieldname, file, filename, encoding, mimetype) {
      incomingFiles.push(filename)
      var key = getBlobKey(filename)
      var stream = createWriteStream(key, filename, mimetype)
      file.on('data', function (data) {
        stream.write(data)
      })
      file.on('end', function () {
        stream.end()
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
      request.pipe(busboy)
    } catch (err) {
      if (err) return res.error(err).pipe(response)
    }
  }

  /**
   * Handle `PUT` requests
   * @param  {Request} request
   * @param  {Response} response
   * @param  {Object} options  Request parameters
   * @api private
   */
  function handlePut (request, response, options) {
    var modelId = options.params.key
    var oldBlobKey
    var newBlobKey
    var newFileName

    /**
     * Rename a file on S3
     * @api private
     */
    function renameS3File () {
      var s3Client = store.s3
      var newKey = newBlobKey
      var copySource = store.bucket + '/' + oldBlobKey
      var params = {
        Bucket: store.bucket,
        CopySource: copySource,
        Key: newKey
      }

      s3Client.copyObject(params, function (err, data) {
        if (err) return res.error('S3 Error while renaming file').pipe(response)
        media.update({key: modelId, name: newFileName, path: params.CopySource}, function (err, model) {
          if (err) return res.error(err).pipe(response)
          return res.json(model).pipe(response)
        })
      })
    }

    /**
     * Rename a file on disk
     * @api private
     */
    function renameDiskFile () {
      var oldName = staticFileDir + uploadDir + '/' + oldBlobKey
      var newName = staticFileDir + uploadDir + '/' + newBlobKey
      fs.rename(oldName, newName, function (err) {
        if (err) return res.error('Error while renaming file')
        media.update({key: modelId, name: newBlobKey, path: newName}, function (err, model) {
          if (err) return res.error(err).pipe(response)
          return res.json(model).pipe(response)
        })
      })
    }

    jsonBody(request, response, function (err, body) {
      if (err) return res.error(err).pipe(response)
      if (!body.name) return res.error('name is required').pipe(response)
      media.get(modelId, function (err, model) {
        oldBlobKey = getBlobKey(model.name)
        newBlobKey = getBlobKey(body.name)
        newFileName = body.name

        // If the file names are the same there is nothing more to do
        if (oldBlobKey === newBlobKey) return res.json(model).pipe(response)

        // Check if file exists
        store.exists({key: oldBlobKey}, function (err, exists) {
          if (!exists) return res.error('file does not exist').pipe(response)
          if (s3) return renameS3File()
          return renameDiskFile()
        })
      })
    })
  }

  function handleDelete (request, response, options) {
    var modelId = options.params.key
    var blobKey

    /**
     * Delete a model entry from storage
     * @api private
     */
    function deleteModel () {
      media.delete(modelId, function (err) {
        if (err) return res.error(err).pipe(response)
        response.writeHead(204)
        return response.end()
      })
    }

    /**
     * Delete a file from S3
     * @api private
     */
    function deleteFromS3 () {
      var s3Client = store.s3
      var bucket = store.bucket
      s3Client.listObjects({Bucket: bucket}, function (err, data) {
        if (err) return res.error(err).pipe(response)
        var fileObjects = []
        data.Contents.some(function (content) {
          if (content.Key !== blobKey) return false
          fileObjects.push({Key: content.Key})
          return true
        })
        s3Client.deleteObjects({
          Bucket: bucket,
          Delete: {Objects: fileObjects}
        }, function (err, data) {
          if (err) return res.error(err).pipe(response)
          deleteModel()
        })
      })
    }

    /**
     * Delete a file from disk storage
     * @api private
     */
    function deleteFromDisk () {
      var filePath = staticFileDir + uploadDir + '/' + blobKey
      fs.unlink(filePath, function (err) {
        if (err) return res.error(err).pipe(response)
        deleteModel()
      })
    }

    media.get(modelId, function (err, model) {
      blobKey = getBlobKey(model.name)
      if (s3) return deleteFromS3()
      return deleteFromDisk()
    })
  }

  // Initialize file store
  createStore()

  handler.index = function (request, response, options) {
    if (request.method === 'GET') handleGetAll(request, response, options)
    if (request.method === 'POST') handlePost(request, response, options)
  }

  handler.item = function (request, response, options) {
    if (request.method === 'GET') handleGetSingle(request, response, options)
    if (request.method === 'PUT') handlePut(request, response, options)
    if (request.method === 'DELETE') handleDelete(request, response, options)
  }

  return handler
}
