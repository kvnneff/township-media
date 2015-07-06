module.exports = function (options) {
  options = options || {}

  return function (app) {
    var model = require('./model')(app, options)
    var handler = require('./handler')(model, options, app)
    var routes = require('./routes')(handler, options)

    return {
      name: 'media',
      model: model,
      schema: model.schema,
      handler: handler,
      routes: routes,
      serve: function (req, res) {
        return routes.match(req, res)
      }
    }
  }
}
