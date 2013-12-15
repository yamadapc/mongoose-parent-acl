var _ = require('lodash');

module.exports = function(schema, options) {
  options = _.defaults(options || {}, DEFAULT_OPTIONS);

  if (!options.additionalKeys) {
    options.additionalKeys = function() {
        return [];
    };
  }

  // Methods

  schema.methods.getAccessKeys = function() {
    var key = options.key.call(this);
    var additional = options.additionalKeys.call(this);
    var keys = [key, options.public].concat(additional);

    return keys.filter(function(key) { return !!key; });
  };

  schema.methods.getAccess = function(object, parents) {
    var _this = this;

    if(!(parents instanceof Array))
      parents = Array.prototype.slice.call(arguments, 1);

    var accessKeys = this.getAccessKeys(),
        perms = _.reduce(accessKeys, function(memo, key) {
          return _.union(memo, object.getAccess(key));
        }, []);

    var leaked_perms = _.reduce(parents, function(memo, parent) {
      if(parent && parent.getChildAccess) {
        var parent_perms = _this.getAccess(parent);

        var intersection = _.intersection(parent.getChildAccess(object),
                                         parent_perms);

        return _.union(memo, intersection);
      } else return memo;
    }, []);

    return _.compact(_.union(perms, leaked_perms));
  };

  schema.methods.setAccess = function(object, perms) {
    var key = options.key.call(this);
    object.setAccess(key, perms);
  };

  schema.methods.setRoles = function(object, roles) {
    var setAccess = schema.methods.setAccess.bind(this);
    return setAccess(object, _.map(roles, object.roleKey));
  };
};


/**
 * Constants and mappings
 * --------------------------------------------------------------------------*/

var DEFAULT_OPTIONS = {
  path: '_acl',
  role_prefix: 'role:',
  key: function() { return 'subject:' + this._id; }
};
