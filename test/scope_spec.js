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
    scope.counter = 0;
    scope.$watch(
      function(scope) {
        scope.counter++;
        return scope.aValue;
      },
      function(newValue, oldValue, scope) {}
    );
    scope.$applyAsync(function(scope) {
      scope.aValue = 'abc';
    });
    scope.$applyAsync(function(scope) {
      scope.aValue = 'def';
    });
    setTimeout(function() {
      expect(scope.counter).toBe(2);
      done();
    }, 50);
  });

  it('cancels and ﬂushes $applyAsync if digested first', function(done) {
    scope.counter = 0;
    scope.$watch(
      function(scope) {
        scope.counter++;
        return scope.aValue;
      },
      function(newValue, oldValue, scope) {}
    );
    scope.$applyAsync(function(scope) {
      scope.aValue = 'abc';
    });
    scope.$applyAsync(function(scope) {
      scope.aValue = 'def';
    });
    scope.$digest();
    expect(scope.counter).toBe(2);
    expect(scope.aValue).toEqual('def');
    setTimeout(function() {
      expect(scope.counter).toBe(2);
      done();
    }, 50);
  });
});

describe('$postDigest', function() {
  var scope;

  beforeEach(function() {
    scope = new Scope();
  });

  it('runs after each digest', function() {
    scope.counter = 0;
    scope.$$postDigest(function() {
      scope.counter++;
    });
    expect(scope.counter).toBe(0);
    scope.$digest();
    expect(scope.counter).toBe(1);
    scope.$digest();
    expect(scope.counter).toBe(1);
  });

  it('does not include $$postDigest in the digest', function() {
    scope.aValue = 'original value';
    scope.$$postDigest(function() {
      scope.aValue = 'changed value';
    });
    scope.$watch(
      function(scope) {
        return scope.aValue;
      },
      function(newValue, oldValue, scope) {
        scope.watchedValue = newValue;
      }
    );
    scope.$digest();
    expect(scope.watchedValue).toBe('original value');
    scope.$digest();
    expect(scope.watchedValue).toBe('changed value');
  });
});

describe('$evalAsync', function() {
  var scope;

  beforeEach(function() {
    scope = new Scope();
  });

  /*it('catches exceptions in $evalAsync', function(done) {
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
    scope.$evalAsync(function(scope) {
      throw 'Error';
    });
    setTimeout(function() {
      expect(scope.counter).toBe(1);
      done();
    }, 50);
  });*/
});

describe('$applyAsync', function() {
  var scope;

  beforeEach(function() {
    scope = new Scope();
  });

  /*it('catches exceptions in $applyAsync', function(done) {
    scope.$applyAsync(function(scope) {
      throw 'Error';
    });
    scope.$applyAsync(function(scope) {
      throw 'Error';
    });
    scope.$applyAsync(function(scope) {
      scope.applied = true;
    });
    setTimeout(function() {
      expect(scope.applied).toBe(true);
      done();
    }, 50);
  });*/
});

describe('$$postDigest', function() {
  var scope;

  beforeEach(function() {
    scope = new Scope();
  });

  /*it('catches exceptions in $$postDigest', function() {
    var didRun = false;
    scope.$$postDigest(function() {
      throw 'Error';
    });
    scope.$$postDigest(function() {
      didRun = true;
    });
    scope.$digest();
    expect(didRun).toBe(true);
  });*/
});

describe('$watchGroup', function() {
  var scope;

  beforeEach(function() {
    scope = new Scope();
  });

  it('takes watches as an array and calls listener with arrays', function() {
    var gotNewValues, gotOldValues;
    scope.aValue = 1;
    scope.anotherValue = 2;
    scope.$watchGroup([
      function(scope) {
        return scope.aValue;
      },
      function(scope) {
        return scope.anotherValue;
      }
    ], function(newValues, oldValues, scope) {
      gotNewValues = newValues;
      gotOldValues = oldValues;
    });
    scope.$digest();
    expect(gotNewValues).toEqual([1, 2]);
    expect(gotOldValues).toEqual([1, 2]);
  });

  it('uses the same array of old and new values on first run', function() {
    var gotNewValues, gotOldValues;
    scope.aValue = 1;
    scope.anotherValue = 2;
    scope.$watchGroup([
      function(scope) {
        return scope.aValue;
      },
      function(scope) {
        return scope.anotherValue;
      }
    ], function(newValues, oldValues, scope) {
      gotNewValues = newValues;
      gotOldValues = oldValues;
    });
    scope.$digest();
    expect(gotNewValues).toEqual(gotOldValues);
  });

  it('uses different arrays for old and new values on subsequent runs', function() {
    var gotNewValues, gotOldValues;
    scope.aValue = 1;
    scope.anotherValue = 2;
    scope.$watchGroup([
      function(scope) {
        return scope.aValue;
      },
      function(scope) {
        return scope.anotherValue;
      }
    ], function(newValues, oldValues, scope) {
      gotNewValues = newValues;
      gotOldValues = oldValues;
    });
    scope.$digest();
    scope.anotherValue = 3;
    scope.$digest();
    expect(gotNewValues).toEqual([1, 3]);
    expect(gotOldValues).toEqual([1, 2]);
  });

  it('calls the listener once when the watch array is empty', function() {
    var gotNewValues, gotOldValues;
    scope.$watchGroup([], function(newValues, oldValues, scope) {
      gotNewValues = newValues;
      gotOldValues = oldValues;
    });
    scope.$digest();
    expect(gotNewValues).toEqual([]);
    expect(gotOldValues).toEqual([]);
  });

  it('can be deregistered', function() {
    var counter = 0;
    scope.aValue = 1;
    scope.anotherValue = 2;
    var destroyGroup = scope.$watchGroup([
      function(scope) {
        return scope.aValue;
      },
      function(scope) {
        return scope.anotherValue;
      }
    ], function(newValues, oldValues, scope) {
      counter++;
    });
    scope.$digest();
    scope.anotherValue = 3;
    destroyGroup();
    scope.$digest();
    expect(counter).toEqual(1);
  });

  it('does not call the zero-watch listener when deregistered frst', function() {
    var counter = 0;
    var destroyGroup = scope.$watchGroup([], function(newValues, oldValues, scope) {
      counter++;
    });
    destroyGroup();
    scope.$digest();
    expect(counter).toEqual(0);
  });
});

describe('inheritance', function() {

  it("inherits the parent's properties", function() {
    var parent = new Scope();
    parent.aValue = [1, 2, 3];
    var child = parent.$new();
    expect(child.aValue).toEqual([1, 2, 3]);
  });

  it('does not cause a parent to inherit its properties', function() {
    var parent = new Scope();
    var child = parent.$new();
    child.aValue = [1, 2, 3];
    expect(parent.aValue).toBeUndefined();
  });

  it('inherits the parents properties whenever they are defned', function() {
    var parent = new Scope();
    var child = parent.$new();
    parent.aValue = [1, 2, 3];
    expect(child.aValue).toEqual([1, 2, 3]);
  });

  it('can manipulate a parent scopes property', function() {
    var parent = new Scope();
    var child = parent.$new();
    parent.aValue = [1, 2, 3];
    child.aValue.push(4);
    expect(child.aValue).toEqual([1, 2, 3, 4]);
    expect(parent.aValue).toEqual([1, 2, 3, 4]);
  });

  it('can watch a property in the parent', function() {
    var parent = new Scope();
    var child = parent.$new();
    parent.aValue = [1, 2, 3];
    child.counter = 0;
    child.$watch(
      function(scope) {
        return scope.aValue;
      },
      function(newValue, oldValue, scope) {
        scope.counter++;
      },
      true
    );
    child.$digest();
    expect(child.counter).toBe(1);
    parent.aValue.push(4);
    child.$digest();
    expect(child.counter).toBe(2);
  });

  it('can be nested at any depth', function() {
    var a = new Scope();
    var aa = a.$new();
    var aaa = aa.$new();
    var aab = aa.$new();
    var ab = a.$new();
    var abb = ab.$new();
    a.value = 1;
    expect(aa.value).toBe(1);
    expect(aaa.value).toBe(1);
    expect(aab.value).toBe(1);
    expect(ab.value).toBe(1);
    expect(abb.value).toBe(1);
    ab.anotherValue = 2;
    expect(abb.anotherValue).toBe(2);
    expect(aa.anotherValue).toBeUndefined();
    expect(aaa.anotherValue).toBeUndefined();
  });

  it('shadows a parents property with the same name', function() {
    var parent = new Scope();
    var child = parent.$new();
    parent.name = 'Joe';
    child.name = 'Jill';
    expect(child.name).toBe('Jill');
    expect(parent.name).toBe('Joe');
  });

  it('does not shadow members of parent scopes attributes', function() {
    var parent = new Scope();
    var child = parent.$new();
    parent.user = { name: 'Joe' };
    child.user.name = 'Jill';
    expect(child.user.name).toBe('Jill');
    expect(parent.user.name).toBe('Jill');
  });

  it('does not digest its parent(s)', function() {
    var parent = new Scope();
    var child = parent.$new();
    parent.aValue = 'abc';
    parent.$watch(
      function(scope) {
        return scope.aValue;
      },
      function(newValue, oldValue, scope) {
        scope.aValueWas = newValue;
      }
    );
    child.$digest();
    expect(child.aValueWas).toBeUndefined();
  });

  it('keeps a record of its children', function() {
    var parent = new Scope();
    var child1 = parent.$new();
    var child2 = parent.$new();
    var child2_1 = child2.$new();
    expect(parent.$$children.length).toBe(2);
    expect(parent.$$children[0]).toBe(child1);
    expect(parent.$$children[1]).toBe(child2);
    expect(child1.$$children.length).toBe(0);
    expect(child2.$$children.length).toBe(1);
    expect(child2.$$children[0]).toBe(child2_1);
  });

  it('digests from root on $apply', function() {
    var parent = new Scope();
    var child = parent.$new();
    var child2 = child.$new();

    parent.aValue = 'abc';
    parent.counter = 0;
    parent.$watch(
      function(scope) {
        return scope.aValue;
      },
      function(newValue, oldValue, scope) {
        scope.counter++;
      }
    );

    child2.$apply(function(scope) {});
    expect(parent.counter).toBe(1);
  });

  it('schedules a digest from root on $evalAsync', function(done) {
    var parent = new Scope();
    var child = parent.$new();
    var child2 = child.$new();

    parent.aValue = 'abc';
    parent.counter = 0;
    parent.$watch(
      function(scope) {
        return scope.aValue;
      },
      function(newValue, oldValue, scope) {
        scope.counter++;
      }
    );

    child2.$evalAsync(function(scope) {});
    setTimeout(function() {
      expect(parent.counter).toBe(1);
      done();
    }, 50);
  });

  it('does not have access to parent attributes when isolated', function() {
    var parent = new Scope();
    var child = parent.$new(true);

    parent.aValue = 'abc';

    expect(child.aValue).toBeUndefined();
  });

  it('cannot watch parent attributes when isolated', function() {
    var parent = new Scope();
    var child = parent.$new(true);

    parent.aValue = 'abc';

    child.$watch(
      function(scope) {
        return scope.aValue;
      },
      function(newValue, oldValue, scope) {
        scope.aValueWas = newValue;
      }
    );

    child.$digest();
    expect(child.aValueWas).toBeUndefined();
  });

  it('digests its isolated children', function() {
    var parent = new Scope();
    var child = parent.$new(true);

    child.aValue = 'abc';

    child.$watch(
      function(scope) {
        return scope.aValue;
      },
      function(newValue, oldValue, scope) {
        scope.aValueWas = newValue;
      }
    );

    parent.$digest();
    expect(child.aValueWas).toBe('abc');
  });

  it('digests from root on $apply when isolated', function() {
    var parent = new Scope();
    var child = parent.$new(true);
    var child2 = child.$new();

    parent.aValue = 'abc';
    parent.counter = 0;
    parent.$watch(
      function(scope) {
        return scope.aValue;
      },
      function(newValue, oldValue, scope) {
        scope.counter++;
      }
    );

    child2.$apply(function(scope) {});
    expect(parent.counter).toBe(1);
  });


  it('schedules a digest from root on $evalAsync when isolated', function(done) {
    var parent = new Scope();
    var child = parent.$new(true);
    var child2 = child.$new();

    parent.aValue = 'abc';
    parent.counter = 0;
    parent.$watch(
      function(scope) {
        return scope.aValue;
      },
      function(newValue, oldValue, scope) {
        scope.counter++;
      }
    );

    child2.$evalAsync(function(scope) {});
    setTimeout(function() {
      expect(parent.counter).toBe(1);
      done();
    }, 50);
  });

  it('executes $evalAsync functions on isolated scopes', function(done) {
    var parent = new Scope();
    var child = parent.$new(true);

    child.$evalAsync(function(scope) {
      scope.didEvalAsync = true;
    });

    setTimeout(function() {
      expect(child.didEvalAsync).toBe(true);
      done();
    }, 100);
  });

  it('executes $applyAsync functions on isolated scopes', function() {
    var parent = new Scope();
    var child = parent.$new(true);
    var applied = false;

    parent.$applyAsync(function() {
      applied = true;
    });
    child.$digest();

    expect(applied).toBe(true);
  });

  it('executes $$postDigest functions on isolated scopes', function() {
    var parent = new Scope();
    var child = parent.$new(true);

    child.$$postDigest(function() {
      child.didPostDigest = true;
    });
    parent.$digest();

    expect(child.didPostDigest).toBe(true);
  });

  it('can take some other scope as the parent', function() {
    var prototypeParent = new Scope();
    var hierarchyParent = new Scope();
    var child = prototypeParent.$new(false, hierarchyParent);

    prototypeParent.a = 42;
    expect(child.a).toBe(42);

    child.counter = 0;
    child.$watch(function(scope) { 
      scope.counter++;
    });

    prototypeParent.$digest();
    expect(child.counter).toBe(0);

    hierarchyParent.$digest();
    expect(child.counter).toBe(2);
  });

  it('is no longer digested when $destroy has been called', function() {
    var parent = new Scope();
    var child = parent.$new();

    child.aValue = [1, 2, 3];
    child.counter = 0;
    child.$watch(
      function(scope) {
        return scope.aValue; },
      function(newValue, oldValue, scope) {
        scope.counter++;
      },
      true
    );

    parent.$digest();
    expect(child.counter).toBe(1);

    child.aValue.push(4);
    parent.$digest();
    expect(child.counter).toBe(2);

    child.$destroy();
    child.aValue.push(5);
    parent.$digest();
    expect(child.counter).toBe(2);
  });


});
