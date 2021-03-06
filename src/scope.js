'use strict';

var _ = require('lodash');

function initWatchVal() {}

function isArrayLike(obj) {
  if (_.isNull(obj) || _.isUndefined(obj)) {
    return false;
  }
  var length = obj.length;
  return length === 0 ||
    (_.isNumber(length) && length > 0 && (length - 1) in obj);
}

function Scope() {
  this.$$watchers = [];
  this.$$lastDirtyWatch = null;
  this.$$asyncQueue = [];
  this.$$applyAsyncQueue = [];
  this.$$applyAsyncId = null; //keep track of whether a setTimeout to drain the queue has already been scheduled
  this.$$phase = null; //a string represented what's going on($digest, $apply)
  this.$$postDigestQueue = [];
  this.$$children = []; //store child scope
  this.$root = this;
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
  //consider adding new watcher in some listernerFn, and mark it in rootScope
  self.$root.$$lastDirtyWatch = null;
  //return a function to destory itself
  return function() {
    var index = self.$$watchers.indexOf(watcher);
    if (index >= 0) {
      self.$$watchers.splice(index, 1);
      self.$root.$$lastDirtyWatch = null;
    }
  };
};

Scope.prototype.$watchCollection = function(watchFn, listenerFn) {
  var self = this;
  var newValue;
  var oldValue;
  var oldLength;
  var veryOldValue;
  var trackVeryOldValue = listenerFn.length > 1;
  var changeCount = 0;
  var firstRun = true;

  var internalWatchFn = function(scope) {
    var newLength;
    newValue = watchFn(scope);
    if (_.isObject(newValue)) {
      if (isArrayLike(newValue)) { //consider some array-like obeject, such as NodeList or arguments
        if (!_.isArray(oldValue)) {
          changeCount++;
          oldValue = [];
        }
        if (newValue.length !== oldValue.length) {
          changeCount++;
          oldValue.length = newValue.length;
        }
        _.forEach(newValue, function(newItem, i) {
          var bothNaN = _.isNaN(newItem) && _.isNaN(oldValue[i]); //judge NaN
          if (!bothNaN && oldValue[i] !== newItem) {
            oldValue[i] = newItem;
            changeCount++;
          }
        });
      } else {
        newLength = 0;
        if (!_.isObject(oldValue) || isArrayLike(oldValue)) {
          changeCount++;
          oldValue = {};
          oldLength = 0;
        }
        _.forOwn(newValue, function(newVal, key) {
          newLength++;
          if (oldValue.hasOwnProperty(key)) {
            var bothNaN = _.isNaN(newVal) && _.isNaN(oldValue[key]);
            if (!bothNaN && oldValue[key] !== newVal) { // 判断是否改变了对象的某一个属性值
              changeCount++;
              oldValue[key] = newVal;
            }
          } else {
            changeCount++; //表明对象中添加了属性值
            oldLength++;
            oldValue[key] = newVal;
          }
        });
        if (oldLength > newLength) { //这代表对象中有属性被移除了
          changeCount++;
          _.forOwn(oldValue, function(oldVal, key) { //detect deleting attribute of object
            if (!newValue.hasOwnProperty(key)) {
              oldLength--;
              delete oldValue[key];
            }
          });
        }
      }
    } else {
      if (!self.$areEqual(newValue, oldValue, false)) {
        changeCount++;
      }
      oldValue = newValue;
    }
    return changeCount;
  };

  var internalListernerFn = function() {
    if (firstRun) {
      listenerFn(newValue, newValue, self);
      firstRun = false;
    } else {
      listenerFn(newValue, veryOldValue, self);
    }

    if (trackVeryOldValue) {
      veryOldValue = _.clone(newValue);
    }
  };

  return self.$watch(internalWatchFn, internalListernerFn);
};

Scope.prototype.$watchGroup = function(watchFns, listenerFn) {
  var self = this;
  var newValues = new Array(watchFns.length);
  var oldValues = new Array(watchFns.length);
  var changeReactionScheduled = false;
  var firstRun = true;

  function watchGroupListener() {
    if (firstRun) {
      firstRun = false;
      listenerFn(newValues, newValues, self);
    } else {
      listenerFn(newValues, oldValues, self);
    }
    changeReactionScheduled = false;
  }

  if (watchFns.length === 0) {
    var shouldCall = true;
    self.$evalAsync(function() {
      if (shouldCall) {
        listenerFn(newValues, newValues, self);
      }
    });
    return function() { // deregisteration zero-watch listener
      shouldCall = false;
    };
  }

  //use _.map to get destory function of every watchFn
  var destroyFunctions = _.map(watchFns, function(watchFn, i) {
    return self.$watch(watchFn, function(newValue, oldValue) {
      newValues[i] = newValue;
      oldValues[i] = oldValue;
      //make $evalAsync execute only once
      if (!changeReactionScheduled) {
        changeReactionScheduled = true;
        self.$evalAsync(watchGroupListener);
      }
    });
  });

  return function() {
    _.forEach(destroyFunctions, function(destroyFunction) {
      destroyFunction();
    });
  };
};

Scope.prototype.$$digestOnce = function() {
  var self = this,
    dirty, continueLoop = true;
  //it means child scope, and it will be all the watcher's scope
  this.$everyScope(function(scope) {
    var newValue, oldValue;
    _.forEachRight(scope.$$watchers, function(watcher) {
      try {
        if (watcher) { //judge whether watch exists
          newValue = watcher.watchFn(scope);
          oldValue = watcher.last;
          if (!scope.$areEqual(newValue, oldValue, watcher.valueEq)) {
            //because $digest is from root to child, so we only mark dirty in root
            self.$root.$$lastDirtyWatch = watcher;
            // when value is obejct or array, clone it 
            watcher.last = watcher.valueEq ? _.cloneDeep(newValue) : newValue;
            watcher.listenerFn(newValue,
              (oldValue === initWatchVal ? newValue : oldValue),
              scope);
            dirty = true;
          } else if (self.$root.$$lastDirtyWatch === watcher) {
            continueLoop = false;
            return false; // it will break _.forEachRight
          }
        }
      } catch (e) {
        console.error(e);
      }
    });
    return continueLoop;
  });
  return dirty;
};

Scope.prototype.$digest = function() {
  var dirty;
  var ttl = 10; //Time To Live
  var self = this;
  self.$root.$$lastDirtyWatch = null;
  self.$beginPhase('$digest');

  //cancel and flush $applyAsync if $digest is running 
  if (self.$root.$$applyAsyncId) {
    clearTimeout(self.$root.$$applyAsyncId);
    self.$$flushApplyAsync();
  }

  do {
    while (self.$$asyncQueue.length) {
      try {
        var asyncTask = self.$$asyncQueue.shift();
        asyncTask.scope.$eval(asyncTask.expression);
      } catch (e) {
        console.error(e);
      }
    }
    dirty = self.$$digestOnce();
    if ((dirty || self.$$asyncQueue.length) && !(ttl--)) {
      self.$clearPhase();
      throw '10 digest iterations reached';
    }
  } while (dirty || self.$$asyncQueue.length);
  self.$clearPhase();

  //run $postDigest's fn
  while (this.$$postDigestQueue.length) {
    try {
      this.$$postDigestQueue.shift()();
    } catch (e) {
      console.error(e);
    }
  }
};

Scope.prototype.$areEqual = function(newValue, oldValue, valueEq) {
  if (valueEq) {
    return _.isEqual(newValue, oldValue);
  } else {
    return newValue === oldValue || (typeof(newValue) === 'number' &&
      typeof(oldValue) === 'number' && isNaN(newValue) && isNaN(oldValue));
  }
};


Scope.prototype.$eval = function(expr, locals) {
  return expr(this, locals);
};

/**
 * the purpose of $evalAsync is to do some worklater but still in the same digest
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
        self.$root.$digest();
      }
    }, 0);
  }
  self.$$asyncQueue.push({ scope: self, expression: expr });
};

//所有的$apply最后都会对应一次$digest
Scope.prototype.$apply = function(expr) {
  try {
    this.$beginPhase('$apply');
    return this.$eval(expr);
  } finally {
    this.$clearPhase();
    this.$root.$digest(); //invoke Angular with rootScope's $digest finally 
  }
};

Scope.prototype.$applyAsync = function(expr) {
  var self = this;
  self.$$applyAsyncQueue.push(function() {
    self.$eval(expr);
  });
  //a setTimeout to drain the queue has not been scheduled when $$applyAsyncId is null
  if (self.$root.$$applyAsyncId === null) {
    //generate $$applyAsyncId
    self.$root.$$applyAsyncId = setTimeout(function() {
      self.$apply(_.bind(self.$$flushApplyAsync, self));
    }, 0);
  }
};

Scope.prototype.$$flushApplyAsync = function() {
  while (this.$$applyAsyncQueue.length) {
    try {
      this.$$applyAsyncQueue.shift()();
    } catch (e) {
      console.error(e);
    }
  }
  this.$root.$$applyAsyncId = null;
};

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

//the fn will be run after next digest has finished
Scope.prototype.$$postDigest = function(fn) {
  this.$$postDigestQueue.push(fn);
};

Scope.prototype.$new = function(isolated, parent) {
  var child;
  parent = parent || this;
  if (isolated) {
    child = new Scope();
    child.$root = parent.$root;
    child.$$asyncQueue = parent.$$asyncQueue;
    child.$$postDigestQueue = parent.$$postDigestQueue;
    child.$$applyAsyncQueue = parent.$$applyAsyncQueue;
  } else {
    var ChildScope = function() {};
    ChildScope.prototype = this;
    child = new ChildScope();
  }
  parent.$$children.push(child);
  child.$parent = this;
  child.$$watchers = [];
  child.$$children = [];
  return child;
};

Scope.prototype.$everyScope = function(fn) {
  if (fn(this)) {
    //Array.every recurse every element
    return this.$$children.every(function(child) {
      return child.$everyScope(fn);
    });
  } else {
    return false;
  }
};

Scope.prototype.$destroy = function() {
  if (this.$parent) {
    var siblings = this.$parent.$$children;
    var indexOfThis = siblings.indexOf(this);
    if (indexOfThis >= 0) {
      siblings.splice(indexOfThis, 1);
    }
    this.$$watchers = null;
  }
};

module.exports = Scope;
