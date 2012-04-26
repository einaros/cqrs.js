var expect = require('expect.js')
  , Event = require('../lib/event');

describe('Event', function() {
  it('#make creates a well formed event', function() {
    var obj = Event.make('SomeEvent', {a: 'foo', b: 123});
    expect(obj.type).to.equal('SomeEvent');
    expect(obj.data.a).to.equal('foo');
    expect(obj.data.b).to.equal(123);
  });
});