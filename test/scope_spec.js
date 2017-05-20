'use strict';

var Scope = require('../src/scope');

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
    scope.$watch(function() {
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
    expect(scope.counter).toBe(2);

    scope.$digest();
    expect(scope.counter).toBe(2);
    scope.$digest();
    expect(scope.counter).toBe(2);
  });
});
