module.exports = function (db, options, township) {
  var model = require('./model')(db, options, township)
  var handler = require('./handler')(model, options, township)
  var routes = require('./routes')(handler, options, township)

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
