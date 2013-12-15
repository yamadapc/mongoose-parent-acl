
/**
 * Dependencies
 * --------------------------------------------------------------------------*/

var _ = require('lodash');

/**
 * Public functions
 * --------------------------------------------------------------------------*/

/**
 * middleware.hasPermissions
 *
 * Generates express permission middleware, to be used with mongoose-acl
 */

exports.hasPermissions = function(target_model, perms, options) {
  options = _.defaults(options || {}, DEFAULT_OPTIONS);

  perms instanceof Array || (perms = _.compact([perms]));

  return function(req, res, next) {
    var subject = req[options.user_path],
        object  = req[target_model],
        parents = getParents(req, options);

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
    if(excludesAny(subject.getAccess(object, parents), perms)) {
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
 * middleware._getParents(req, options)
 *
 * Gets parents based in the req and options objects
 */

var getParents = exports._getParents = function(req, options) {
  if(options.parent_path && req[options.parent_path])
    return [req[options.parent_path]];
  else if(options.parent_paths)
    return _.pluck(req, options.parent_paths);
  else return undefined;
};

/**
 * middleware._unauthorized(res)
 *
 * Abstracts away what happens upon permissions' denial
 */

var unauthorized = exports._unauthorized = function (res) {
  return res.json(401, {error: 'Unauthorized'});
};

/**
 * middleware._excludesAny(array, other)
 *
 * Compares two arrays and returns if the first excludes any of the second's
 * elements
 */

var excludesAny = exports._excludesAny = function(array, other) {
  return !_.isEmpty(_.difference(other, array));
};


/**
 * Constants and mappings
 * --------------------------------------------------------------------------*/


// options defaults
var DEFAULT_OPTIONS = {
  method_map: {
    'post'  : 'create',
    'put'   : 'update',
    'get'   : 'show',
    'delete': 'destroy'
  },
  user_path: 'user'
};

