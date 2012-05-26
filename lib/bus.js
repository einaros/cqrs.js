var util = require('util');

function Bus() {
  this.catchAllEventListeners = [];
  this.eventListeners = {};
}

Bus.prototype.on = function(eventType, filter, callback) {
  if (typeof filter == 'undefined' && typeof callback == 'undefined') throw new Error('Callback required');
  if (typeof filter == 'function') {
    callback = filter;
    filter = undefined;
  }
  var array;
  if (eventType == '*') array = this.catchAllEventListeners;
  else  array = this.eventListeners[eventType] || (this.eventListeners[eventType] = []);
  array.push({
    callback: callback,
    filter: filter
  });
}


Bus.prototype.emit = function(eventType, descriptor, event) {
  if (typeof descriptor == 'undefined' && typeof event == 'undefined') throw new Error('Event required');
  if (typeof event == 'undefined') {
    event = descriptor;
    descriptor = undefined;
  }

  var handlerArray = (this.eventListeners[eventType] || []).concat(this.catchAllEventListeners);
  if (typeof handlerArray != 'undefined') {
    for (var i = 0, l = handlerArray.length; i < l; ++i) {
      var handler = handlerArray[i];

      // Filter events, if a filter is supplied
      if (handler.filter) {
        var filtered = false;
        var keys = Object.keys(handler.filter);
        for (var j = 0, k = keys.length; j < k; ++j) {
          var filterKey = keys[j];
          var value = descriptor[filterKey];
          if (typeof value == 'undefined') {
            filtered = true;
            break;
          }
          if (value !== handler.filter[filterKey]) {
            filtered = true;
            break;
          }
        }
        if (filtered) continue;
      }

      handler.callback.call(this, eventType, descriptor, event);
    }
  }
}

Bus.prototype.removeAllListeners = function() {
  this.eventListeners = {};
  this.catchAllEventListeners = [];
}

Bus.prototype.removeEventListener = function(eventType, cb) {
  var array;
  if (eventType == '*') array = this.catchAllEventListeners;
  else array = this.eventListeners[eventType];
  if (typeof array == 'undefined') return;
  for (var i = 0, l = array.length; i < l; ++i) {
    var handler = array[i];
    if (handler.callback == cb) return array.splice(i, 1);
  }
}

module.exports = Bus;