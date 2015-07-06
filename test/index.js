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
var media = require('../lib/model')({db: db})
var server

var staticFileDir = process.cwd() + '/assets'
var serverURI = 'http://127.0.0.1:4243/api/v1/media'
var s3Options = {
  accessKeyId: process.env.S3_ACCESS_KEY,
  secretAccessKey: process.env.S3_SECRET_KEY,
  bucket: process.env.S3_BUCKET
}

/**
 * Create a new server instance and upload directory
 */
var test = beforeEach(test, function before (assert) {
  server = township(db)
  server.add(app({staticFileDir: staticFileDir}))
  server.listen()
  mkdirp(staticFileDir)
  assert.end()
})

test = afterEach(test, function after (assert) {
  server._server.close()
  exec('rm -rf ' + staticFileDir, function (err) {
    if (err) throw err
    assert.end()
  })
})

function getRequestParams () {
  return {
    url: serverURI,
    formData: {
      attachments: [fs.createReadStream(__dirname + '/fixtures/file_1.png')]
    }
  }
}

/**
 * Tests
 */
test('upload a file to disk storage', function (assert) {
  request.post(getRequestParams(), function (err, res, body) {
    assert.equal(err, null, 'error is equal to null')
    assert.ok(res, 'response is truthy')
    assert.ok(body, 'body is truthy')
    var file = JSON.parse(body)[0]
    assert.equal(file.name, 'file_1.png', 'file.name is equal to file_1.png')
    assert.end()
  })
})

test('upload multiple files to disk storage', function (assert) {
  var expected = [{name: 'file_1.png'}, {name: 'file_2.png'}]
  var params = getRequestParams()
  params.formData.attachments.push(fs.createReadStream(__dirname + '/fixtures/file_2.png'))
  request.post(params, function (err, res, body) {
    assert.equal(err, null, 'error is equal to null')
    assert.ok(res, 'response is truthy')
    assert.ok(body, 'body is truthy')
    var files = JSON.parse(body)
    for (var i = files.length; i--;) {
      assert.equal(files[i].name, expected[i].name, 'file.name is equal to expected.name')
    }
    assert.end()
  })
})

test('upload a file to s3', function (assert) {
  server.remove('media')
  server.add(app(s3Options))
  request.post(getRequestParams(), function (err, res, body) {
    assert.equal(err, null, 'error is null')
    assert.ok(res, 'response is truthy')
    assert.ok(body, 'body is truthy')
    var file = JSON.parse(body)[0]
    assert.equal(file.name, 'file_1.png')
    assert.end()
  })
})

test('get a list of media resources', function (assert) {
  request(serverURI, function (err) {
    if (err) throw err
    request(getRequestParams(), function (err, res, body) {
      assert.equal(err, null, 'error is equal to null')
      assert.ok(res, 'response is truthy')
      assert.ok(body, 'body is truthy')
      body = JSON.parse(body)
      assert.equal(body[0].value.name, 'file_1.png', 'body[0].value.name is equal to file_1.png')
      assert.end()
    })
  })
})

test('get a single media resource', function (assert) {
  request(serverURI, function (err, res, body) {
    if (err) throw err
    var file = JSON.parse(body)[0]
    request(serverURI + '/' + file.key, function (err, response, body) {
      assert.equal(err, null, 'err is null')
      assert.ok(response, 'response is truthy')
      assert.equal(JSON.parse(body).name, 'file_1.png')
      assert.end()
    })
  })
})

test('update a media resource on disk storage', function (assert) {
  request.post(getRequestParams(), function (err, res, body) {
    if (err) throw err
    var file = JSON.parse(body)[0]
    var params = {
      url: serverURI + '/' + file.key,
      body: {'name': 'file_3.png'},
      json: true
    }
    request.put(params, function (err, res, body) {
      assert.equal(err, null, 'err is null')
      assert.ok(res, 'response is truthy')
      assert.equal(body.name, 'file_3.png')
      assert.end()
    })
  })
})

test('update a media resource on s3', function (assert) {
  server.remove('media')
  server.add(app(s3Options))
  request.post(getRequestParams(), function (err, res, body) {
    if (err) throw err
    var file = JSON.parse(body)[0]
    var params = {
      url: serverURI + '/' + file.key,
      body: {'name': 'file_3.png'},
      json: true
    }
    request.put(params, function (err, res, body) {
      assert.equal(err, null, 'err is null')
      assert.ok(res, 'response is truthy')
      assert.equal(body.name, 'file_3.png')
      assert.end()
    })
  })
})

test('delete a file from disk storage', function (assert) {
  request.post(getRequestParams(), function (err, res, body) {
    if (err) throw err
    var file = JSON.parse(body)[0]
    request.del(serverURI + '/' + file.key, function (err, res, body) {
      assert.equal(err, null, 'err is null')
      assert.ok(res, 'response is truthy')
      assert.equal(res.statusCode, 204, 'statusCode is 204')
      assert.end()
    })
  })
})

test('delete a file from s3', function (assert) {
  server.remove('media')
  server.add(app(s3Options))
  request.post(getRequestParams(), function (err, res, body) {
    if (err) throw err
    var file = JSON.parse(body)[0]
    request.del(serverURI + '/' + file.key, function (err, response, body) {
      assert.equal(err, null, 'err is null')
      assert.ok(response, 'response is truthy')
      assert.equal(response.statusCode, 204, 'statusCode is 204')
      assert.end()
    })
  })
})

test('teardown media', function (assert) {
  media.createReadStream()
    .on('data', function (data) {
      media.delete(data.key, function (err) {
        assert.notOk(err, 'model deleted')
      })
    })
    .on('end', function () {
      db.close()
      assert.end()
    })
})

function beforeEach (test, handler) {
  return function tapish (name, listener) {
    test(name, function (assert) {
      var _end = assert.end
      assert.end = function () {
        assert.end = _end
        listener(assert)
      }

      handler(assert)
    })
  }
}

function afterEach (test, handler) {
  return function tapish (name, listener) {
    test(name, function (assert) {
      var _end = assert.end
      assert.end = function () {
        assert.end = _end
        handler(assert)
      }

      listener(assert)
    })
  }
}
