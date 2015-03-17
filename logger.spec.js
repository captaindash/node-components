'use strict';

var logger = require('./logger');

describe('[Unit] logger', function() {

  it('should be an object', function() {
    expect(logger).to.be.an('object');
  });

  it('should expose a fatal method', function() {
    expect(logger).to.respondTo('fatal');
  });

  it('should expose a error method', function() {
    expect(logger).to.respondTo('error');
  });

  it('should expose a warn method', function() {
    expect(logger).to.respondTo('warn');
  });

  it('should expose a info method', function() {
    expect(logger).to.respondTo('info');
  });

  it('should expose a debug method', function() {
    expect(logger).to.respondTo('debug');
  });

  it('should expose a trace method', function() {
    expect(logger).to.respondTo('trace');
  });

});
