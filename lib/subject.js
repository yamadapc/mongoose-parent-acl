var _ = require('underscore');

module.exports = function(schema, options) {
    options || (options = {});

    if (!options.key) {
        options.key = function() {
            return 'subject:' + this._id;
        };
    }

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

        return keys.filter(function(key) {
            return !!key;
        });
    };

    schema.methods.getAccess = function(object, parent) {
        var accessKeys = this.getAccessKeys(),
            perms = _.reduce(accessKeys, function(memo, key) {
              return _.union(memo, object.getAccess(key));
            }, []),
            parent_perms, leaked_perms;

        if(parent && parent.getChildAccess) {
          parent_perms = this.getAccess(parent);
          leaked_perms = _.intersection(parent.getChildAccess(object),
                                        parent_perms);
        }

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
