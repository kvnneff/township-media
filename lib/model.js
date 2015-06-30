var Model = require('level-model')
var inherits = require('inherits')
var extend = require('extend')

/**
 * Expose `Media`
 */
module.exports = Media

/**
 * Initialize `Media` model with `db` and `options`
 * @param {LevelDB} db LevelDB Instance
 * @param {Object} options
 */
function Media (db, options) {
  if (!(this instanceof Media)) return new Media(db, options)
  options = extend(options || {}, {
    properties: {
      name: {type: 'string'},
      path: {type: 'string'},
      type: {type: 'string'}
    },
    indexKeys: ['name', 'type'],
    required: ['name', 'path']
  })

  Model.call(this, db, options)
}

/**
 * Mixins
 */
inherits(Media, Model)
