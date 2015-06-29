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
function before (cb) {
  server = township(db, {
    apps: [app(db, {uploadDir: uploadDir})]
  })

  server.listen()

  mkdirp(uploadDir)
}

/**
 * Close the server and clean up generated files
 */
function after () {
  server._server.close()
  exec('rm -r ' + uploadDir, function (err) {if (err) throw err})
}

test('upload a file', function (t) {
  t.plan(3)
  before()
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

test('upload multiple files', function (t) {
  t.plan(4)
  before()
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
