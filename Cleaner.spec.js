'use strict';

var cleaner = require('./Cleaner');

describe('[Unit] Cleaner', function() {

  it('should be an object', function() {
    expect(cleaner).to.be.an('object');
  });

  it('should expose an onExit function', function() {
    expect(cleaner).to.respondTo('onExit');
  });

});
