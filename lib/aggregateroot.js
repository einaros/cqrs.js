function AggregateRoot() {}

module.exports = AggregateRoot;

AggregateRoot.prototype.applyEvent = function(event, dontSave) {
  if (typeof this._uncomittedEvents == 'undefined') this._uncomittedEvents = [];
  if (dontSave !== true) {
    this._uncomittedEvents.push(event);
  }
  var handler = this['handleEvent_' + event.type];
  if (typeof handler != 'function') return;
  handler.call(this, event.data);
}

AggregateRoot.prototype.getUncommittedEvents = function(event, dontSave) {
  if (typeof this._uncomittedEvents == 'undefined') this._uncomittedEvents = [];
  return this._uncomittedEvents;
}

AggregateRoot.prototype.clearUncommittedEvents = function(event, dontSave) {
  this._uncomittedEvents = [];
}

AggregateRoot.defineEventHandler = function(obj, type, handler) {
  obj.prototype['handleEvent_' + type] = handler;
}