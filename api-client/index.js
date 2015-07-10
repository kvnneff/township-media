module.exports = Media

function Media (client) {
  if (!(this instanceof Media)) return new Media(client)
  this.client = client
}

Media.prototype.get = function (key, options, cb) {
  return this.client.request('get', 'media/' + key, options, cb)
}

Media.prototype.list = function (options, cb) {
  return this.client.upload('get', 'media', options, cb)
}

Media.prototype.create = function (options, cb) {
  return this.client.request('post', 'media', options, cb)
}

Media.prototype.update = function (key, options, cb) {
  if (typeof key === 'object') {
    cb = options
    options = key
    key = options.key
  }
  return this.client.request('put', 'media/' + key, options, cb)
}

Media.prototype.delete = function (key, cb) {
  return this.client.request('delete', 'media/' + key, {}, cb)
}