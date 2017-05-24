'use strict';

var _ = require('lodash');

function initWatchVal() {}

function Scope() {
  this.$$watchers = [];
  this.$$lastDirtyWatch = null;
  this.$$asyncQueue = [];
  this.$$applyAsyncQueue = [];
  // this.$$applyAsyncId = null;
  this.$$phase = null; //a string represented what's going on($digest, $apply)
}

Scope.prototype.$watch = function(watchFn, listenerFn, valueEq) {
  var self = this;
  var watcher = {
    watchFn: watchFn,
    listenerFn: listenerFn || function() {}, //consider watchers that omit listener
    last: initWatchVal, //consider watch value is first undefined
    valueEq: !!valueEq //when valueEq is undefined, negative it twice so that we get false
  };
  self.$$watchers.unshift(watcher);
  self.$$lashDirtyWatch = null; //consider adding new watcher in some listernerFn
  //return a function to destory itself
  return function() {
    var index = self.$$watchers.indexOf(watcher);
    if (index >= 0) {
      self.$$watchers.splice(index, 1);
      self.$$lashDirtyWatch = null;
    }
  };
};

Scope.prototype.$$digestOnce = function() {
  var self = this;
  var newValue;
  var oldValue;
  var dirty;
  _.forEachRight(this.$$watchers, function(watcher) {
    try {
      if (watcher) { //judge whether watch exists
        newValue = watcher.watchFn(self);
        oldValue = watcher.last;
        if (!self.$areEqual(newValue, oldValue, watcher.valueEq)) {
          self.$$lashDirtyWatch = watcher;
          // when value is obejct or array, clone it 
          watcher.last = watcher.valueEq ? _.cloneDeep(newValue) : newValue;
          watcher.listenerFn(newValue,
            (oldValue === initWatchVal ? newValue : oldValue),
            self);
          dirty = true;
        } else if (self.$$lashDirtyWatch === watcher) {
          return false; // it will break _.forEachRight
        }
      }
    } catch (e) {
      console.error(e);
    }
  });
  return dirty;
};

Scope.prototype.$digest = function() {
  var dirty;
  var ttl = 10; //Time To Live
  var self = this;
  self.$$lashDirtyWatch = null;
  self.$beginPhase('$digest');

  // if (self.$$applyAsyncId) {
  //   clearTimeout(self.$$applyAsyncId);
  //   self.$$flushApplyAsync();
  // }

  do {
    while (self.$$asyncQueue.length) {
      var asyncTask = self.$$asyncQueue.shift();
      asyncTask.scope.$eval(asyncTask.expression);
    }
    dirty = self.$$digestOnce();
    if ((dirty || self.$$asyncQueue.length) && !(ttl--)) {
      self.$clearPhase();
      throw '10 digest iterations reached';
    }
  } while (dirty || self.$$asyncQueue.length);
  self.$clearPhase();
};

Scope.prototype.$areEqual = function(newValue, oldValue, valueEq) {
  if (valueEq) {
    return _.isEqual(newValue, oldValue);
  } else {
    return newValue === oldValue || (typeof(newValue) === 'number' &&
      typeof(oldValue) === 'number' && isNaN(newValue) && isNaN(oldValue));
  }
};

/**
 * If there is digest running, one is started.We use setTimeout to 
 * defer the beginning of digest slightly.
 * @param  {[type]} expr [description]
 * @return {[type]}      [description]
 */
Scope.prototype.$evalAsync = function(expr) {
  var self = this;
  if (!self.$$phase && !self.$$asyncQueue.length) {
    setTimeout(function() {
      if (self.$$asyncQueue.length) {
        self.$digest();
      }
    }, 0);
  }
  self.$$asyncQueue.push({ scope: self, expression: expr });
};

Scope.prototype.$eval = function(expr, locals) {
  return expr(this, locals);
};

//所有的$apply最后都会对应一次$digest
Scope.prototype.$apply = function(expr) {
  try {
    this.$beginPhase('$apply');
    return this.$eval(expr);
  } finally {
    this.$clearPhase();
    this.$digest(); //invoke Angular with $digest finally 
  }
};

Scope.prototype.$applyAsync = function(expr) {
  var self = this;
  self.$$applyAsyncQueue.push(function() {
    self.$eval(expr);
  });
  setTimeout(function() {
    self.$apply(function() {
      while (self.$$applyAsyncQueue.length) {
        self.$$applyAsyncQueue.shift()();
      }
    });
  }, 0);
  /*if (self.$$applyAsyncId === null) {
    self.$$applyAsyncId = setTimeout(function() {
      self.$apply(_.bind(self.$$flushApplyAsync), self);
    }, 0);
  }*/
};

// Scope.prototype.$$flushApplyAsync = function() {
//   while (this.$$applyAsyncQueue.length) {
//     this.$$applyAsyncQueue.shift()();
//   }
//   this.$$applyAsyncId = null;
// };

Scope.prototype.$beginPhase = function(phase) {
  if (this.$$phase) {
    throw this.$$phase + ' already in progress';
  } else {
    this.$$phase = phase;
  }
};

Scope.prototype.$clearPhase = function() {
  this.$$phase = null;
};


module.exports = Scope;
