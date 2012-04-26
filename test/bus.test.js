var expect = require('expect.js')
  , Bus = require('../lib/bus');

describe('Bus', function() {
  describe('#emit', function() {
    it('sends a message to all subscribers', function(done) {
      var bus = new Bus();
      var handler1Called = false;
      bus.on('foobar', function(message) {
        expect(message.a).to.equal(1);
        handler1Called = true;
      });
      var handler2Called = false;
      bus.on('foobar', function(message) {
        expect(message.a).to.equal(1);
        handler2Called = true;
      });
      bus.emit('foobar', {a:1});
      expect(handler1Called).to.equal(true);
      expect(handler2Called).to.equal(true);
      done();
    });
  });
});