'use strict';

process.env.NODE_ENV = 'test';
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
var bulkchain = require(process.cwd() + '/lib/bulkchain.js')

var assert = require("assert");

suite('bulkchain:', function(done) {
    
    function check( done, f ) {
      try {
        f()
        done()
      } catch( e ) {
        done( e )
      }
    }

    test('date_to_blockcount with a known date', function (done) {
        var targetdate = 1435734000
        date_to_blockcount(targetdate, function(blockinfo) {
            assert.equal(blockinfo.blockcount, 363312)
            done()
        })
    });
});

