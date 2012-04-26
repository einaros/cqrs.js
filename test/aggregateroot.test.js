var expect = require('expect.js')
  , AggregateRoot = require('../lib/aggregateroot')
  , util = require('util');

describe('AggregateRoot', function() {
  describe('#applyEvent', function() {
    it('stores the event as uncommitted', function() {
      function TestObject() {};
      util.inherits(TestObject, AggregateRoot);
      var obj = new TestObject();
      obj.applyEvent({type: 'SomeEvent', data: {a: 1, b: 2, c: 3}})
      expect(obj._uncomittedEvents.length).to.equal(1);
    });

    it('doesnt store the event as uncommitted if a second parameter is set to true', function() {
      function TestObject() {};
      util.inherits(TestObject, AggregateRoot);
      var obj = new TestObject();
      obj.applyEvent({type: 'SomeEvent', data: {a: 1, b: 2, c: 3}}, true)
      expect(obj._uncomittedEvents.length).to.equal(0);
    });

    it('calls handler for an event', function() {
      var handlerCalled = false;

      // Define class
      function TestObject() {};
      util.inherits(TestObject, AggregateRoot);
      AggregateRoot.defineEventHandler(TestObject, 'SomeEvent', function(args) {
        handlerCalled = true;
        expect(this).to.be(obj);
        expect(args.a).to.equal(1);
        expect(args.b).to.equal(2);
        expect(args.c).to.equal(3);
      });

      // Use object
      var obj = new TestObject();
      obj.applyEvent({type: 'SomeEvent', data: {a: 1, b: 2, c: 3}})
      expect(handlerCalled).to.equal(true);
    });
  });

  describe('#getUncommittedEvents', function() {
    it('returns uncommitted events', function() {
      function TestObject() {};
      util.inherits(TestObject, AggregateRoot);
      var obj = new TestObject();
      obj.applyEvent({type: 'SomeEvent', arguments: {a: 1, b: 2, c: 3}})
      expect(obj.getUncommittedEvents().length).to.equal(1);
    });
  });

  describe('#clearUncommittedEvents', function() {
    it('clears the array of uncommitted events', function() {
      function TestObject() {};
      util.inherits(TestObject, AggregateRoot);
      var obj = new TestObject();
      obj.applyEvent({type: 'SomeEvent', arguments: {a: 1, b: 2, c: 3}}, true)
      obj.clearUncommittedEvents();
      expect(obj.getUncommittedEvents().length).to.equal(0);
    });
  });
});
