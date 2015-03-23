'use strict';

var Transpiler = require('./Transpiler');


describe('[Unit] Transpiler', function() {

  it('should allow to require ES6 files', function(done) {
    var stub = require('./Transpiler.spec.stub.es6');

    stub.stringify(2)
      .then(function(v) {
        expect(v).to.equal('2');
        done();
      })
      .catch(done)
    ;
  });

});
