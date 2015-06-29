// var fs = require('fs-blob-store')
// var anyBody = require('body/any')
var response = require('response')
var IncomingForm = require('formidable').IncomingForm

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
  var uploadDir = options.uploadDir || process.cwd() + '/blobs'

  handler.index = function (req, res, options) {
    if (req.method === 'POST') {
      var form = new IncomingForm()
      var incomingFiles = []
      var parsedFiles = []

      form.uploadDir = uploadDir

      form.on('file', function (name, file) {
        incomingFiles.push({name: name, file: file})
      })

      form.on('end', function () {
        incomingFiles.forEach(function (incoming) {
          media.create(incoming.file.toJSON(), function (err, file) {
            if (err) return response.error(err).pipe(res)
            parsedFiles.push(file.name)
            if (parsedFiles.length === incomingFiles.length) {
              return response.json(parsedFiles).pipe(res)
            }
          })
        })
      })

      form.on('error', function (err) {
        return response.error(err).pipe(res)
      })

      form.parse(req)
    }
  }

  return handler
}
