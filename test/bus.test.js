var expect = require('expect.js')
  , Bus = require('../lib/bus');

describe('Bus', function() {
  describe('#on', function() {
    it('captures events with a specific type', function(done) {
      var bus = new Bus();
      var handler1Called = false;
      bus.on('SomeEvent', function(eventType, descriptor, event) {
        expect(eventType).to.equal('SomeEvent');
        expect(descriptor.aggregateType).to.equal('SomeType');
        expect(descriptor.aggregateId).to.equal('SomeId');
        expect(descriptor.aggregateVersion).to.equal(100);
        expect(event.a).to.equal(1);
        handler1Called = true;
      });
      var handler2Called = false;
      bus.on('SomeEvent', function(eventType, descriptor, event) {
        expect(eventType).to.equal('SomeEvent');
        expect(descriptor.aggregateType).to.equal('SomeType');
        expect(descriptor.aggregateId).to.equal('SomeId');
        expect(descriptor.aggregateVersion).to.equal(100);
        expect(event.a).to.equal(1);
        handler2Called = true;
      });
      bus.emit('SomeEvent', { aggregateType: 'SomeType', aggregateId: 'SomeId', aggregateVersion: 100}, {a: 1});
      expect(handler1Called).to.equal(true);
      expect(handler2Called).to.equal(true);
      done();
    });

    it('can filter for descriptor value', function(done) {
      var bus = new Bus();
      var handlerCalled = false;
      bus.on('SomeEvent', { 'aggregateType': 'SomeType' }, function(eventType, descriptor, event) {
        expect(eventType).to.equal('SomeEvent');
        expect(descriptor.aggregateType).to.equal('SomeType');
        expect(descriptor.aggregateId).to.equal('SomeId');
        expect(descriptor.aggregateVersion).to.equal(100);
        expect(event.a).to.equal(1);
        handlerCalled = true;
      });
      bus.emit('SomeEvent', { aggregateType: 'SomeType', aggregateId: 'SomeId', aggregateVersion: 100}, {a: 1});
      expect(handlerCalled).to.equal(true);
      done();
    });

    it('can filter for more than one descriptor value', function(done) {
      var bus = new Bus();
      var handlerCalled = false;
      bus.on('SomeEvent', { 'aggregateType': 'SomeType', 'aggregateVersion': 100 }, function(eventType, descriptor, event) {
        expect(eventType).to.equal('SomeEvent');
        expect(descriptor.aggregateType).to.equal('SomeType');
        expect(descriptor.aggregateId).to.equal('SomeId');
        expect(descriptor.aggregateVersion).to.equal(100);
        expect(event.a).to.equal(1);
        handlerCalled = true;
      });
      bus.emit('SomeEvent', { aggregateType: 'SomeType', aggregateId: 'SomeId', aggregateVersion: 100}, {a: 1});
      expect(handlerCalled).to.equal(true);
      done();
    });

    it('handler will not execute when a filter value isn\'t present in descriptor', function(done) {
      var bus = new Bus();
      bus.on('SomeEvent', { 'aggregateType': 'SomeType', 'aggregateVersion': 100, 'nothere': 1 }, function(eventType, descriptor, event) {
        done(new Error('must not be called'));
      });
      bus.emit('SomeEvent', { aggregateType: 'SomeType', aggregateId: 'SomeId', aggregateVersion: 100}, {a: 1});
      done();
    });

    it('can listen for all events with a custom filter', function(done) {
      var bus = new Bus();
      bus.on('*', { 'aggregateType': 'FooType' }, function(eventType, descriptor, event) {
        done(new Error('must not be called'));
      });
      var handlerCalled = false;
      bus.on('*', { 'aggregateType': 'SomeType' }, function(eventType, descriptor, event) {
        expect(eventType).to.equal('SomeEvent');
        expect(descriptor.aggregateType).to.equal('SomeType');
        expect(descriptor.aggregateId).to.equal('SomeId');
        expect(descriptor.aggregateVersion).to.equal(100);
        expect(event.a).to.equal(1);
        handlerCalled = true;
      });
      bus.emit('SomeEvent', { aggregateType: 'SomeType', aggregateId: 'SomeId', aggregateVersion: 100}, {a: 1});
      expect(handlerCalled).to.equal(true);
      done();
    });
  });

  describe('#removeAllListeners', function() {
    it('removes all listeners', function(done) {
      var bus = new Bus();
      var handler1 = function(eventType, descriptor, event) {
        done(new Error('must not be called'));
      }
      bus.on('SomeEvent', handler1);
      var handler2 = function(eventType, descriptor, event) {
        done(new Error('must not be called'));
      }
      bus.on('*', { 'aggregateType': 'SomeType' }, handler2);
      bus.removeAllListeners();
      bus.emit('SomeEvent', { aggregateType: 'SomeType', aggregateId: 'SomeId', aggregateVersion: 100}, {a: 1});
      done();
    });
  });

  describe('#removeEventListener', function() {
    it('removes specifc event listener', function(done) {
      var bus = new Bus();
      var handler1 = function(eventType, descriptor, event) {
        done(new Error('must not be called'));
      }
      bus.on('SomeEvent', handler1);
      var handler2 = function(eventType, descriptor, event) {
        done(new Error('must not be called'));
      }
      bus.on('*', { 'aggregateType': 'SomeType' }, handler2);
      bus.removeEventListener('SomeEvent', handler1);
      bus.removeEventListener('*', handler2);
      bus.emit('SomeEvent', { aggregateType: 'SomeType', aggregateId: 'SomeId', aggregateVersion: 100}, {a: 1});
      done();
    });
  });
});