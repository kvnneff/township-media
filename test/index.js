try {
  require('dotenv').load()
} catch (err) {}

var exec = require('child_process').exec
var fs = require('fs')
var mkdirp = require('mkdirp')
var request = require('request')
var test = require('tape')
var FormData = require('form-data')
var memdown = require('memdown')
var township = require('township')
var levelup = require('levelup')
var db = levelup('db', {db: memdown})
var app = require('../')
var media = require('../lib/model')(db)

var serverURI = 'http://127.0.0.1:4243/api/v1/media'
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

/**
 * Tests
 */
test('upload a file to disk storage', function (t) {
  t.plan(3)
  before({uploadDir: uploadDir})
  var form = new FormData()
  var response = ''
  form.append('foo', fs.createReadStream(__dirname + '/fixtures/test.png'))
  form.submit(serverURI, function (err, res) {
    t.equal(err, null)
    t.ok(res)
    res.on('data', function (chunk) {
      response += chunk
    })
    res.on('end', function () {
      var file = JSON.parse(response)[0]
      t.equal(file.name, 'test.png')
      after()
    })
  })
})

test('upload multiple files to disk storage', function (t) {
  t.plan(4)
  before({uploadDir: uploadDir})
  var form = new FormData()
  var expected = [{name: 'test.png'}, {name: 'test.png'}]
  var response = ''
  form.append('foo', fs.createReadStream(__dirname + '/fixtures/test.png'))
  form.append('bar', fs.createReadStream(__dirname + '/fixtures/test.png'))
  form.submit(serverURI, function (err, res) {
    t.equal(err, null)
    t.ok(res)
    res.on('data', function (chunk) {
      response += chunk
    })
    res.on('end', function () {
      var files = JSON.parse(response)
      for (var i = files.length; i--;) {
        t.equal(files[i].name, expected[i].name)
      }

      after()
    })
  })
})

test('get a list of available media', function (t) {
  t.plan(5)
  before({uploadDir: uploadDir})
  var form = new FormData()

  form.append('foo', fs.createReadStream(__dirname + '/fixtures/test.png'))
  form.submit(serverURI, function (err, res) {
    t.equal(err, null)
    t.ok(res)
    request(serverURI, function (error, response, body) {
      t.equal(error, null)
      t.ok(response)
      body = JSON.parse(body)
      t.equal(body[0].value.name, 'test.png')
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
  form.submit(serverURI, function (err, res) {
    t.equal(err, null)
    t.ok(res)
    res.on('data', function (chunk) {
      response += chunk
    })
    res.on('end', function () {
      var file = JSON.parse(response)[0]
      t.equal(file.name, 'test.png')
      after()
    })
  })
})

test('teardown media', function (t) {
  media.createReadStream()
    .on('data', function (data) {
      media.delete(data.key, function (err) {
        t.notOk(err)
      })
    })
    .on('end', function () {
      db.close()
      t.end()
    })
})
