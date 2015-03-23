'use strict';

var MongoDB = require('./MongoDB');

describe('[Unit] MongoDB', function() {

  it('should be an object', function() {
    expect(MongoDB).to.be.an('object');
  });

  it('should export a connection property', function() {
    expect(MongoDB).to.have.property('connection');
  });

  it('should expose a connect function', function() {
    expect(MongoDB).to.respondTo('connect');
  });

  it('should expose a disconnect function', function() {
    expect(MongoDB).to.respondTo('disconnect');
  });

});
