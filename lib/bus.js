var util = require('util')
  , events = require('events');

function Bus() {
}

util.inherits(Bus, events.EventEmitter);

module.exports = Bus;