var _ = require('underscore');

module.exports = function(schema, options) {
    options || (options = {});
    options.path || (options.path = '_acl');
    options.role_prefix || (options.role_prefix = 'role:');

    if(!options.key) {
        options.key = function() {
            return 'parent:'+this._id;
        };
    }

    // Util functions

    var startsWith = function(prefix, item) {
        return item.indexOf(prefix) === 0;
    };

    var isRole = _.partial(startsWith, options.role_prefix);

    var expandRoles = function(acl, permissions) {
        return _.map(permissions, function(item) {
            if(isRole(item) && acl[item])
                return acl[item];
            return item;
        });
    };

    // Fields

    var fields = {};

    if (!schema.paths[options.path]) {
        fields[options.path] = {};
    }

    schema.add(fields);

    // Methods

    schema.methods.getChildAccess = function(child) {
        var key = options.key.call(this);
        return child.getAccess(key);
    };

    schema.methods.setParentAccess = function(parent, perms) {
        var key = options.key.call(parent);
        return this.setAccess(key, perms);
    };

    schema.methods.setAccess = function(key, perms) {
        perms || (perms = []);
        this[options.path] || (this[options.path] = {});
        this[options.path][key] = perms;
        this.markModified(options.path);
    };

    schema.methods.getAccess = function(key) {
        var acl = this[options.path] || {};
        var permissions = acl[key] || [];
        var expanded = _.flatten(expandRoles(acl, permissions));
        return expanded;
    };

    schema.methods.keysWithAccess = function(perms) {
        perms || (perms = []);

        var acl = this[options.path] || {};
        var length = perms.length;
        var keys = [];

        for (var key in acl) {
            var count = 0;

            for (var i = 0; i < length; i++) {
                if (acl[key].indexOf(perms[i]) !== -1) {
                    count++;
                }
            }

            if (count === length) {
                keys.push(key);
            }
        }

        return keys;
    };

    schema.methods.roleKey = function(role) {
        return options.role_prefix + role;
    };

    schema.methods.setRole = function(role, perms) {
        var setAccess = schema.methods.setAccess.bind(this);
        return setAccess(schema.methods.roleKey(role), perms);
    };

    var toJSON = schema.methods.toJSON;

    schema.methods.toJSON = function() {
        var data = toJSON ? toJSON.call(this) : this.toObject();
        delete data[options.path];
        return data;
    };

    // Statics

    schema.statics.withAccess = function(subject, perms, callback) {
        var keys = subject.getAccessKeys();

        var or = keys.map(function(key) {
            var query = {};
            var path = [options.path, key].join('.');

            query[path] = { $all: perms };
            return query;
        });

        var cursor = this.find({ $or: or });

        if (callback) {
            cursor.exec(callback);
        }

        return cursor;
    };
};
