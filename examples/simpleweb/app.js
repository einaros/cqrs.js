var express = require('express')
  , app = express.createServer()
  , mongoose = require('mongoose')
  , EventStore = require('../../lib/eventstore')
  , Repository = require('../../lib/repository')
  , Event = require('../../lib/event')
  , AggregateRoot = require('../../lib/aggregateroot')
  , Bus = require('../../lib/bus')
  , util = require('util')
  , events = require('events');

// State

var personId = 0;

// Person

function Person() {}
util.inherits(Person, AggregateRoot);
Person.prototype.rename = function(name) {
  this.applyEvent(Event.make('PersonRenamed', {name: name}));
}
AggregateRoot.defineEventHandler(Person, 'PersonCreated', function(args) {
  this.name =  args.name;
});
AggregateRoot.defineEventHandler(Person, 'PersonRenamed', function(args) {
  this.name =  args.name;
});

// Express init
mongoose.connect('mongodb://localhost/CQRStest');
app.listen(3000);
app.use(express.bodyParser());
app.use(express.static(__dirname + '/public'));

// Event bus

var bus = new Bus();
bus.on('PersonCreated', function() { console.log('Person created!'); });

// Repo init

var typeDictionary = {
  'Person': { constructor: Person, creationEvent: 'PersonCreated' }
};
var eventStore = new EventStore(bus, mongoose);
var repository = new Repository(eventStore, typeDictionary, {});

// Services

app.post('/Person/Create', function(req, res) {
  var person = repository.create('Person', {name: req.body.name});
  repository.save('Person', ++personId, person, -1, function(err) {
    if (err) console.log(err);
    res.end('ok');
  });
});

app.get('/Show', function(req, res) {
  res.end(eventStore);
});
