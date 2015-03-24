'use strict';

var Redis = require('./Redis');

describe('[Unit] Redis', function() {

  it('should be an object', function() {
    expect(Redis).to.be.an('object');
  });

  it('should export a connection property', function() {
    expect(Redis).to.have.property('connection')
      .and.to.be.an('object');
  });

  it('should expose a connect function', function() {
    expect(Redis).to.respondTo('connect');
  });

  it('should expose a disconnect function', function() {
    expect(Redis).to.respondTo('disconnect');
  });

  it('should expose a setPrefix function', function() {
    expect(Redis).to.respondTo('setPrefix');
  });

});
