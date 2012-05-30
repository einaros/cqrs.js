var expect = require('expect.js')
  , assert = require('assert')
  , Repository = require('../lib/repository')
  , util = require('util')
  , Event = require('../lib/event')
  , AggregateRoot = require('../lib/aggregateroot');

describe('EventSourcing', function() {
  describe('Repository', function() {
    describe('Creating Objects', function() {
      it('creates object using object dictionary, applies a creation event with name and id', function() {
        var store = {
          loadEvents: function(aggregateType, aggregateId, sinceVersion, cb) {},
          saveEvents: function(aggregateType, aggregateId, expectedVersion, events, cb) {}
        };

        function ObjectType(type, id) {
          this.events = [];
        }
        ObjectType.prototype.applyEvent = function(event) {
          this.events.push(event);
        }

        var typeDictionary = {
          'ObjectType': { constructor: ObjectType, creationEvent: 'NewObjectType' }
        };
        var repos = new Repository(store, typeDictionary);

        var obj = repos.create('ObjectType', {foo: 'bar'});
        expect(obj).to.be.an(ObjectType);
        expect(obj.events.length).to.equal(1);
        expect(obj.events[0].type).to.equal('NewObjectType');
        expect(obj.events[0].data.foo).to.equal('bar');
      });
    });

    describe('Getting Objects', function() {
      it('restores objects by replay event stream', function(done) {
        // Dummy event store
        var store = {
          loadEvents: function(aggregateType, aggregateId, sinceVersion, cb) {
            cb([
              Event.make('NewObjectType'),
              Event.make('SetValue', {value: 100}),
              Event.make('MultiplyValue', {value: 5})
            ]);
          },
          saveEvents: function(aggregateType, aggregateId, expectedVersion, events, cb) {}
        };

        function ObjectType(type, id) {
        }
        util.inherits(ObjectType, AggregateRoot);
        AggregateRoot.defineEventHandler(ObjectType, 'NewObjectType', function(value) {});
        AggregateRoot.defineEventHandler(ObjectType, 'SetValue', function(args) {
          this.value =  args.value;
        });
        AggregateRoot.defineEventHandler(ObjectType, 'MultiplyValue', function(args) {
          this.value *= args.value;
        });

        // Repository
        var typeDictionary = {
          'ObjectType': { constructor: ObjectType, creationEvent: 'NewObjectType' }
        };
        var repos = new Repository(store, typeDictionary);

        // Use repository
        repos.get('ObjectType', 101, function(obj) {
          repos.get('ObjectType', 101, function(objDupe) {
            expect(obj).to.not.be(objDupe); // verify that we get two separate objects
            expect(obj).to.be.an(ObjectType);
            expect(obj.value).to.equal(500);
            done();
          });
        });
      });

      it('returns null if object isn\'t found', function(done) {
        // Dummy event store
        var store = {
          loadEvents: function(aggregateType, aggregateId, sinceVersion, cb) {
            cb(null);
          },
          saveEvents: function(aggregateType, aggregateId, expectedVersion, events, cb) {}
        };

        function ObjectType(type, id) {
        }
        util.inherits(ObjectType, AggregateRoot);
        AggregateRoot.defineEventHandler(ObjectType, 'NewObjectType', function(value) {});

        // Repository
        var typeDictionary = {
          'ObjectType': { constructor: ObjectType, creationEvent: 'NewObjectType' }
        };
        var repos = new Repository(store, typeDictionary);

        // Use repository
        repos.get('ObjectType', 101, function(obj) {
          expect(obj).to.equal(null);
          done();
        });
      });
    });

    describe('Saving Objects', function() {
      describe('Without an event conflict', function() {
        it('All uncommitted events are saved to the eventstore', function(done) {
          var saveEventsCalled = false;

          // Dummy event store
          var store = {
            loadEvents: function(aggregateType, aggregateId, sinceVersion, cb) {
              cb([
                Event.make('NewObjectType'),
                Event.make('SetValue', {value: 100}),
                Event.make('MultiplyValue', {value: 5})
              ]);
            },
            saveEvents: function(aggregateType, aggregateId, expectedVersion, events, cb) {
              saveEventsCalled = true;
              expect(expectedVersion).to.equal(2);
              expect(events.length).to.equal(1);
              expect(events[0].type).to.equal('DivideValue');
              expect(events[0].data.value).to.equal(5);
              cb();
            }
          };

          function ObjectType(type, id) {}
          util.inherits(ObjectType, AggregateRoot);
          ObjectType.prototype.divide = function(value) {
            this.applyEvent(Event.make('DivideValue', {value: 5}));
          }
          AggregateRoot.defineEventHandler(ObjectType, 'NewObjectType', function(value) {});
          AggregateRoot.defineEventHandler(ObjectType, 'SetValue', function(args) { this.value =  args.value; });
          AggregateRoot.defineEventHandler(ObjectType, 'MultiplyValue', function(args) { this.value *= args.value; });
          AggregateRoot.defineEventHandler(ObjectType, 'DivideValue', function(args) { this.value /= args.value; });

          // Repository
          var typeDictionary = {
            'ObjectType': { constructor: ObjectType, creationEvent: 'NewObjectType' }
          };
          var repos = new Repository(store, typeDictionary);

          // Use repository
          repos.get('ObjectType', 101, function(obj) {
            repos.get('ObjectType', 101, function(objDupe) {
              expect(obj).to.not.be(objDupe); // verify that we get two separate objects
              expect(obj).to.be.an(ObjectType);
              expect(obj.value).to.equal(500);
              obj.divide(5);
              expect(obj.value).to.equal(100);
              repos.save('ObjectType', 101, obj, 2, function(err) {
                expect(typeof err).to.equal('undefined');
                expect(saveEventsCalled).to.equal(true);
                done();
              });
            });
          });
        });
      });

      describe('With a conflict', function() {
        it('When events can be merged, they are merged and saved', function(done) {
          var saveEventsCalled = 0;
          var loadEventsCalled = 0;

          // Dummy event store
          var store = {
            loadEvents: function(aggregateType, aggregateId, sinceVersion, cb) {
              if (++loadEventsCalled == 1) {
                expect(sinceVersion).to.equal(-1);
                cb([
                  Event.make('NewObjectType'),
                  Event.make('SetValue', {value: 100}),
                  Event.make('MultiplyValue', {value: 5})
                ]);
              }
              else {
                expect(sinceVersion).to.equal(2);
                cb([
                  Event.make('MultiplyValue', {value: 2})
                ]);
              }
            },
            saveEvents: function(aggregateType, aggregateId, expectedVersion, events, cb) {
              if (++saveEventsCalled == 1) {
                cb(new Error('ConcurrencyException'));
              }
              else if (saveEventsCalled == 2) {
                expect(expectedVersion).to.equal(2);
                expect(events.length).to.equal(1);
                expect(events[0].type).to.equal('DivideValue');
                expect(events[0].data.value).to.equal(10); // a divide merged against the multiply we injected
                cb();
              }
              else done(new Error('three calls? I should think not'))
            }
          };

          function ObjectType(type, id) {}
          util.inherits(ObjectType, AggregateRoot);
          ObjectType.prototype.divide = function(value) {
            this.applyEvent(Event.make('DivideValue', {value: 5}));
          }
          AggregateRoot.defineEventHandler(ObjectType, 'NewObjectType', function(value) {});
          AggregateRoot.defineEventHandler(ObjectType, 'SetValue', function(args) { this.value =  args.value; });
          AggregateRoot.defineEventHandler(ObjectType, 'MultiplyValue', function(args) { this.value *= args.value; });
          AggregateRoot.defineEventHandler(ObjectType, 'DivideValue', function(args) { this.value /= args.value; });

          // Repository
          var typeDictionary = {
            'ObjectType': { constructor: ObjectType, creationEvent: 'NewObjectType' }
          };
          // Merge dictionary
          var mergeDictionary = {
            // When a DivideValue event has to merged ...
            'DivideValue': {
              // ... against a MultiplyValue, which has arrived since the DivideValue happened
              'MultiplyValue': function(object, mergeEvent, againstEvent) {
                // ... the goal is to adjust the MultiplyValue event so that when the intermediate event is run first
                // and the MultiplyValue event runs after, the resulting value should be the same as was expected from
                // just running the MultiplyValue.
                mergeEvent.data.value *= againstEvent.data.value;
              }
            }
          };
          var repos = new Repository(store, typeDictionary, mergeDictionary);

          // Use repository
          repos.get('ObjectType', 101, function(obj) {
            expect(obj).to.be.an(ObjectType);
            expect(obj.value).to.equal(500);
            obj.divide(5);
            expect(obj.value).to.equal(100);
            repos.save('ObjectType', 101, obj, 2, function(err) {
              expect(typeof err).to.equal('undefined');
              expect(saveEventsCalled).to.equal(2);
              expect(obj.value).to.equal(100); // still expect obj.value to be 100
              done();
            });
          });
        });

        it('When events cannot be merged, yields an error', function(done) {
          var saveEventsCalled = 0;
          var loadEventsCalled = 0;

          // Dummy event store
          var store = {
            loadEvents: function(aggregateType, aggregateId, sinceVersion, cb) {
              if (++loadEventsCalled == 1) {
                expect(sinceVersion).to.equal(-1);
                cb([
                  Event.make('NewObjectType'),
                  Event.make('SetValue', {value: 100}),
                  Event.make('MultiplyValue', {value: 5})
                ]);
              }
              else {
                expect(sinceVersion).to.equal(2);
                cb([
                  Event.make('MultiplyValue', {value: 2})
                ]);
              }
            },
            saveEvents: function(aggregateType, aggregateId, expectedVersion, events, cb) {
              if (++saveEventsCalled == 1) {
                cb(new Error('ConcurrencyException'));
              }
              else if (saveEventsCalled == 2) {
                expect(expectedVersion).to.equal(2);
                expect(events.length).to.equal(1);
                expect(events[0].type).to.equal('DivideValue');
                expect(events[0].data.value).to.equal(10); // a divide merged against the multiply we injected
                cb();
              }
              else done(new Error('three calls? I should think not'))
            }
          };

          function ObjectType(type, id) {}
          util.inherits(ObjectType, AggregateRoot);
          ObjectType.prototype.divide = function(value) {
            this.applyEvent(Event.make('DivideValue', {value: 5}));
          }
          AggregateRoot.defineEventHandler(ObjectType, 'NewObjectType', function(value) {});
          AggregateRoot.defineEventHandler(ObjectType, 'SetValue', function(args) { this.value =  args.value; });
          AggregateRoot.defineEventHandler(ObjectType, 'MultiplyValue', function(args) { this.value *= args.value; });
          AggregateRoot.defineEventHandler(ObjectType, 'DivideValue', function(args) { this.value /= args.value; });

          // Repository
          var typeDictionary = {
            'ObjectType': { constructor: ObjectType, creationEvent: 'NewObjectType' }
          };
          var mergeDictionary = {
            'DivideValue': {}
          };
          var repos = new Repository(store, typeDictionary, mergeDictionary);

          // Use repository
          repos.get('ObjectType', 101, function(obj) {
            expect(obj).to.be.an(ObjectType);
            expect(obj.value).to.equal(500);
            obj.divide(5);
            expect(obj.value).to.equal(100);
            repos.save('ObjectType', 101, obj, 2, function(err) {
              expect(err.message).to.equal('ConcurrencyException');
              done();
            });
          });
        });

      });
    });
  });
});