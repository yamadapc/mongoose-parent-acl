var assert = require('assert');
var mongoose = require('mongoose');
var sinon = require('sinon');
var object = require('../lib/object');

describe('Object', function() {
    var model, Test, parent_model, ParentTest;

    before(function() {
        var schema = new mongoose.Schema();
        schema.plugin(object, {
            path: '_acl'
        });

        Test = mongoose.model('test', schema);
    });

    before(function() {
        var schema = new mongoose.Schema();
        schema.plugin(object, {
            path: '_acl'
        });

        ParentTest = mongoose.model('parenttest', schema);
    });

    beforeEach(function() {
        model = new Test();
    });

    beforeEach(function() {
        parent_model = new ParentTest();
    });

    describe('when setting permissions', function() {
        beforeEach(function() {
            model.setAccess('foo', ['bar']);
        });

        it('sets permissions in acl', function() {
            assert.deepEqual(model._acl.foo, ['bar']);
            assert.deepEqual(model.getAccess('foo'), ['bar']);
        });

        it('marks acl as modified', function() {
            assert.ok(model.isModified('_acl'));
        });
    });

    describe('when getting permission cursor', function() {
        var find, cursor, subject;

        beforeEach(function() {
            subject = {
                getAccessKeys: function() {
                    return ['foo', 'bar'];
                },
                getAccess: function(object) {
                    return object.getAccess(/*key*/);
                }
            };
        });

        it('creates $or query for all access keys and perms', function() {
            find = sinon.spy(Test, 'find');
            var cursor = Test.withAccess(subject, ['baz', 'qux']);

            assert.ok(find.calledOnce);

            var query = find.getCall(0).args[0];

            assert.deepEqual(query, {
                $or: [
                    { '_acl.foo': { $all: ['baz', 'qux'] }},
                    { '_acl.bar': { $all: ['baz', 'qux'] }}
                ]
            });
        });

        it('creates $or query for all access keys and perms including those of the parent', function() {
            var parent = {
              _id: 'parent_id',
              getAccess: function(/*subject*/) {
                return ['baz', 'qux'];
              }
            };
            var cursor = Test.withAccess(subject, ['baz', 'qux'], parent);

            var query = find.getCall(1).args[0];

            assert.deepEqual(query, {
                $or: [
                    { '_acl.foo': { $all: ['baz', 'qux'] }},
                    { '_acl.bar': { $all: ['baz', 'qux'] }},
                    { '_acl.parent:parent_id': { $all: ['baz', 'qux'] }}
                 ]
            });

        });

        it('creates $or query for all access keys and perms including those of all the relevant parents', function() {
            var parent1 = {
              _id: 'parent1_id',
              getAccess: function(/*subject*/) {
                return ['baz', 'qux'];
              }
            };

            var parent2 = {
              _id: 'parent2_id',
              getAccess: function(/*subject*/) {
                return ['tes', 'ble'];
              }
            };

            var parent3 = {
              _id: 'parent3_id',
              getAccess: function(/*subject*/) {
                return ['baz', 'ble'];
              }
            };

            var cursor = Test.withAccess(subject, ['baz'], [parent1, parent2, parent3]);

            var query = find.getCall(2).args[0];

            assert.deepEqual(query, {
                $or: [
                    { '_acl.foo': { $all: ['baz'] }},
                    { '_acl.bar': { $all: ['baz'] }},
                    { '_acl.parent:parent1_id': { $all: ['baz'] }},
                    { '_acl.parent:parent3_id': { $all: ['baz'] }}
                 ]
            });

        });
    });

    describe('when getting keys with given permissions', function() {
        beforeEach(function() {
            model.setAccess('foo', ['a', 'b']);
            model.setAccess('bar', ['a']);
            model.setAccess('baz', ['b', 'c']);
        });

        it('returns keys that have all given permissions', function() {
            var keys = model.keysWithAccess(['a']);

            assert.equal(keys.length, 2);
            assert.ok(keys.indexOf('foo') !== -1);
            assert.ok(keys.indexOf('bar') !== -1);

            keys = model.keysWithAccess(['a', 'b']);

            assert.equal(keys.length, 1);
            assert.ok(keys.indexOf('foo') !== -1);

            keys = model.keysWithAccess(['b']);

            assert.equal(keys.length, 2);
            assert.ok(keys.indexOf('foo') !== -1);
            assert.ok(keys.indexOf('baz') !== -1);

            keys = model.keysWithAccess(['c']);

            assert.equal(keys.length, 1);
            assert.ok(keys.indexOf('baz') !== -1);

            keys = model.keysWithAccess(['a', 'c']);

            assert.equal(keys.length, 0);

            keys = model.keysWithAccess(['d']);

            assert.equal(keys.length, 0);
        });
    });

    describe('when setting a parent\'s access', function() {
        beforeEach(function() {
            model.setParentAccess(parent_model, ['a', 'b']);
        });

        it('sets parent\'s permissions in acl', function() {
            assert.deepEqual(model._acl['parent:'+parent_model._id], ['a', 'b']);
            assert.deepEqual(model.getAccess('parent:'+parent_model._id), ['a', 'b']);
        });

        it('marks acl as modified', function() {
            assert.ok(model.isModified('_acl'));
        });
    });

    describe('when getting access to a child', function() {
        var access;
        beforeEach(function() {
            model.setParentAccess(parent_model, ['a', 'b']);
            access = parent_model.getChildAccess(model);
        });

        it('returns all the permissions the parent has over the child', function(done) {
            assert.deepEqual(access, ['a', 'b']);
            done();
        });
    });

    describe('when getting access that relates to a role', function() {
        var access;
        beforeEach(function() {
            model.setAccess('role:owner', ['x', 'y', 'z', 'w']);
            model.setAccess('subject:foo', ['role:owner', 'a']);
            access = model.getAccess('subject:foo');
        });

        it('returns both the roles\' and the keys\' permissions', function() {
            assert.deepEqual(access, ['x', 'y', 'z', 'w', 'a']);
        });
    });

    describe('when getting access to a child and expanding roles', function() {
        var access;
        beforeEach(function() {
            model.setAccess('role:owner', ['h', 'i', 'j']);
            model.setParentAccess(parent_model, ['role:owner']);
            access = parent_model.getChildAccess(model);
        });

        it('returns all the permissions the parent\'s leaked role has over the child', function() {
            assert.deepEqual(access, ['h', 'i', 'j']);
        });
    });
});
