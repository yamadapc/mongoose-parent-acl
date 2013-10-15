var _ = require('underscore');

// options defaults
var defaults = {
  method_map: {
    'post'  : 'create',
    'put'   : 'update',
    'get'   : 'show',
    'delete': 'destroy'
  },
  user_path: 'user'
};

/**
 * Public functions
 * --------------------------------------------------------------------------*/

/**
 * middleware.hasPermissions
 *
 * Generates express permission middleware, to be used with mongoose-acl
 */

exports.hasPermissions = function(target_model, perms, options) {
  options = _.extend(defaults, options);

  perms instanceof Array || (perms = _.compact([perms]));

  return function(req, res, next) {
    var subject = req[options.user_path],
        object  = req[target_model],
        parent  = options.parent_path && req[options.parent_path];

    // If target object, or subject are undefined, deny access
    if(!subject || !object) {
      return unauthorized(res);
    }

    // Extract the necessary permissions
    _.isEmpty(perms) && (perms = [options.method_map[req.method.toLowerCase()]]);

    if(options.verbose) {
      console.log('Checking if subject:' + subject._id +
                  ' has permissions ' + perms + ' over ' +
                   target_model + ':' + object._id);
    }

    // Check if subject has these permissions
    if(excludesAny(subject.getAccess(object, parent), perms)) {
      return unauthorized(res);
    }

    next();
  };
};

/**
 * middleware.hasRoles
 *
 * Generates middleware for checking if a user has the 'roles'
 */

exports.hasRoles = function(roles, options) {
  roles instanceof Array || (roles = [roles]);

  return function(req, res, next) {
    var user_roles = req[options.user_path].roles;
    return excludesAny(user_roles, roles) ? unauthorized(res) : next();
  };
};

/**
 * Utility functions
 * --------------------------------------------------------------------------*/

/**
 * middleware._unauthorized(res)
 *
 * Abstracts away what happens upon permissions' denial
 */

var unauthorized = exports._unauthorized = function (res) {
  return res.json(401, {error: 'Unauthorized'});
};

var excludesAny = exports._excludesAny = function(array, other) {
  return !_.isEmpty(_.difference(other, array));
};
