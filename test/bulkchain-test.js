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

    test('getBlockCount', function(done) {
        bulkchain.getBlockCount( function client_getblockcount (err, blockcount) {
            assert(blockcount !== undefined)
            done()
        })
    })

    test('blockCountToBlockHash', function (done) {
        bulkchain.blockCountToBlockHash(363312, cb_blockCountToBlockHash)
        function cb_blockCountToBlockHash(err, blockhash) {
            assert.equal ( blockhash,'000000000000000004c7154fec6527603c642b3622803c7de06dd18ec56e4894')
            done()
        }
    })

    test('blockHashToBlockHeader (magic)', function (done) {
        var blockhash = '000000000000000004c7154fec6527603c642b3622803c7de06dd18ec56e4894'
        bulkchain.blockHashToBlockHeader(blockhash, cb_getBlock)
        function cb_getBlock(err, blockheader) {
            assert.equal(blockheader.hash, '000000000000000004c7154fec6527603c642b3622803c7de06dd18ec56e4894')
            done()
        }
    })

    test('blockCountToTime (magic)', function (done) {
        var blockcount = 367640
        bulkchain.blockCountToTime(blockcount, cb_blockCountToTime)
        function cb_blockCountToTime(err, time) {
            assert.equal(time, 1438263884)
            done()
        }
    })
    test('latestBlockTime', function (done) {
        bulkchain.latestBlockTime(function (latestblocktime) {
            assert(latestblocktime > 368329)
            done()
        })
    })

    test('dateToBlockCount (pre-genesis)', function (done) {
        var targettime = 100
        bulkchain.dateToBlockCount(targettime, cb_dateToBlockcount)
        function cb_dateToBlockcount (err, blockcount) {
            assert(blockcount < 363312)
            done()
        }
     })

    test('dateToBlockCount (post-apocalypse)', function (done) {
        var targettime = 9999999999
        bulkchain.dateToBlockCount(targettime, cb_dateToBlockcount)
        function cb_dateToBlockcount (err, blockcount) {
            assert(blockcount > 363312)
            done()
        }
    })

    test('dateToBlockCount (targettime == blocktime)', function (done) {
        var targettime = 1438656758
        bulkchain.dateToBlockCount(targettime, cb_dateToBlockcount)
        function cb_dateToBlockcount (err, blockcount) {
            assert(blockcount = 368329)
            done()
        }
    })

    test('dateToBlockCount (targettime != blocktime)', function (done) {
        var targettime = 1438656757
        bulkchain.dateToBlockCount(targettime, cb_dateToBlockcount)
        function cb_dateToBlockcount (err, blockcount) {
            assert(blockcount = 368329)
            done()
        }
    })
    
    test('dateRangeToBlockHash (targettime == blocktime)', function (done) {
        var starttime = 1438825753 // 368590
        var endtime =   1438830991  //368596
        bulkchain.dateRangeToBlockHash(starttime, endtime, cb_dateRangeToBlockHash)
        function cb_dateRangeToBlockHash (blockhasharr) {
            assert.equal(blockhasharr.length, 7)
            done()
        }
    })
    
    test('dateRangeToBlockHash (targettime != blocktime)', function (done) {
        var starttime = 1438825700 // 368590
        var endtime =   1438830900  //368596
        bulkchain.dateRangeToBlockHash(starttime, endtime, cb_dateRangeToBlockHash)
        function cb_dateRangeToBlockHash (blockhasharr) {
            assert.equal(blockhasharr.length, 7)
            done()
        }
    })

})

