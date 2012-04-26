var expect = require('expect.js')
  , EventStore = require('../lib/eventStore')
  , Event = require('../lib/event')
  , util = require('util')
  , mongoose = require('mongoose')
  , Db = require('mongodb').Db
  , events = require('events')
  , Server = require('mongodb').Server;

var dbServer = 'localhost';
var dbName = 'CQRSJS-DEV';

function setupDatabase(done) {
  var db = new Db(dbName, new Server(dbServer, 27017, {}));
  db.open(function(err, db) {
    if (err) throw err;
    db.dropDatabase(function(err, result) {
      if (err) throw err;
      function finalize(err) {
        if (err) throw err;
        done();
      }
      if (mongoose.connection.readyState !== 1) mongoose.connect('mongodb://' + dbServer + '/' + dbName, finalize);
      else finalize();
    });
  });
}

describe('EventStore', function() {
  before(setupDatabase);
  afterEach(setupDatabase);

  it('can save and reload events', function(done) {
    var store = new EventStore();

    store.saveEvents('SomeType', 100, -1, [Event.make('SomeEvent', { a: 'foobar' })], function(error) {
      expect(error).to.equal(null);

      store.saveEvents('SomeType', 100, 0, [Event.make('SomeEvent', { b: 'bazbar' }), Event.make('SomeEvent', { c: 'barbar' })], function(error) {
        expect(error).to.equal(null);

        store.saveEvents('SomeType', 101, -1, [Event.make('SomeEvent', { c: 'foobar' })], function(error) {
          expect(error).to.equal(null);

          var store = new EventStore();
          store.loadEvents('SomeType', 100, -1, function(events) {
            expect(events.length).to.equal(3);
            expect(events[0].data.a).to.equal('foobar');
            expect(events[1].data.b).to.equal('bazbar');
            expect(events[2].data.c).to.equal('barbar');

            store.loadEvents('SomeType', 100, 0, function(events) {
              expect(events.length).to.equal(2);
              expect(events[0].data.b).to.equal('bazbar');
              expect(events[1].data.c).to.equal('barbar');

              store.loadEvents('SomeType', 101, -1, function(events) {
                expect(events.length).to.equal(1);
                expect(events[0].data.c).to.equal('foobar');
                done();
              });
            });
          });
        });
      });
    });
  });

  it('yields an error if theres a concurrency conflict', function(done) {
    var store = new EventStore();
    store.saveEvents('SomeType', 100, -1, [Event.make('SomeEvent', { a: 'foobar' })], function(error) {
      expect(error).to.equal(null);
      store.saveEvents('SomeType', 100, 0, [Event.make('SomeEvent', { b: 'bazbar' }), Event.make('SomeEvent', { c: 'barbar' })], function(error) {
        expect(error).to.equal(null);

        store.saveEvents('SomeType', 100, 0, [Event.make('SomeEvent', { c: 'foobar' })], function(error) {
          expect(error.message).to.equal('ConcurrencyException');
          done();
        });
      });
    });
  });

  it('publishes events if an eventpublisher is defined, using the event\'s type param', function(done) {
    var publisher = new events.EventEmitter();
    var store = new EventStore(publisher);
    var received = [];
    publisher.on('foobar', function(type, id, version, data) {
      received.push({type: type, id: id, version: version, data: data});
    });
    publisher.on('barbar', function(type, id, version, data) {
      received.push({type: type, id: id, version: version, data: data});
    });
    store.saveEvents('SomeType', 100, -1, [Event.make('foobar', {a: 'data'}), Event.make('barbar', {b: 'more'})], function(error) {
      expect(received.length).to.equal(2);
      expect(received[0].type).to.equal('SomeType');
      expect(received[0].id).to.equal(100);
      expect(received[0].data.a).to.equal('data');
      expect(received[0].version).to.equal(0);
      expect(received[1].type).to.equal('SomeType');
      expect(received[1].id).to.equal(100);
      expect(received[1].data.b).to.equal('more');
      expect(received[1].version).to.equal(1);
      done();
    });
  });

});
