'use strict';

var Logger = require('./Logger');

describe('[Unit] Logger', function() {

  it('should be an object', function() {
    expect(Logger).to.be.an('object');
  });

  it('should expose a fatal method', function() {
    expect(Logger).to.respondTo('fatal');
  });

  it('should expose a error method', function() {
    expect(Logger).to.respondTo('error');
  });

  it('should expose a warn method', function() {
    expect(Logger).to.respondTo('warn');
  });

  it('should expose a info method', function() {
    expect(Logger).to.respondTo('info');
  });

  it('should expose a debug method', function() {
    expect(Logger).to.respondTo('debug');
  });

  it('should expose a trace method', function() {
    expect(Logger).to.respondTo('trace');
  });

  it('should throw when specifying an invalid logger name', function() {
    expect(function() { Logger.setName(undefined); }).to.throw(Error);
    expect(function() { Logger.setName(null);      }).to.throw(Error);
    expect(function() { Logger.setName(42);        }).to.throw(Error);
    expect(function() { Logger.setName('');        }).to.throw(Error);
  });

});
