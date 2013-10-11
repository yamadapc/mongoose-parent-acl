var _ = require('underscore');

// options defaults
var defaults = {
  method_map: {
    post: 'create',
    put : 'update',
    get : 'show',
    del : 'destroy'
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

  perms instanceof Array || (perms = [perms]);

  return function(req, res, next) {
    var subject = req[options.user_path],
        object  = req[target_model];

    // If target object, or subject are undefined, deny access
    if(!subject || !object) {
      return unauthorized(res);
    }

    // Extract the necessary permissions
    !_.isEmpty(perms) || (perms = [req.method.toLowerCase()]);

    // Check if subject has these permissions
    if(excludesAny(perms, subject.getAccess(object))) {
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
      excludesAny = inverse(includesAny);

  roles instanceof Array || (roles = [roles]);

  return function(req, res, next) {
    var user_roles = req[options.user_path].roles;
    return excludesAny(roles, user_roles) ? unauthorized(res) : next();
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
