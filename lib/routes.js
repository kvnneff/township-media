var Router = require('match-routes')

/**
 * Export `Routes`
 */
module.exports = Routes

/**
 * Initialize `Routes` with `handler` and `options`
 * @param {Function} handler
 * @param {Object} options
 */
function Routes (handler, options) {
  var router = Router()
  var prefix = options.prefix || '/api/v1'

  router.on(prefix + '/media', handler.index.bind(handler))
  router.on(prefix + '/media/:key', handler.item.bind(handler))

  return router
}
