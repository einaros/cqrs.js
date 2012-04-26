var mongoose = require('mongoose')
  , Schema = mongoose.Schema
  , ObjectId = Schema.ObjectId;

/**
 * EventStore
 */

function EventStore(eventPublisher, customMongoose) {
  this.eventPublisher = eventPublisher;
  this.mongoose = customMongoose || mongoose;

  /**
   * EventStore Schema
   */

  var AggregateSchema = new this.mongoose.Schema({
      id                : String
    , events            : [EventSchema]
  });
  var EventSchema = new this.mongoose.Schema({
      version           : Number
    , data              : String
  });
  this.Aggregate = this.mongoose.model('Aggregate', AggregateSchema);
  this.Event = this.mongoose.model('Event', EventSchema);
}

/**
 * saveEvents
 * @aggregateId the id of the aggregate to save
 * @expectedVersion the version we expect to be at the latest one already saved to the repository
 * @events the events to save
 */

EventStore.prototype.saveEvents = function(aggregateType, aggregateId, expectedVersion, events, cb) {
  var self = this;
  var aggregate = this.Aggregate.findOne({id: aggregateId}, function(err, aggregate) {
    if (err) return cb(err);
    var latestVersion = -1;
    if (aggregate == null) {
      aggregate = new self.Aggregate();
      aggregate.id = aggregateId;
    }
    else latestVersion = aggregate.events[aggregate.events.length - 1].version;
    if (latestVersion != expectedVersion) {
      return cb(new Error('ConcurrencyException'));
    }
    for (var i = 0, l = events.length; i < l; ++i) {
      var event = new self.Event();
      event.version = latestVersion + 1 + i;
      event.data = JSON.stringify(events[i]);
      aggregate.events.push(event);
    }

    aggregate.save(function(error) {
      if (error) return cb(error);
      if (self.eventPublisher) {
        for (var i = 0, l = events.length; i < l; ++i) {
          var event = events[i];
          self.eventPublisher.emit(event.type, aggregateType, aggregateId, event.data);
        }
      }
      cb(null);
    });
  });
};

/**
 * loadEvents
 * @aggregateId the id of the aggregate to load events for
 * @sinceVersion the version since (but not including) we want to load events from
 */

EventStore.prototype.loadEvents = function(aggregateId, sinceVersion, cb) {
  var aggregate = this.Aggregate.findOne({id: aggregateId}, function(err, aggregate) {
    if (err) return cb(err);
    if (aggregate == null) return cb(null);
    var events = aggregate.events
      .filter(function(event) { return event.version > sinceVersion; })
      .reduce(function(p, event, i) {
        var e = JSON.parse(event.data);
        e.version = event.version;
        p.push(e);
        return p;
      }, [])
    cb(events);
  });
};

module.exports = EventStore;
