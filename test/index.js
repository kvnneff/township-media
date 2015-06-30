require('dotenv').load()
var exec = require('child_process').exec
var fs = require('fs')
var mkdirp = require('mkdirp')
var test = require('tape')
var FormData = require('form-data')
var memdown = require('memdown')
var township = require('township')
var levelup = require('levelup')
var db = levelup('db', {db: memdown})
var app = require('../')

var uploadDir = __dirname + '/blobs'
var server

/**
 * Create a new server instance and upload directory
 */
function before (pluginOptions) {
  pluginOptions = pluginOptions || {}
  server = township(db, {
    apps: [app(db, pluginOptions)]
  })

  server.listen()

  mkdirp(uploadDir)
}

/**
 * Close the server and clean up generated files
 */
function after () {
  server._server.close()
  exec('rm -rf ' + uploadDir, function (err) {if (err) throw err})
}

test('upload a file to disk storage', function (t) {
  t.plan(3)
  before({uploadDir: uploadDir})
  var form = new FormData()
  var response = ''
  form.append('foo', fs.createReadStream(__dirname + '/fixtures/test.png'))
  form.submit('http://127.0.0.1:4243/api/v1/media', function (err, res) {
    t.equal(err, null)
    t.ok(res, 'should be ok')
    res.on('data', function (chunk) {
      response += chunk
    })
    res.on('end', function () {
      var filename = JSON.parse(response)[0]
      t.equal(filename, 'test.png')
      after()
    })
  })
})

test('upload multiple files to disk storage', function (t) {
  t.plan(4)
  before({uploadDir: uploadDir})
  var form = new FormData()
  var expected = ['test.png', 'test.png']
  var response = ''
  form.append('foo', fs.createReadStream(__dirname + '/fixtures/test.png'))
  form.append('bar', fs.createReadStream(__dirname + '/fixtures/test.png'))
  form.submit('http://127.0.0.1:4243/api/v1/media', function (err, res) {
    t.equal(err, null)
    t.ok(res, 'should be ok')
    res.on('data', function (chunk) {
      response += chunk
    })
    res.on('end', function () {
      var files = JSON.parse(response)
      for (var i = files.length; i--;) {
        t.equal(files[i], expected[i])
      }

      after()
    })
  })
})

test('upload a file to s3', function (t) {
  t.plan(3)
  before({
    accessKeyId: process.env.S3_ACCESS_KEY,
    secretAccessKey: process.env.S3_SECRET_KEY,
    bucket: process.env.S3_BUCKET
  })
  var form = new FormData()
  var response = ''
  form.append('foo', fs.createReadStream(__dirname + '/fixtures/test.png'))
  form.submit('http://127.0.0.1:4243/api/v1/media', function (err, res) {
    t.equal(err, null)
    t.ok(res, 'should be ok')
    res.on('data', function (chunk) {
      response += chunk
    })
    res.on('end', function () {
      var filename = JSON.parse(response)[0]
      t.equal(filename, 'test.png')
      after()
    })
  })
})
