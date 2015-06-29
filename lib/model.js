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
      size: {type: 'number'},
      path: {type: 'string'},
      type: {type: 'string'},
      lastModifiedDate: {type: 'string'}
    },
    indexKeys: ['name', 'type'],
    required: ['name', 'size', 'path']
  })

  Model.call(this, db, options)
}

/**
 * Mixins
 */
inherits(Media, Model)
