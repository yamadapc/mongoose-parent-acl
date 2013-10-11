var assert     = require('assert'),
    request    = require('supertest'),
    express    = require('express'),
    mongoose   = require('mongoose'),
    acl        = require('../lib'),
    object     = acl.object,
    subject    = acl.subject,
    middleware = acl.middleware;

var app = express();

describe('Middleware', function() {
  // middleware.hasPermissions()
  describe('#haspermissions', function() {
    var Post, User, user, posts;

    // Register Models
    before(function() {
      var PostSchema = new mongoose.Schema();
      PostSchema.plugin(object, {
        path: '_acl'
      });
      Post = mongoose.model('Post', PostSchema);
      var UserSchema = new mongoose.Schema();
      UserSchema.plugin(subject, {
        path: '_acl'
      });
      User = mongoose.model('User', UserSchema);
    });

    // Register documents
    before(function() {
      user = new User();
      posts = {
        'user_post' : new Post(),
        'other_post': new Post()
      };
      user.setAccess(posts.user_post, ['read', 'write']);
    });

    // Register route
    before(function() {
      function populate(req, res, next) {
        req.user = user;
        req.post = posts[req.params.post_id];
        next();
      }
      function respond(req, res) {
        res.json(200, {congrats: 'Success'});
      }
      app.get('/post/:post_id', populate, middleware.hasPermissions('post', 'read'), respond);
    });

    describe('when a user has access to the resource', function() {
      it('should respond successfuly', function(done) {
        request(app)
          .get('/post/'+'user_post')
          .expect(200)
          .end(function(err, res) {
            assert.ifError(err);
            assert.deepEqual(res.body, {congrats: 'Success'});
            done();
          });
      });
    });

    // Re-register route
    before(function() {
      function populate(req, res, next) {
        req.user = user;
        req.post = other_post;
        next();
      }
      function respond(req, res) {
        res.json(200, {congrats: 'Success'});
      }
      app.get('/post/:post_id', populate, middleware.hasPermissions('post', 'read'), respond);
    });

    describe('when a user doesn\'t have access to the resource', function() {
      it('should respond with Unauthorized', function(done) {
        request(app)
          .get('/post/'+'other_post')
          .expect(401)
          .end(function(err, res) {
            assert.ifError(err);
            assert.deepEqual(res.body, {error: 'Unauthorized'});
            done();
          });
      });
    });
  });

  // middleware._excludesAny()
  describe('#_excludesAny', function() {
    function test(array, other, expected_value) {
      return function(done) {
        var value = middleware._excludesAny(array, other);
        assert.equal(value, expected_value, 'Expected '+value+' to equal '+expected_value);
        done();
      };
    }
    describe('when first array has same elements the second', function() {
      it('returns false', test([0, 1, 2, 3, 4], [0, 2, 3, 1, 4], false));
    });
    describe('when first array has all elements the second has, plus a few', function() {
      it('returns false', test([0, 1, 2, 3, 4, 5], [0, 2, 1, 1, 4], false));
    });
    describe('when first array misses some of the elements of the second', function() {
      it('returns true', test([0, 1, 2], [5, 1], true));
    });
  });
});
