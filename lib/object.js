
/**
 * Dependencies
 * --------------------------------------------------------------------------*/

var _ = require('lodash');

/**
 * Object plugin
 * --------------------------------------------------------------------------*/

module.exports = function(schema, options) {
  options = _.defaults(options || {}, DEFAULT_OPTIONS);

  var isRole = _.partial(startsWith, options.role_prefix);

  // Add the options.path 'path' to the schema - should it not exist
  var fields = {};
  if(!schema.paths[options.path]) fields[options.path] = {};
  schema.add(fields);

  // Define the methods
  schema.methods.expandRoles = function(permissions) {
    var acl = this[options.path] || (this[options.path] = {});

    return _.flatten(_.map(permissions, function(item) {
      if(isRole(item) && acl[item]) return acl[item];
      else return item;
    }));
  };

  schema.methods.getChildAccess = function(child) {
    var key = options.key.call(this);
    return child.getAccess(key);
  };

  schema.methods.setParentAccess = function(parent, perms) {
    var key = options.key.call(parent);
    return this.setAccess(key, parent.expandRoles(perms));
  };

  schema.methods.setAccess = function(key, perms) {
    perms || (perms = []);
    this[options.path] || (this[options.path] = {});
    this[options.path][key] = this.expandRoles(perms);
    this.markModified(options.path);
  };

  schema.methods.getAccess = function(key) {
    var acl = this[options.path] || {};
    var permissions = acl[key] || [];
    return permissions;
  };

  schema.methods.keysWithAccess = function(perms) {
    perms || (perms = []);
    var acl = this[options.path] || {};

    // Extract keys with access
    return _.reduce(acl, function(memo, key_perms, key) {
        if(_.isEmpty(_.difference(perms, key_perms)))
            memo.push(key);
        return memo;
    }, []);
  };

  schema.methods.roleKey = function(role) {
    return options.role_prefix + role;
  };

  schema.methods.setRole = function(role, perms) {
    return this.setAccess(schema.methods.roleKey(role), perms);
  };

  var toJSON = schema.methods.toJSON;
  schema.methods.toJSON = function() {
    var data = toJSON ? toJSON.call(this) : this.toObject();
    delete data[options.path];
    return data;
  };

  // Statics

  schema.statics.withAccess = function(subject, perms, parent, callback) {
    var keys = subject.getAccessKeys();

    if(parent && _.isEmpty(_.difference(perms, parent.getAccess && subject.getAccess(parent))))
      keys.push(options.key.call(parent));

    var or = keys.map(function(key) {
      var query = {};
      var path = [options.path, key].join('.');

      query[path] = { $all: perms };
      return query;
    });

    var cursor = this.find({ $or: or });

    if(callback) cursor.exec(callback);

    return cursor;
  };
};


/**
 * Utility functions
 * --------------------------------------------------------------------------*/

function startsWith(prefix, item) {
  return item.indexOf(prefix) === 0;
}


/**
 * Constants and mappings
 * --------------------------------------------------------------------------*/

var DEFAULT_OPTIONS = {
  path: '_acl',
  role_prefix: 'role:',
  key: function() { return 'parent:'+this._id; },
};
