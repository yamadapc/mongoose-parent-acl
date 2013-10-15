var assert = require('assert');
var mongoose = require('mongoose');
var sinon = require('sinon');
var subject = require('../lib/subject');
var acl = require('../lib');

describe('Subject', function() {
    var model, Test;

    before(function() {
        var schema = new mongoose.Schema({
            additional: [String]
        });

        schema.plugin(subject, {
            public: '*',

            additionalKeys: function() {
                return this.additional.map(function(key) {
                    return 'additional:' + key;
                });
            }
        });

        Test = mongoose.model('Test', schema);
    });

    beforeEach(function() {
        model = new Test({ additional: ['foo', 'bar'] });
    });

    it('returns access keys', function() {
        var keys = model.getAccessKeys();
        assert.deepEqual(keys, ['subject:' + model._id, '*', 'additional:foo', 'additional:bar']);
    });

    describe('when getting access for entity', function() {
        var entity;

        beforeEach(function() {
            var access = {
                '*': ['a', 'b'],
                'additional:foo': ['a'],
                'additional:bar': ['c']
            };

            entity = {
                getAccess: function(key) {
                    return access[key] || [];
                }
            };
        });

        it('combines all permissions', function() {
            var perms = model.getAccess(entity);
            assert.deepEqual(perms, ['a', 'b', 'c']);
        });
    });

    describe('when setting access for an entity', function() {
        var entity, setAccess;

        beforeEach(function() {
            entity = {
                setAccess: function() {}
            };
            setAccess = sinon.spy(entity, 'setAccess');
        });

        it('sets permissions for subject key', function() {
            model.setAccess(entity, ['a']);
            assert.ok(setAccess.calledOnce);

            var key = setAccess.getCall(0).args[0];
            var perms = setAccess.getCall(0).args[1];

            assert.equal(key, 'subject:' + model._id);
            assert.deepEqual(perms, ['a']);
        });
    });

    describe('when dealing with roles for an entity', function() {
        var subject, Entity, object, other_object;

        before(function() {
            // Create subject
            subject = new Test();

            // Define Entity
            var EntitySchema = new mongoose.Schema({});
            EntitySchema.plugin(acl.object);
            Entity = mongoose.model('Entity', EntitySchema);
            // Create accessible entity
            object = new Entity();
            object .setRole('owner', ['x', 'y', 'z']);
            subject.setRoles(object,  ['owner']);

            // Create inaccessible entity
            other_object = new Entity();
            other_object.setRole('owner', ['l', 'm', 'n']);
        });

        it('sets and returns all permissions of a subject\'s role', function() {
            assert.deepEqual(subject.getAccess(object), ['x', 'y', 'z']);
        });

        it('and still considers that roles are object specific, not generic keys', function() {
            assert.deepEqual(subject.getAccess(other_object), []);
        });
    });

    describe('when dealing with an entity which has a parent', function() {
        var subject, Entity, object, parent;

        before(function() {
            // Create subject
            subject = new Test();

            Entity = mongoose.model('Entity');

            parent = new Entity();
            object = new Entity();

            object.setParentAccess(parent, ['write']);

            subject.setAccess(object, ['read']);
            subject.setAccess(parent, ['write']);
        });

        it('sets and returns all leaked permissions of a subject with the object', function() {
            assert.deepEqual(subject.getAccess(object, parent), ['read', 'write']);
        });
    });
});
