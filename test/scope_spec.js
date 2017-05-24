'use strict';

var Scope = require('../src/scope');
var _ = require('lodash');

describe('Scope', function() {
  it('can be constructed and used as an obejct', function() {
    var scope = new Scope();
    scope.aProperty = 1;
    expect(scope.aProperty).toBe(1);
  });
});

describe('digest', function() {
  var scope;

  beforeEach(function() {
    scope = new Scope();
  });

  it('calls the listener function of a watch on first $digest', function() {
    var watchFn = function() {
      return 'wat';
    };
    var listenerFn = jasmine.createSpy();
    scope.$watch(watchFn, listenerFn);
    scope.$digest();
    expect(listenerFn).toHaveBeenCalled();
  });

  it('calls the watch function with the scope as a argument', function() {
    var watchFn = jasmine.createSpy();
    var listenerFn = function() {};
    scope.$watch(watchFn, listenerFn);
    scope.$digest();
    expect(watchFn).toHaveBeenCalled();
  });

  it('calls the listener function when the watched value changes', function() {
    scope.someValue = 'a';
    scope.counter = 0;
    scope.$watch(function(scope) {
      return scope.someValue;
    }, function(newValue, oldValue, scope) {
      scope.counter++;
    });
    expect(scope.counter).toBe(0);
    scope.$digest();
    expect(scope.counter).toBe(1);

    scope.$digest();
    expect(scope.counter).toBe(1);

    scope.someValue = 'nb';
    scope.$digest();
    expect(scope.counter).toBe(2);
    scope.$digest();
    expect(scope.counter).toBe(2);
  });

  it('calls listener when watch value is first undefined', function() {
    scope.counter = 0;
    scope.$watch(function(scope) {
      return scope.someValue;
    }, function(newValue, oldValue, scope) {
      scope.counter++;
    });
    scope.$digest();
    expect(scope.counter).toBe(1);
  });

  it('calls listener with new value as old value the first time', function() {
    scope.someValue = 123;
    var oldValueGiven;
    scope.$watch(function(scope) {
      return scope.someValue;
    }, function(newValue, oldValue, scope) {
      oldValueGiven = oldValue;
    });
    scope.$digest();
    expect(oldValueGiven).toBe(123);
  });

  it('may have watchers that omit the listener function', function() {
    var watchFn = jasmine.createSpy().and.returnValue('someValue');
    scope.$watch(watchFn);
    scope.$digest();
    expect(watchFn).toHaveBeenCalled();
  });

  it('triggers chained watchers in the same digest', function() {
    scope.name = 'Young';
    scope.$watch(function(scope) {
      return scope.nameUpper;
    }, function(newValue, oldValue, scope) {
      if (newValue) {
        scope.initial = newValue.substring(0, 1) + '.';
      }
    });

    scope.$watch(function(scope) {
      return scope.name;
    }, function(newValue, oldValue, scope) {
      if (newValue) {
        scope.nameUpper = newValue.toUpperCase();
      }
    });

    scope.$digest();
    expect(scope.initial).toBe('Y.');
    scope.name = 'Baikal';
    scope.$digest();
    expect(scope.initial).toBe('B.');
  });

  it('gives up on the wathcers after 10 iterations', function() {
    scope.counterA = 0;
    scope.counterB = 0;

    scope.$watch(function(scope) {
      return scope.counterA;
    }, function(newValue, oldValue, scope) {
      scope.counterB++;
    });

    scope.$watch(function(scope) {
      return scope.counterB;
    }, function(newValue, oldValue, scope) {
      scope.counterA++;
    });

    expect((function() {
      scope.$digest(); //skill of jasmine
    })).toThrow();
  });

  it('ends the digest when the last watch is clean', function() {
    var watchExecutions = 0;
    scope.array = _.range(100);
    _.times(100, function(i) {
      scope.$watch(function(scope) {
        watchExecutions++;
        return scope.array[i];
      }, function(newValue, oldValue, scope) {});
    });
    scope.$digest();
    expect(watchExecutions).toBe(200);
    scope.array[0] = 520;
    scope.$digest();
    expect(watchExecutions).toBe(301);
  });

  it('does not end digest so that new watcher can run', function() {
    scope.value = 'a';
    scope.counter = 0;
    scope.$watch(function(scope) {
      return scope.value;
    }, function(newValue, oldValue, scope) {
      scope.$watch(function(scope) {
        return scope.value;
      }, function(newValue, oldValue, scope) {
        scope.counter++;
      });
      scope.counter++;
    });
  });

  it('compares based on value if enable', function() {
    scope.aValue = [1, 2, 3];
    scope.counter = 0;
    scope.$watch(function(scope) {
      return scope.aValue;
    }, function(newValue, oldValue, scope) {
      scope.counter++;
    }, true);
    scope.$digest();
    expect(scope.counter).toBe(1);
    scope.aValue.push(4);
    scope.$digest();
    expect(scope.counter).toBe(2);
  });

  it('correctly handle NaN', function() {
    scope.aValue = 0 / 0;
    scope.counter = 0;
    scope.$watch(function(scope) {
      return scope.aValue;
    }, function(newValue, oldValue, scope) {
      scope.counter++;
    });
    scope.$digest();
    expect(scope.counter).toBe(1);
    scope.$digest();
    expect(scope.counter).toBe(1);
  });

  // it('catches exceptions in watch function and continues', function() {
  //   scope.aValue = 1;
  //   scope.counter = 0;
  //   scope.$watch(function(scope) {
  //     throw 'Error';
  //   }, function(newValue, oldValue, scope) {});

  //   scope.$watch(function(scope) {
  //     return scope.aValue;
  //   }, function(newValue, oldValue, scope) {
  //     scope.counter++;
  //   });
  //   scope.$digest();
  //   expect(scope.counter).toBe(1);
  // });

  // it('catches exceptions in listener function and continues', function() {
  //   scope.aValue = 1;
  //   scope.counter = 0;
  //   scope.$watch(function(scope) {
  //     return scope.aValue;
  //   }, function(newValue, oldValue, scope) {
  //     throw 'Error';
  //   });
  //   scope.$watch(function(scope) {
  //     return scope.aValue;
  //   }, function(newValue, oldValue, scope) {
  //     scope.counter++;
  //   });
  //   scope.$digest();
  //   expect(scope.counter).toBe(1);
  // });

  it('allows destorying a $watch with a removal function', function() {
    scope.aValue = 'Young';
    scope.counter = 0;
    var desctoryWatch = scope.$watch(function(scope) {
      return scope.aValue;
    }, function(newValue, oldValue, scope) {
      scope.counter++;
    });
    scope.$digest();
    expect(scope.counter).toBe(1);
    scope.aValue = 'Baikal';
    scope.$digest();
    expect(scope.counter).toBe(2);
    desctoryWatch();
    scope.aValue = 'Yoda';
    scope.$digest();
    expect(scope.counter).toBe(2);
  });

  it('allows destorying a $watch during digest', function() {
    var watchCalls = [];
    scope.aValue = 'Young';
    scope.$watch(function(scope) {
      watchCalls.push('one');
      return scope.aValue;
    });
    var desctoryWatch = scope.$watch(function(scope) {
      watchCalls.push('two');
      desctoryWatch();
    });
    scope.$watch(function(scope) {
      watchCalls.push('three');
      return scope.aValue;
    });
    scope.$digest();
    expect(watchCalls).toEqual(['one', 'two', 'three', 'one', 'three']);
  });

  it('allows a $watch to destory another $watch', function() {
    scope.aValue = 'Young';
    scope.counter = 0;
    scope.$watch(function(scope) {
      return scope.aValue;
    }, function() {
      desctoryWatch();
    });
    var desctoryWatch = scope.$watch(function(scope) {},
      function(newValue, oldValue, scope) {});
    scope.$watch(function(scope) {
      return scope.aValue;
    }, function(newValue, oldValue, scope) {
      scope.counter++;
    });
    scope.$digest();
    expect(scope.counter).toBe(1);
  });

  it('allows a $watch to destory several $watch during digest', function() {
    scope.aValue = 'Young';
    scope.counter = 0;
    var desctoryWatch1 = scope.$watch(function(scope) {
      desctoryWatch1();
      desctoryWatch2();
    });
    var desctoryWatch2 = scope.$watch(function(scope) {},
      function(newValue, oldValue, scope) {
        scope.counter++;
      });
    scope.$digest();
    expect(scope.counter).toBe(0);
  });

  it("executes $eval's function and returns result", function() {
    scope.aValue = 11;
    var result = scope.$eval(function(scope) {
      return scope.aValue;
    });
    expect(result).toBe(11);
  });

  it("pass the second  $eval argument straight through", function() {
    scope.aValue = 11;
    var result = scope.$eval(function(scope, value) {
      return scope.aValue + value;
    }, 3);
    expect(result).toBe(14);
  });

  it('allows a $watch to destory another $watch', function() {
    scope.aValue = 'Young';
    scope.counter = 0;
    scope.$watch(function(scope) {
      return scope.aValue;
    }, function() {
      scope.counter++;
    });
    scope.$digest();
    expect(scope.counter).toBe(1);
    scope.$apply(function(scope) {
      scope.aValue = 'Baikal';
    });
    scope.$digest();
    expect(scope.counter).toBe(2);
  });

  it('executes given function later in the same cicle', function() {
    scope.aValue = 'Young';
    scope.asyncEvaluated = false;
    scope.asyncEvaluatedImmediately = false;
    scope.$watch(function(scope) {
      return scope.aValue;
    }, function() {
      scope.$evalAsync(function(scope) {
        scope.asyncEvaluated = true;
      });
      scope.asyncEvaluatedImmediately = scope.asyncEvaluated;
    });
    scope.$digest();
    expect(scope.asyncEvaluated).toBe(true);
    expect(scope.asyncEvaluatedImmediately).toBe(false);
  });

  it('executes $evalAsynced functions added by watch functions', function() {
    scope.aValue = [1, 2, 3];
    scope.asyncEvaluated = false;
    scope.$watch(
      function(scope) {
        if (!scope.asyncEvaluated) {
          scope.$evalAsync(function(scope) {
            scope.asyncEvaluated = true;
          });
        }
        return scope.aValue;
      },
      function(newValue, oldValue, scope) {}
    );
    scope.$digest();
    expect(scope.asyncEvaluated).toBe(true);
  });

  it('executes $evalAsynced functions even when not dirty', function() {
    scope.aValue = [1, 2, 3];
    scope.asyncEvaluatedTimes = 0;
    scope.$watch(
      function(scope) {
        if (scope.asyncEvaluatedTimes < 2) {
          scope.$evalAsync(function(scope) {
            scope.asyncEvaluatedTimes++;
          });
        }
        return scope.aValue;
      },
      function(newValue, oldValue, scope) {}
    );
    scope.$digest();
    expect(scope.asyncEvaluatedTimes).toBe(2);
  });

  it('eventually halt $evalAsync added by watch', function() {
    scope.aValue = [1, 2, 3];
    scope.$watch(
      function(scope) {
        scope.$evalAsync(function(scope) {});
        return scope.aValue;
      },
      function(newValue, oldValue, scope) {}
    );
    expect(function() { scope.$digest(); }).toThrow();
  });

  it('has a $$phase feld whose value is the current digest phase', function() {
    scope.aValue = [1, 2, 3];
    scope.phaseInWatchFunction = undefined;
    scope.phaseInListenerFunction = undefined;
    scope.phaseInApplyFunction = undefined;
    scope.$watch(
      function(scope) {
        scope.phaseInWatchFunction = scope.$$phase;
        return scope.aValue;
      },
      function(newValue, oldValue, scope) {
        scope.phaseInListenerFunction = scope.$$phase;
      }
    );
    scope.$apply(function(scope) {
      scope.phaseInApplyFunction = scope.$$phase;
    });
    expect(scope.phaseInWatchFunction).toBe('$digest');
    expect(scope.phaseInListenerFunction).toBe('$digest');
    expect(scope.phaseInApplyFunction).toBe('$apply');
  });

  it('schedules a digest in $evalAsync', function(done) {
    scope.aValue = 'abc';
    scope.counter = 0;
    scope.$watch(
      function(scope) {
        return scope.aValue;
      },
      function(newValue, oldValue, scope) {
        scope.counter++;
      }
    );
    scope.$evalAsync(function(scope) {});
    expect(scope.counter).toBe(0);
    setTimeout(function() {
      expect(scope.counter).toBe(1);
      done();
    }, 50);
  });
});

describe('$applyAsync', function() {
  var scope;
  beforeEach(function() {
    scope = new Scope();
  });
  it('allows async $apply with $applyAsync', function(done) {
    scope.counter = 0;
    scope.$watch(
      function(scope) {
        return scope.aValue;
      },
      function(newValue, oldValue, scope) {
        scope.counter++;
      }
    );
    scope.$digest();
    expect(scope.counter).toBe(1);
    scope.$applyAsync(function(scope) {
      scope.aValue = 'abc';
    });
    expect(scope.counter).toBe(1);
    setTimeout(function() {
      expect(scope.counter).toBe(2);
      done();
    }, 50);
  });
  
  it('never executes $applyAsynced function in the same cycle', function(done) {
    scope.aValue = [1, 2, 3];
    scope.asyncApplied = false;
    scope.$watch(
      function(scope) {
        return scope.aValue;
      },
      function(newValue, oldValue, scope) {
        scope.$applyAsync(function(scope) {
          scope.asyncApplied = true;
        });
      }
    );
    scope.$digest();
    expect(scope.asyncApplied).toBe(false);
    setTimeout(function() {
      expect(scope.asyncApplied).toBe(true);
      done();
    }, 50);
  });

  it('coalesces many calls to $applyAsync', function(done) {
    // scope.aValue = 'Young';
    scope.counter = 0;
    scope.$watch(function(scope) {
      return scope.aValue;
    }, function(newValue, oldValue, scope) {
      scope.counter++;
    });
    scope.$applyAsync(function() {
      scope.aValue = 'Yoda';
    });
    scope.$applyAsync(function() {
      scope.aValue = 'Baikal';
    });
    setTimeout(function() {
      expect(scope.counter).toBe(2);
      done();
    }, 50);
  });

  // it('cancels and ﬂushes $applyAsync if digested frst', function(done) {
  //   scope.counter = 0;
  //   scope.$watch(
  //     function(scope) {
  //       scope.counter++;
  //       return scope.aValue;
  //     },
  //     function(newValue, oldValue, scope) {}
  //   );
  //   scope.$applyAsync(function(scope) {
  //     scope.aValue = 'abc';
  //   });
  //   scope.$applyAsync(function(scope) {
  //     scope.aValue = 'def';
  //   });
  //   scope.$digest();
  //   expect(scope.counter).toBe(2);
  //   expect(scope.aValue).toEqual('def');
  //   setTimeout(function() {
  //     expect(scope.counter).toBe(2);
  //     done();
  //   }, 50);
  // });
});
