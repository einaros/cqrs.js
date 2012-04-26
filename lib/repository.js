var Event = require('./event');

function Repository(eventStore, typeDictionary, mergeDictionary) {
  this.eventStore = eventStore;
  this.typeDictionary = typeDictionary;
  this.mergeDictionary = mergeDictionary;
}

module.exports = Repository;

Repository.prototype.create = function(type, data) {
  var info = this.typeDictionary[type];
  if (typeof info == 'undefined') throw new Error('Invalid object type');
  if (typeof info.constructor == 'undefined') throw new Error('Invalid constructor');
  if (typeof info.creationEvent == 'undefined') throw new Error('Invalid creation event');
  var obj = new (info.constructor)();
  var creationEvent = Event.make(info.creationEvent, data);
  obj.applyEvent(creationEvent);
  return obj;
}

Repository.prototype.get = function(type, id, cb) {
  var info = this.typeDictionary[type];
  if (typeof info == 'undefined') throw new Error('Invalid object type');
  if (typeof info.constructor == 'undefined') throw new Error('Invalid constructor');
  var obj = new (info.constructor)();
  this.eventStore.loadEvents(this.getAggregateId(type, id), -1, function(events) {
    for (var i = 0, l = events.length; i < l; ++i) {
      obj.applyEvent(events[i], true);
    }
    cb(obj);
  });
}

Repository.prototype.save = function(type, id, object, version, cb) {
  var info = this.typeDictionary[type];
  if (typeof info == 'undefined') throw new Error('Invalid object type');
  var events = object.getUncommittedEvents();
  object.clearUncommittedEvents();
  var self = this;
  var aggregateId = this.getAggregateId(type, id);
  this.eventStore.saveEvents(type, aggregateId, version, events, function(err) {
    if (err && err.message == 'ConcurrencyException') {
      // merges .. across the whole board ... will have to be synchronous
      self.merge(object, aggregateId, version, events, function(err) {
        if (err) return cb(err);
        // we're merged, save and return!
        self.eventStore.saveEvents(type, aggregateId, version, events, function(err) {
          cb(err);
        });
      });
    }
    else cb();
  });
}

Repository.prototype.merge = function(object, aggregateId, version, events, cb) {
  var self = this;
  this.eventStore.loadEvents(aggregateId, version, function(dbEvents) {
    for (var i = 0, l = events.length; i < l; ++i) {
      var event = events[i];
      var mergeInfo = self.mergeDictionary[event.type];
      if (typeof mergeInfo == 'undefined') return cb(new Error('ConcurrencyException'));
      for (var j = 0, k = dbEvents.length; j < k; ++j) {
        var dbEvent = dbEvents[j];
        var mergeFunction = mergeInfo[dbEvent.type];
        if (typeof mergeFunction == 'undefined') return cb(new Error('ConcurrencyException'));
        // merge event against dbEvent
        mergeFunction(object, event, dbEvent);
      }
    }
    cb();
  });
}

Repository.prototype.getAggregateId = function(type, id) {
  return type + '#' + id;
}