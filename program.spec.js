'use strict';

var program = require('./program');

describe('[Unit] program', function() {

  it('should be an object', function() {
    expect(program).to.be.an('object');
  });

  it('should expose an onExit function', function() {
    expect(program).to.respondTo('onExit');
  });

});
