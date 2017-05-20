'use strict';

var _ = require('lodash');

function initWatchVal() {}

//store all the watcher
function Scope() {
  this.$$watchers = [];
}

Scope.prototype.$watch = function(watchFn, listenerFn) {
  var watcher = {
    watchFn: watchFn,
    listenerFn: listenerFn || function() {}, //consider watchers that omit listener
    last: initWatchVal //consider watch value is first undefined
  };
  this.$$lashDirtyWatch = null;     //consider adding new watcher in some listernerFn
  this.$$watchers.push(watcher);
};

Scope.prototype.$$digestOnce = function() {
  var self = this;
  var newValue;
  var oldValue;
  var dirty;
  _.forEach(this.$$watchers, function(watcher) {
    newValue = watcher.watchFn(self);
    oldValue = watcher.last;
    if (newValue !== oldValue) {
      watcher.last = newValue;
      watcher.listenerFn(newValue,
        (oldValue === initWatchVal ? newValue : oldValue),
        self);
      dirty = true;
      self.$$lashDirtyWatch = watcher;
    } else if (self.$$lashDirtyWatch == watcher) {
      return false; // it will break _.forEach
    }
  });
  return dirty;
};

Scope.prototype.$digest = function() {
  var dirty;
  var ttl = 10; //Time To Live
  this.$$lashDirtyWatch = null;
  do {
    dirty = this.$$digestOnce();
    if (dirty && !(ttl--)) {
      throw '10 digest iterations reached';
    }
  } while (dirty);
};

module.exports = Scope;
