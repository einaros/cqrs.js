var expect = require('expect.js')
  , Bus = require('../lib/bus');

describe('Bus', function() {
  describe('#on', function() {
    it('captures events with a specific type', function(done) {
      var bus = new Bus();
      var handler1Called = false;
      bus.on('SomeEvent', function(eventType, aggregateType, aggregateId, version, data) {
        expect(eventType).to.equal('SomeEvent');
        expect(aggregateType).to.equal('SomeType');
        expect(aggregateId).to.equal('SomeId');
        expect(version).to.equal(100);
        expect(data.a).to.equal(1);
        handler1Called = true;
      });
      var handler2Called = false;
      bus.on('SomeEvent', function(eventType, aggregateType, aggregateId, version, data) {
        expect(eventType).to.equal('SomeEvent');
        expect(aggregateType).to.equal('SomeType');
        expect(aggregateId).to.equal('SomeId');
        expect(version).to.equal(100);
        expect(data.a).to.equal(1);
        handler2Called = true;
      });
      bus.emit('SomeEvent', 'SomeType', 'SomeId', 100, {a: 1});
      expect(handler1Called).to.equal(true);
      expect(handler2Called).to.equal(true);
      done();
    });
  });

  describe('#onAggregateId', function() {
    it('captures events for a specific aggregate id', function(done) {
      var bus = new Bus();
      var handler1Called = false;
      bus.onAggregateId('SomeId', function(eventType, aggregateType, aggregateId, version, data) {
        expect(eventType).to.equal('SomeEvent');
        expect(aggregateType).to.equal('SomeType');
        expect(aggregateId).to.equal('SomeId');
        expect(version).to.equal(100);
        expect(data.a).to.equal(1);
        handler1Called = true;
      });
      bus.emit('SomeEvent', 'SomeType', 'SomeId', 100, {a: 1});
      expect(handler1Called).to.equal(true);
      done();
    });
  });

  describe('#onAggregateType', function() {
    it('captures events for a specific aggregate type', function(done) {
      var bus = new Bus();
      var handler1Called = false;
      bus.onAggregateType('SomeType', function(eventType, aggregateType, aggregateId, version, data) {
        expect(eventType).to.equal('SomeEvent');
        expect(aggregateType).to.equal('SomeType');
        expect(aggregateId).to.equal('SomeId');
        expect(version).to.equal(100);
        expect(data.a).to.equal(1);
        handler1Called = true;
      });
      bus.emit('SomeEvent', 'SomeType', 'SomeId', 100, {a: 1});
      expect(handler1Called).to.equal(true);
      done();
    });
  });

  describe('#removeAllListeners', function() {
    it('removes all listeners', function(done) {
      var bus = new Bus();
      bus.onAggregateType('SomeType', function(eventType, aggregateType, aggregateId, version, data) {
        done(new Error('must not be called'));
      });
      bus.onAggregateId('SomeId', function(eventType, aggregateType, aggregateId, version, data) {
        done(new Error('must not be called'));
      });
      bus.on('SomeEvent', function(eventType, aggregateType, aggregateId, version, data) {
        done(new Error('must not be called'));
      });
      bus.removeAllListeners();
      bus.emit('SomeEvent', 'SomeType', 'SomeId', 100, {a: 1});
      done();
    });
  });

  describe('#removeEventListener', function() {
    it('removes specifc event listener', function(done) {
      var bus = new Bus();
      var cb = function(eventType, aggregateType, aggregateId, version, data) {
        done(new Error('must not be called'));
      };
      bus.on('SomeEvent', cb);
      bus.removeEventListener('SomeEvent', cb);
      bus.emit('SomeEvent', 'SomeType', 'SomeId', 100, {a: 1});
      done();
    });
  });

  describe('removeAggregateIdListener', function() {
    it('removes specifc event listener', function(done) {
      var bus = new Bus();
      var cb = function(eventType, aggregateType, aggregateId, version, data) {
        done(new Error('must not be called'));
      };
      bus.onAggregateId('SomeId', cb);
      bus.removeAggregateIdListener('SomeId', cb);
      bus.emit('SomeEvent', 'SomeType', 'SomeId', 100, {a: 1});
      done();
    });
  });

  describe('removeAggregateTypeListener', function() {
    it('removes specifc event listener', function(done) {
      var bus = new Bus();
      var cb = function(eventType, aggregateType, aggregateId, version, data) {
        done(new Error('must not be called'));
      };
      bus.onAggregateType('SomeType', cb);
      bus.removeAggregateTypeListener('SomeType', cb);
      bus.emit('SomeEvent', 'SomeType', 'SomeId', 100, {a: 1});
      done();
    });
  });
});