var assert = require('assert'),
    middleware = require('../lib/middleware');

describe('Middleware', function() {
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
