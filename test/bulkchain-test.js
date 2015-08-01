'use strict';

process.env.NODE_ENV = 'test';
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

suite('bulkchain:', function(done) {
    
    var bulkchain = require(process.cwd() + '/lib/bulkchain.js')
    var assert = require("assert");
    
    function check( done, f ) {
      try {
        f()
        done()
      } catch( e ) {
        done( e )
      }
    }
    test('getBlockCount', function (done) {
        bulkchain.getBlockCount(function (blockcount) {
            assert(blockcount > 363312)
            done()
        })
    });
    test('dateToBlockCount (pre-satoshi targetdate)', function (done) {
        bulkchain.dateToBlockCount(100, function (blockcount) {
            assert(blockcount < 363312)
            done()
        })
    });
    test('dateToBlockCount (magic)', function (done) {
        bulkchain.dateToBlockCount(1435734000, function (blockcount) {
            assert(blockcount = 363313)
            done()
        })
    });
    
    test('getBlock (magic)', function (done) {
        var blockhash = '00000000000000000bb70c518539844d0b35b30c2c785413881c0de37eb00d38'
        bulkchain.getBlock(blockhash, function (block) {
            assert.equal(blockhash, block.hash)
            done()
        })
    })
    
    test('getBlockTime (magic numbers)', function (done) {
        var blockhash = '000000000000000004c7154fec6527603c642b3622803c7de06dd18ec56e4894'
        bulkchain.getBlockTime(blockhash, function (blocktime) {
            assert.equal(blocktime, 1435733095)
            done()
        })
    })
})

