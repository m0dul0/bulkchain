'use strict';

process.env.NODE_ENV = 'test';
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

suite('bitcoin-server:', function(done) {
    
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
    
    var bitcoin = require('bitcoin')

    var client = new bitcoin.Client({
      host: config.bitcoind_host,
      user: config.bitcoind_rpc_user,
      pass: config.bitcoind_rpc_pass,
      timeout: 30000
    });
    
    test('bitcoind server is alive', function(done) {
        client.getBlockCount( function client_getblockcount (err, blockcount) {
            assert(blockcount !== undefined)
            done()
        })
    });
});