var express = require('express')
  , app = express.createServer()
  , mongoose = require('mongoose')
  , EventStore = require('../../lib/eventstore')
  , Repository = require('../../lib/repository')
  , Event = require('../../lib/event')
  , AggregateRoot = require('../../lib/aggregateroot')
  , Bus = require('../../lib/bus')
  , util = require('util')
  , uuid = require('node-uuid')
  , events = require('events')
  , SSE = require('sse.js')
  , querystring = require('querystring');

/**
 * Application setup
 */

mongoose.connect('mongodb://localhost/CQRStest');
app.listen(3000);
app.use(express.bodyParser());
app.use(express.static(__dirname + '/public'));

/**
 * Event Bus
 */

var bus = new Bus();
bus.on('PersonCreated', function(event, descriptor, person) {
  console.log('Person created: %s', person.name);
  var personModel = new PersonModel();
  personModel.id = descriptor.aggregateId;
  personModel.name = person.name;
  personModel.version = descriptor.aggregateVersion;
  personModel.save();
});
bus.on('PersonRenamed', function(event, descriptor, person) {
  PersonModel.findOne({id: descriptor.aggregateId}, function(error, personModel) {
    if (error) throw error;
    console.log('Person renamed: %s => %s', personModel.name, person.name);
    personModel.name = person.name;
    personModel.version = descriptor.aggregateVersion;
    personModel.save();
  });
});

/**
 * Optional per-aggregate push of events to client via Server-Sent Events
 */

var sse = new SSE(app);
sse.on('connection', function(client, url) {
  var qs = querystring.parse(url.query);
  var id = qs.id;
  var cb = function(eventType, descriptor, event) {
    client.send(JSON.stringify({
      eventType: eventType,
      aggregateType: descriptor.aggregateType,
      aggregateId: descriptor.aggregateId,
      version: descriptor.aggregateVersion,
      data: event
    }));
  }
  bus.on('*', { aggregateId: id }, cb);
  client.on('close', function() {
    bus.removeAggregateIdListener(id, cb);
  });
});

/**
 * Repository initialization
 */

var typeDictionary = {
  'Person': { constructor: Person, creationEvent: 'PersonCreated' }
};
var eventStore = new EventStore(bus, mongoose);
var repository = new Repository(eventStore, typeDictionary, {});

/**
 * Read Models
 */

var PersonSchema = new mongoose.Schema({
    id                : String
  , name              : String
  , version           : Number
});
var PersonModel = mongoose.model('Person', PersonSchema);

/**
 * Domain Objects
 */

function Person() {}
util.inherits(Person, AggregateRoot);
Person.prototype.rename = function(name) {
  this.applyEvent(Event.make('PersonRenamed', {name: name}));
}
AggregateRoot.defineEventHandler(Person, 'PersonCreated', function(args) {
  this.name = args.name;
});
AggregateRoot.defineEventHandler(Person, 'PersonRenamed', function(args) {
  this.name = args.name;
});

/**
 * Services
 */

// Reading

app.get('/Get/Persons', function(req, res) {
  PersonModel.find({}, function(error, persons) {
    res.end(JSON.stringify(persons));
  });
});

// Commands

app.post('/Person/Create', function(req, res) {
  var person = repository.create('Person', {name: req.body.name});
  var id = uuid.v4();
  repository.save('Person', id, person, -1, function(err) {
    if (err) console.log(err);
    res.end(id);
  });
});

app.post('/Person/Rename', function(req, res) {
  repository.get('Person', req.body.id, function(person) {
    person.rename(req.body.name);
    repository.save('Person',req.body.id, person, req.body.version, function(err) {
      if (err) {
        console.error(err);
        res.end(JSON.stringify({ok: 0, error: err.message}));
      }
      else res.end(JSON.stringify({ok: 1}));
    });
  });
});
