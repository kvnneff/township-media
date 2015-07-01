try {
  require('dotenv').load()
} catch (err) {}

var exec = require('child_process').exec
var fs = require('fs')
var mkdirp = require('mkdirp')
var request = require('request')
var test = require('tape')
var memdown = require('memdown')
var township = require('township')
var levelup = require('levelup')
var db = levelup('db', {db: memdown})
var app = require('../')
var media = require('../lib/model')(db)

var serverURI = 'http://127.0.0.1:4243/api/v1/media'
var uploadDir = __dirname + '/media_uploads'
var server

function getRequestParams () {
  return {
    url: serverURI,
    formData: {
      attachments: [fs.createReadStream(__dirname + '/fixtures/file_1.png')]
    }
  }
}

/**
 * Create a new server instance and upload directory
 */
function before (pluginOptions) {
  pluginOptions = pluginOptions || {}
  server = township(db, {apps: [app(db, pluginOptions)]})
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

// function sendForm (cb) {

// }

/**
 * Tests
 */
test('upload a file to disk storage', function (t) {
  t.plan(4)
  before({uploadDir: uploadDir})
  request.post(getRequestParams(), function (err, res, body) {
    t.equal(err, null, 'error is equal to null')
    t.ok(res, 'response is truthy')
    t.ok(body, 'body is truthy')
    var file = JSON.parse(body)[0]
    t.equal(file.name, 'file_1.png', 'file.name is equal to file_1.png')
    after()
  })
})

test('upload multiple files to disk storage', function (t) {
  t.plan(5)
  before({uploadDir: uploadDir})
  var expected = [{name: 'file_1.png'}, {name: 'file_2.png'}]
  var params = getRequestParams()
  params.formData.attachments.push(fs.createReadStream(__dirname + '/fixtures/file_2.png'))
  request.post(params, function (err, res, body) {
    t.equal(err, null, 'error is equal to null')
    t.ok(res, 'response is truthy')
    t.ok(body, 'body is truthy')
    var files = JSON.parse(body)
    for (var i = files.length; i--;) {
      t.equal(files[i].name, expected[i].name, 'file.name is equal to expected.name')
    }
    after()
  })
})

test('get a list of media resources', function (t) {
  t.plan(4)
  before({uploadDir: uploadDir})
  request(serverURI, function (err) {
    if (err) throw err
    request(getRequestParams(), function (err, res, body) {
      t.equal(err, null, 'error is equal to null')
      t.ok(res, 'response is truthy')
      t.ok(body, 'body is truthy')
      body = JSON.parse(body)
      t.equal(body[0].value.name, 'file_1.png', 'body[0].value.name is equal to file_1.png')
      after()
    })
  })
})

test('get a single media resource', function (t) {
  before({uploadDir: uploadDir})
  request(serverURI, function (err, res, body) {
    if (err) throw err
    var file = JSON.parse(body)[0]
    request(serverURI + '/' + file.key, function (err, response, body) {
      t.equal(err, null, 'err is null')
      t.ok(response, 'response is truthy')
      t.equal(JSON.parse(body).name, 'file_1.png')
      after()
      t.end()
    })
  })
})

test('upload a file to s3', function (t) {
  t.plan(4)
  before({
    accessKeyId: process.env.S3_ACCESS_KEY,
    secretAccessKey: process.env.S3_SECRET_KEY,
    bucket: process.env.S3_BUCKET
  })
  request.post(getRequestParams(), function (err, res, body) {
    t.equal(err, null, 'error is null')
    t.ok(res, 'response is truthy')
    t.ok(body, 'body is truthy')
    var file = JSON.parse(body)[0]
    t.equal(file.name, 'file_1.png')
    after()
  })
})

test('delete a file from disk storage', function (t) {
  t.plan(3)
  before({uploadDir: uploadDir})
  request.post(getRequestParams(), function (err, res, body) {
    if (err) throw err
    var file = JSON.parse(body)[0]
    request.del(serverURI + '/' + file.key, function (err, res, body) {
      t.equal(err, null, 'err is null')
      t.ok(res, 'response is truthy')
      t.equal(res.statusCode, 204, 'statusCode is 204')
      after()
    })
  })
})

test('delete a file from s3', function (t) {
  before({
    accessKeyId: process.env.S3_ACCESS_KEY,
    secretAccessKey: process.env.S3_SECRET_KEY,
    bucket: process.env.S3_BUCKET
  })
  request.post(getRequestParams(), function (err, res, body) {
    if (err) throw err
    var file = JSON.parse(body)[0]
    request.del(serverURI + '/' + file.key, function (err, response, body) {
      t.equal(err, null, 'err is null')
      t.ok(response, 'response is truthy')
      t.equal(response.statusCode, 204, 'statusCode is 204')
      after()
      t.end()
    })
  })
})

test('teardown media', function (t) {
  media.createReadStream()
    .on('data', function (data) {
      media.delete(data.key, function (err) {
        t.notOk(err, 'model deleted')
      })
    })
    .on('end', function () {
      db.close()
      t.end()
    })
})
