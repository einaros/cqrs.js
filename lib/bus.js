var util = require('util');

function Bus() {
  this.eventListeners = {};
  this.idListeners = {};
  this.aggregateListeners = {};
}

Bus.prototype.on = function(eventType, cb) {
  var array;
  array = this.eventListeners[eventType];
  if (typeof array == 'undefined') array = this.eventListeners[eventType] = [];
  array.push(cb);
}

Bus.prototype.onAggregateId = function(aggregateId, cb) {
  var array;
  array = this.idListeners[aggregateId];
  if (typeof array == 'undefined') array = this.idListeners[aggregateId] = [];
  array.push(cb);
}

Bus.prototype.onAggregateType = function(aggregateType, cb) {
  var array;
  array = this.aggregateListeners[aggregateType];
  if (typeof array == 'undefined') array = this.aggregateListeners[aggregateType] = [];
  array.push(cb);
}

Bus.prototype.emit = function(eventType, aggregateType, aggregateId, version, data) {
  var array;
  array = this.eventListeners[eventType];
  if (typeof array != 'undefined') {
    for (var i = 0, l = array.length; i < l; ++i) {
      array[i].apply(this, arguments);
    }
  }
  array = this.idListeners[aggregateId];
  if (typeof array != 'undefined') {
    for (var i = 0, l = array.length; i < l; ++i) {
      array[i].apply(this, arguments);
    }
  }
  array = this.aggregateListeners[aggregateType];
  if (typeof array != 'undefined') {
    for (var i = 0, l = array.length; i < l; ++i) {
      array[i].apply(this, arguments);
    }
  }
}

Bus.prototype.removeAllListeners = function() {
  this.eventListeners = {};
  this.idListeners = {};
  this.aggregateListeners = {};
}

Bus.prototype.removeEventListener = function(eventType, cb) {
  var array;
  array = this.eventListeners[eventType];
  if (typeof array == 'undefined') return;
  var index = array.indexOf(cb);
  if (index == -1) return;
  array.splice(index, 1);
}

Bus.prototype.removeAggregateIdListener = function(aggregateId, cb) {
  var array;
  array = this.idListeners[aggregateId];
  if (typeof array == 'undefined') return;
  var index = array.indexOf(cb);
  if (index == -1) return;
  array.splice(index, 1);
}

Bus.prototype.removeAggregateTypeListener = function(aggregateType, cb) {
  var array;
  array = this.aggregateListeners[aggregateType];
  if (typeof array == 'undefined') return;
  var index = array.indexOf(cb);
  if (index == -1) return;
  array.splice(index, 1);
}

module.exports = Bus;