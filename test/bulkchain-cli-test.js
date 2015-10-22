'use strict';

process.env.NODE_ENV = 'test';
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

suite('bulkchain-cli:', function(done) {
    function check( done, f ) {
      try {
        f()
        done()
      } catch( e ) {
        done( e )
      }
    };
    
    var config = require(__dirname + '/../config/options.js');
    var assert = require("assert");
    
    test('this always passes', function() {
        assert.equal(1, 1);
    });
    
});

