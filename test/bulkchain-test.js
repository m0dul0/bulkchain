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
        var starttime = 1438825753 // 368590 Wed Aug  5 18:49:13 PDT 2015
        var endtime =   1438830991  //368596 Wed Aug  5 20:16:32 PDT 2015
        bulkchain.dateRangeToBlockHash(starttime, endtime, cb_dateRangeToBlockHash)
        function cb_dateRangeToBlockHash (blockhasharr) {
            assert.equal(blockhasharr.length, 6)
            done()
        }
    })
    test('dateRangeToBlockHash (time trial 1 day)', function (done) {
        var starttime = 1436943600 // date -j -f %Y%m%d%H%M%S 20150715000000 +%s
        var endtime =   1437030000 // date -j -f %Y%m%d%H%M%S 20150716000000 +%s
        bulkchain.dateRangeToBlockHash(starttime, endtime, cb_dateRangeToBlockHash)
        function cb_dateRangeToBlockHash (blockhasharr) {
            assert(blockhasharr)
            done()
        }
    })
    test('blockHashToTxid (magic)', function (done) {
        var blockhash = '000000000000000004c7154fec6527603c642b3622803c7de06dd18ec56e4894'
        bulkchain.blockHashToTxid(blockhash, cb_blockHashToTxid)
        function cb_blockHashToTxid(err, txid) {
            assert.equal(txid.length, 1004)
            done()
        }
    })
    test('blockHashToTxid (magic)', function (done) {
        var blockhash = '000000000000000012d5e815d36764cc0c7d7e2b0f7716af92c285aebe40eeed'
        bulkchain.blockHashToTxid(blockhash, cb_blockHashToTxid)
        function cb_blockHashToTxid(err, txid) {
            assert.equal(txid.length, 1256)
            done()
        }
    })
    test('txidToRawTransaction (block reward)', function (done) {
        var txid = '4eb45cc8a5f1599867ed30b6aab5f9318466d17d5ebfb1adcd865bfb90a298b0'
        bulkchain.txidToRawTransaction(txid, cb_txidToRawTransaction)
        function cb_txidToRawTransaction(err, rawtransaction) {
            assert.equal(rawtransaction.txid, '4eb45cc8a5f1599867ed30b6aab5f9318466d17d5ebfb1adcd865bfb90a298b0')
            done()
        }
    })
    test('txidToRawTransaction (block reward)', function (done) {
        var txid = '8dabbf51f78c1e7286866af1de403118c5ddbe57ca93b54859245916d2bf1063'
        bulkchain.txidToRawTransaction(txid, cb_txidToRawTransaction)
        function cb_txidToRawTransaction(err, rawtransaction) {
            assert.equal(rawtransaction.txid, '8dabbf51f78c1e7286866af1de403118c5ddbe57ca93b54859245916d2bf1063')
            done()
        }
    })
    test('rawTransactionToInputDetail (magic)', function (done) {
        this.timeout(10000);
        var rawtransaction = JSON.parse('{"hex":"0100000003b01432db0b3e6a48ea46a7309348ae1ec9e7ddec4d806595233baca4ffded4255b0000006b483045022100f176844ba296ca4a2a2383d400fa1ce4f5269528be809efb605682978faaee3d02207f868790bc52255ac0852b82347fcd8a1965488ef7b8f8514f9b485e3d4d63be0121020ab80fad8e873ea6450af1d90f3d8dd503b66cccae5861fe9b7292445bbc2b13ffffffffc572eda0356de9ac7cea8ac260b8f2e2097a9259f996bf569c9b73b9899d8080030000006a4730440220416ee7708cd97d6a888809d1fe4c56f3a765095de2ffa978cd8232ba45baf74d0220071f9ca88da49ca865aedf7f68cbd17252040f2d9285984585c40e354096df410121020ab80fad8e873ea6450af1d90f3d8dd503b66cccae5861fe9b7292445bbc2b13ffffffff4a696bbb8a6d4ce591fc98fda34ba951de6da926f990a8d2e8b99150b0ca8167060000006c493046022100b9a3078d1ee15f4e9f5202a1907e5087ceb3073c2404ed3c87d4bfd12dd7e474022100dcfa89d860f5ba6d74b3b817073c96c693cd1e4494daf082c1497456207e8a0b0121020ab80fad8e873ea6450af1d90f3d8dd503b66cccae5861fe9b7292445bbc2b13ffffffff02841d0000000000001976a91439ccc048204e05347a96a1b29aac0678967e830f88ace6bf3800000000001976a914b3f2fea1670d19b4e12dd575d82a49c1a35904fa88ac00000000","txid":"ed9f0b40ff4cbde454ebb1664fc4d33285525883618e17ea4f6b1406ff420258","version":1,"locktime":0,"vin":[{"txid":"25d4deffa4ac3b239565804decdde7c91eae489330a746ea486a3e0bdb3214b0","vout":91,"scriptSig":{"asm":"3045022100f176844ba296ca4a2a2383d400fa1ce4f5269528be809efb605682978faaee3d02207f868790bc52255ac0852b82347fcd8a1965488ef7b8f8514f9b485e3d4d63be01 020ab80fad8e873ea6450af1d90f3d8dd503b66cccae5861fe9b7292445bbc2b13","hex":"483045022100f176844ba296ca4a2a2383d400fa1ce4f5269528be809efb605682978faaee3d02207f868790bc52255ac0852b82347fcd8a1965488ef7b8f8514f9b485e3d4d63be0121020ab80fad8e873ea6450af1d90f3d8dd503b66cccae5861fe9b7292445bbc2b13"},"sequence":4294967295},{"txid":"80809d89b9739b9c56bf96f959927a09e2f2b860c28aea7cace96d35a0ed72c5","vout":3,"scriptSig":{"asm":"30440220416ee7708cd97d6a888809d1fe4c56f3a765095de2ffa978cd8232ba45baf74d0220071f9ca88da49ca865aedf7f68cbd17252040f2d9285984585c40e354096df4101 020ab80fad8e873ea6450af1d90f3d8dd503b66cccae5861fe9b7292445bbc2b13","hex":"4730440220416ee7708cd97d6a888809d1fe4c56f3a765095de2ffa978cd8232ba45baf74d0220071f9ca88da49ca865aedf7f68cbd17252040f2d9285984585c40e354096df410121020ab80fad8e873ea6450af1d90f3d8dd503b66cccae5861fe9b7292445bbc2b13"},"sequence":4294967295},{"txid":"6781cab05091b9e8d2a890f926a96dde51a94ba3fd98fc91e54c6d8abb6b694a","vout":6,"scriptSig":{"asm":"3046022100b9a3078d1ee15f4e9f5202a1907e5087ceb3073c2404ed3c87d4bfd12dd7e474022100dcfa89d860f5ba6d74b3b817073c96c693cd1e4494daf082c1497456207e8a0b01 020ab80fad8e873ea6450af1d90f3d8dd503b66cccae5861fe9b7292445bbc2b13","hex":"493046022100b9a3078d1ee15f4e9f5202a1907e5087ceb3073c2404ed3c87d4bfd12dd7e474022100dcfa89d860f5ba6d74b3b817073c96c693cd1e4494daf082c1497456207e8a0b0121020ab80fad8e873ea6450af1d90f3d8dd503b66cccae5861fe9b7292445bbc2b13"},"sequence":4294967295}],"vout":[{"value":7.556e-05,"n":0,"scriptPubKey":{"asm":"OP_DUP OP_HASH160 39ccc048204e05347a96a1b29aac0678967e830f OP_EQUALVERIFY OP_CHECKSIG","hex":"76a91439ccc048204e05347a96a1b29aac0678967e830f88ac","reqSigs":1,"type":"pubkeyhash","addresses":["16GcoHqFaCKjZDyUDmKZuvKYEzfdhBRuBD"]}},{"value":0.03719142,"n":1,"scriptPubKey":{"asm":"OP_DUP OP_HASH160 b3f2fea1670d19b4e12dd575d82a49c1a35904fa OP_EQUALVERIFY OP_CHECKSIG","hex":"76a914b3f2fea1670d19b4e12dd575d82a49c1a35904fa88ac","reqSigs":1,"type":"pubkeyhash","addresses":["1HQV3uK7n7o4Y41Qt3sjHaeLZfB9tp7JUM"]}}],"blockhash":"0000000000000000031d1a8126295bd342a4948890f0411e541910aabc8437b5","confirmations":1,"time":1438888798,"blocktime":1438888798}')
        bulkchain.rawTransactionToInputDetail(rawtransaction, cb_rawTransactionToInputDetail)
        function cb_rawTransactionToInputDetail(inputdetail) {
            assert.equal(inputdetail.length, rawtransaction.vin.length)
            done()
        }
    })
    test('rawTransactionToInputDetail (block reward aka no inputs)', function (done) {
        this.timeout(10000);
        var rawtransaction = JSON.parse (
'{"hex":"01000000010000000000000000000000000000000000000000000000000000000000000000ffffffff49037fb105062f503253482ffabe6d6d7efe4cd94e8c84846fd9c2cccf21123625ae5335024f1e3ea2fbf826d2f9077001000000000000002368030043a66110d55b002f736c7573682f0000000001bb2d0496000000001976a9147c154ed1dc59609e3d26abb2df2ea3d587cd8c4188ac00000000","txid":"4324c8719f8fdb1d13416cc1de3615431d7a9aa42fe71e2a24744d923a8fa77b","version":1,"locktime":0,"vin":[{"coinbase":"037fb105062f503253482ffabe6d6d7efe4cd94e8c84846fd9c2cccf21123625ae5335024f1e3ea2fbf826d2f9077001000000000000002368030043a66110d55b002f736c7573682f","sequence":0}],"vout":[{"value":25.16856251,"n":0,"scriptPubKey":{"asm":"OP_DUP OP_HASH160 7c154ed1dc59609e3d26abb2df2ea3d587cd8c41 OP_EQUALVERIFY OP_CHECKSIG","hex":"76a9147c154ed1dc59609e3d26abb2df2ea3d587cd8c4188ac","reqSigs":1,"type":"pubkeyhash","addresses":["1CK6KHY6MHgYvmRQ4PAafKYDrg1ejbH1cE"]}}],"blockhash":"00000000000000000a276100df16b2e39d8fc8af2be496b99d03b9e8e34ff35f","confirmations":7256,"time":1441453244,"blocktime":1441453244}')
        bulkchain.rawTransactionToInputDetail(rawtransaction, cb_rawTransactionToInputDetail)
        function cb_rawTransactionToInputDetail(inputdetail) {
            assert.equal(inputdetail, undefined)
            done()
        }
    })

    test('txidToInputDetail (magic)', function (done) {
        this.timeout(10000);
        bulkchain.txidToInputDetail('25d4deffa4ac3b239565804decdde7c91eae489330a746ea486a3e0bdb3214b0', 91, cb_txidToInputDetail)
        function cb_txidToInputDetail(err, inputdetail) {
            assert.equal(inputdetail[0].n, 91)
            done()
        }
    })
    
    test('txidToOutputArr (magic)', function (done) {
        this.timeout(10000);
        bulkchain.txidToOutputArr('25d4deffa4ac3b239565804decdde7c91eae489330a746ea486a3e0bdb3214b0', cb_txidToOutputArr)
        function cb_txidToOutputArr(err, outputArr) {
            assert.equal(outputArr.vout.length, 200)
            done()
        }
    })

    test('dateRangeToTransactionSignature (time trial 1 block)', function (done) {
        this.timeout(1200000);
        
        var starttime = 1441453061
        var endtime = 1441453062
        //linux shell takes time 348971ms
        //var starttime = 1441090800 // date --date "2015-09-01 00:00:00" +%s
        //var endtime =   1441177200 // date --date "2015-09-02 00:00:00" +%s
        // OSX 
        //         var starttime = 1436943600 // date -j -f %Y%m%d%H%M%S 20150715000000 +%s
        //         var endtime =   1437030000 // date -j -f %Y%m%d%H%M%S 20150716000000 +%s
        bulkchain.dateRangeToTransactionSignature(starttime, endtime, cb_dateRangeToTransactionSignature)
        function cb_dateRangeToTransactionSignature (transactionSignatureArr) {
            assert(transactionSignatureArr)
            done()
        }
    });
})
