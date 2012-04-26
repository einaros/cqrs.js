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

    store.saveEvents('SomeType', 100, -1, [{ a: 'foobar' }], function(error) {
      expect(error).to.equal(null);

      store.saveEvents('SomeType', 100, 0, [{ b: 'bazbar' }, { c: 'barbar' }], function(error) {
        expect(error).to.equal(null);

        store.saveEvents('SomeType', 101, -1, [{ c: 'foobar' }], function(error) {
          expect(error).to.equal(null);

          var store = new EventStore();
          store.loadEvents(100, -1, function(events) {
            expect(events.length).to.equal(3);
            expect(events[0].a).to.equal('foobar');
            expect(events[1].b).to.equal('bazbar');
            expect(events[2].c).to.equal('barbar');

            store.loadEvents(100, 0, function(events) {
              expect(events.length).to.equal(2);
              expect(events[0].b).to.equal('bazbar');
              expect(events[1].c).to.equal('barbar');

              store.loadEvents(101, -1, function(events) {
                expect(events.length).to.equal(1);
                expect(events[0].c).to.equal('foobar');
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
    store.saveEvents('SomeType', 100, -1, [{ a: 'foobar' }], function(error) {
      expect(error).to.equal(null);
      store.saveEvents('SomeType', 100, 0, [{ b: 'bazbar' }, { c: 'barbar' }], function(error) {
        expect(error).to.equal(null);

        store.saveEvents('SomeType', 100, 0, [{ c: 'foobar' }], function(error) {
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
    publisher.on('foobar', function(type, id, data) {
      received.push(data);
    });
    publisher.on('barbar', function(type, id, data) {
      received.push(data);
    });
    store.saveEvents('SomeType', 100, -1, [Event.make('foobar', {a: 'data'}), Event.make('barbar', {b: 'more'})], function(error) {
      expect(received.length).to.equal(2);
      expect(received[0].a).to.equal('data');
      expect(received[1].b).to.equal('more');
      done();
    });
  });

});
