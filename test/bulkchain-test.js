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
    test('txidToRawTransaction (block reward)', function (done) {
        var txid = '4eb45cc8a5f1599867ed30b6aab5f9318466d17d5ebfb1adcd865bfb90a298b0'
        bulkchain.txidToRawTransaction(txid, cb_txidToRawTransaction)
        function cb_txidToRawTransaction(err, rawtransaction) {
            assert.equal(rawtransaction.txid, '4eb45cc8a5f1599867ed30b6aab5f9318466d17d5ebfb1adcd865bfb90a298b0')
            done()
        }
    })
    test('rawTransactionToInputDetail (magic)', function (done) {
        var rawtransaction = JSON.parse('{"hex":"0100000003b01432db0b3e6a48ea46a7309348ae1ec9e7ddec4d806595233baca4ffded4255b0000006b483045022100f176844ba296ca4a2a2383d400fa1ce4f5269528be809efb605682978faaee3d02207f868790bc52255ac0852b82347fcd8a1965488ef7b8f8514f9b485e3d4d63be0121020ab80fad8e873ea6450af1d90f3d8dd503b66cccae5861fe9b7292445bbc2b13ffffffffc572eda0356de9ac7cea8ac260b8f2e2097a9259f996bf569c9b73b9899d8080030000006a4730440220416ee7708cd97d6a888809d1fe4c56f3a765095de2ffa978cd8232ba45baf74d0220071f9ca88da49ca865aedf7f68cbd17252040f2d9285984585c40e354096df410121020ab80fad8e873ea6450af1d90f3d8dd503b66cccae5861fe9b7292445bbc2b13ffffffff4a696bbb8a6d4ce591fc98fda34ba951de6da926f990a8d2e8b99150b0ca8167060000006c493046022100b9a3078d1ee15f4e9f5202a1907e5087ceb3073c2404ed3c87d4bfd12dd7e474022100dcfa89d860f5ba6d74b3b817073c96c693cd1e4494daf082c1497456207e8a0b0121020ab80fad8e873ea6450af1d90f3d8dd503b66cccae5861fe9b7292445bbc2b13ffffffff02841d0000000000001976a91439ccc048204e05347a96a1b29aac0678967e830f88ace6bf3800000000001976a914b3f2fea1670d19b4e12dd575d82a49c1a35904fa88ac00000000","txid":"ed9f0b40ff4cbde454ebb1664fc4d33285525883618e17ea4f6b1406ff420258","version":1,"locktime":0,"vin":[{"txid":"25d4deffa4ac3b239565804decdde7c91eae489330a746ea486a3e0bdb3214b0","vout":91,"scriptSig":{"asm":"3045022100f176844ba296ca4a2a2383d400fa1ce4f5269528be809efb605682978faaee3d02207f868790bc52255ac0852b82347fcd8a1965488ef7b8f8514f9b485e3d4d63be01 020ab80fad8e873ea6450af1d90f3d8dd503b66cccae5861fe9b7292445bbc2b13","hex":"483045022100f176844ba296ca4a2a2383d400fa1ce4f5269528be809efb605682978faaee3d02207f868790bc52255ac0852b82347fcd8a1965488ef7b8f8514f9b485e3d4d63be0121020ab80fad8e873ea6450af1d90f3d8dd503b66cccae5861fe9b7292445bbc2b13"},"sequence":4294967295},{"txid":"80809d89b9739b9c56bf96f959927a09e2f2b860c28aea7cace96d35a0ed72c5","vout":3,"scriptSig":{"asm":"30440220416ee7708cd97d6a888809d1fe4c56f3a765095de2ffa978cd8232ba45baf74d0220071f9ca88da49ca865aedf7f68cbd17252040f2d9285984585c40e354096df4101 020ab80fad8e873ea6450af1d90f3d8dd503b66cccae5861fe9b7292445bbc2b13","hex":"4730440220416ee7708cd97d6a888809d1fe4c56f3a765095de2ffa978cd8232ba45baf74d0220071f9ca88da49ca865aedf7f68cbd17252040f2d9285984585c40e354096df410121020ab80fad8e873ea6450af1d90f3d8dd503b66cccae5861fe9b7292445bbc2b13"},"sequence":4294967295},{"txid":"6781cab05091b9e8d2a890f926a96dde51a94ba3fd98fc91e54c6d8abb6b694a","vout":6,"scriptSig":{"asm":"3046022100b9a3078d1ee15f4e9f5202a1907e5087ceb3073c2404ed3c87d4bfd12dd7e474022100dcfa89d860f5ba6d74b3b817073c96c693cd1e4494daf082c1497456207e8a0b01 020ab80fad8e873ea6450af1d90f3d8dd503b66cccae5861fe9b7292445bbc2b13","hex":"493046022100b9a3078d1ee15f4e9f5202a1907e5087ceb3073c2404ed3c87d4bfd12dd7e474022100dcfa89d860f5ba6d74b3b817073c96c693cd1e4494daf082c1497456207e8a0b0121020ab80fad8e873ea6450af1d90f3d8dd503b66cccae5861fe9b7292445bbc2b13"},"sequence":4294967295}],"vout":[{"value":7.556e-05,"n":0,"scriptPubKey":{"asm":"OP_DUP OP_HASH160 39ccc048204e05347a96a1b29aac0678967e830f OP_EQUALVERIFY OP_CHECKSIG","hex":"76a91439ccc048204e05347a96a1b29aac0678967e830f88ac","reqSigs":1,"type":"pubkeyhash","addresses":["16GcoHqFaCKjZDyUDmKZuvKYEzfdhBRuBD"]}},{"value":0.03719142,"n":1,"scriptPubKey":{"asm":"OP_DUP OP_HASH160 b3f2fea1670d19b4e12dd575d82a49c1a35904fa OP_EQUALVERIFY OP_CHECKSIG","hex":"76a914b3f2fea1670d19b4e12dd575d82a49c1a35904fa88ac","reqSigs":1,"type":"pubkeyhash","addresses":["1HQV3uK7n7o4Y41Qt3sjHaeLZfB9tp7JUM"]}}],"blockhash":"0000000000000000031d1a8126295bd342a4948890f0411e541910aabc8437b5","confirmations":1,"time":1438888798,"blocktime":1438888798}')
        bulkchain.rawTransactionToInputDetail(rawtransaction, cb_rawTransactionToInputDetail)
        function cb_rawTransactionToInputDetail(err, inputdetail) {
            assert(inputdetail.length = rawtransaction.vin.length)
            done()
        }
    })
    test('rawTransactionToTransactionSignature (magic)', function (done) {
        var rawtransaction = JSON.parse('{"hex":"0100000003b01432db0b3e6a48ea46a7309348ae1ec9e7ddec4d806595233baca4ffded4255b0000006b483045022100f176844ba296ca4a2a2383d400fa1ce4f5269528be809efb605682978faaee3d02207f868790bc52255ac0852b82347fcd8a1965488ef7b8f8514f9b485e3d4d63be0121020ab80fad8e873ea6450af1d90f3d8dd503b66cccae5861fe9b7292445bbc2b13ffffffffc572eda0356de9ac7cea8ac260b8f2e2097a9259f996bf569c9b73b9899d8080030000006a4730440220416ee7708cd97d6a888809d1fe4c56f3a765095de2ffa978cd8232ba45baf74d0220071f9ca88da49ca865aedf7f68cbd17252040f2d9285984585c40e354096df410121020ab80fad8e873ea6450af1d90f3d8dd503b66cccae5861fe9b7292445bbc2b13ffffffff4a696bbb8a6d4ce591fc98fda34ba951de6da926f990a8d2e8b99150b0ca8167060000006c493046022100b9a3078d1ee15f4e9f5202a1907e5087ceb3073c2404ed3c87d4bfd12dd7e474022100dcfa89d860f5ba6d74b3b817073c96c693cd1e4494daf082c1497456207e8a0b0121020ab80fad8e873ea6450af1d90f3d8dd503b66cccae5861fe9b7292445bbc2b13ffffffff02841d0000000000001976a91439ccc048204e05347a96a1b29aac0678967e830f88ace6bf3800000000001976a914b3f2fea1670d19b4e12dd575d82a49c1a35904fa88ac00000000","txid":"ed9f0b40ff4cbde454ebb1664fc4d33285525883618e17ea4f6b1406ff420258","version":1,"locktime":0,"vin":[{"txid":"25d4deffa4ac3b239565804decdde7c91eae489330a746ea486a3e0bdb3214b0","vout":91,"scriptSig":{"asm":"3045022100f176844ba296ca4a2a2383d400fa1ce4f5269528be809efb605682978faaee3d02207f868790bc52255ac0852b82347fcd8a1965488ef7b8f8514f9b485e3d4d63be01 020ab80fad8e873ea6450af1d90f3d8dd503b66cccae5861fe9b7292445bbc2b13","hex":"483045022100f176844ba296ca4a2a2383d400fa1ce4f5269528be809efb605682978faaee3d02207f868790bc52255ac0852b82347fcd8a1965488ef7b8f8514f9b485e3d4d63be0121020ab80fad8e873ea6450af1d90f3d8dd503b66cccae5861fe9b7292445bbc2b13"},"sequence":4294967295},{"txid":"80809d89b9739b9c56bf96f959927a09e2f2b860c28aea7cace96d35a0ed72c5","vout":3,"scriptSig":{"asm":"30440220416ee7708cd97d6a888809d1fe4c56f3a765095de2ffa978cd8232ba45baf74d0220071f9ca88da49ca865aedf7f68cbd17252040f2d9285984585c40e354096df4101 020ab80fad8e873ea6450af1d90f3d8dd503b66cccae5861fe9b7292445bbc2b13","hex":"4730440220416ee7708cd97d6a888809d1fe4c56f3a765095de2ffa978cd8232ba45baf74d0220071f9ca88da49ca865aedf7f68cbd17252040f2d9285984585c40e354096df410121020ab80fad8e873ea6450af1d90f3d8dd503b66cccae5861fe9b7292445bbc2b13"},"sequence":4294967295},{"txid":"6781cab05091b9e8d2a890f926a96dde51a94ba3fd98fc91e54c6d8abb6b694a","vout":6,"scriptSig":{"asm":"3046022100b9a3078d1ee15f4e9f5202a1907e5087ceb3073c2404ed3c87d4bfd12dd7e474022100dcfa89d860f5ba6d74b3b817073c96c693cd1e4494daf082c1497456207e8a0b01 020ab80fad8e873ea6450af1d90f3d8dd503b66cccae5861fe9b7292445bbc2b13","hex":"493046022100b9a3078d1ee15f4e9f5202a1907e5087ceb3073c2404ed3c87d4bfd12dd7e474022100dcfa89d860f5ba6d74b3b817073c96c693cd1e4494daf082c1497456207e8a0b0121020ab80fad8e873ea6450af1d90f3d8dd503b66cccae5861fe9b7292445bbc2b13"},"sequence":4294967295}],"vout":[{"value":7.556e-05,"n":0,"scriptPubKey":{"asm":"OP_DUP OP_HASH160 39ccc048204e05347a96a1b29aac0678967e830f OP_EQUALVERIFY OP_CHECKSIG","hex":"76a91439ccc048204e05347a96a1b29aac0678967e830f88ac","reqSigs":1,"type":"pubkeyhash","addresses":["16GcoHqFaCKjZDyUDmKZuvKYEzfdhBRuBD"]}},{"value":0.03719142,"n":1,"scriptPubKey":{"asm":"OP_DUP OP_HASH160 b3f2fea1670d19b4e12dd575d82a49c1a35904fa OP_EQUALVERIFY OP_CHECKSIG","hex":"76a914b3f2fea1670d19b4e12dd575d82a49c1a35904fa88ac","reqSigs":1,"type":"pubkeyhash","addresses":["1HQV3uK7n7o4Y41Qt3sjHaeLZfB9tp7JUM"]}}],"blockhash":"0000000000000000031d1a8126295bd342a4948890f0411e541910aabc8437b5","confirmations":1,"time":1438888798,"blocktime":1438888798}')
        bulkchain.rawTransactionToTransactionSignature(rawtransaction, cb_rawTransactionToTransactionSignature)
        function cb_rawTransactionToTransactionSignature(transactionsignature) {
            assert.equal(transactionsignature.txid, rawtransaction.txid)
            assert.equal(transactionsignature.version, rawtransaction.version)
            assert.equal(transactionsignature.locktime, rawtransaction.locktime)
            assert.equal(transactionsignature.blockhash, rawtransaction.blockhash)
            assert.equal(transactionsignature.confirmations, rawtransaction.confirmations)
            assert.equal(transactionsignature.time, rawtransaction.time)
            assert.equal(transactionsignature.blocktime, rawtransaction.blocktime)
            assert.equal(transactionsignature.vout_satoshi_sum, 3726698)
            assert.equal(transactionsignature.vout_value_concat.length, rawtransaction.vout.length)
            assert.equal(transactionsignature.vout_count, rawtransaction.vout.length)
            assert.equal(transactionsignature.vin_value_concat.length, rawtransaction.vin.length)
            assert.equal(transactionsignature.vin_satoshi_sum, 3736698)
            assert.equal(transactionsignature.miningfee, 10000)
            assert(transactionsignature.vin_satoshi_mean)
            assert(transactionsignature.vin_satoshi_median)
            assert(transactionsignature.vin_satoshi_mode)
            assert(transactionsignature.vin_satoshi_sum)
            assert(transactionsignature.vin_satoshi_variance)
            assert(transactionsignature.vin_satoshi_median_absolute_deviation)
            assert(transactionsignature.vin_satoshi_geometric_mean)
            assert(transactionsignature.vin_satoshi_harmonic_mean)
            assert(transactionsignature.vin_satoshi_root_mean_square)
            assert(transactionsignature.vin_satoshi_min)
            assert(transactionsignature.vin_satoshi_max)
            assert(transactionsignature.vout_satoshi_mean)
            assert(transactionsignature.vout_satoshi_median)
            assert(transactionsignature.vout_satoshi_mode)
            assert(transactionsignature.vout_satoshi_sum)
            assert(transactionsignature.vout_satoshi_variance)
            assert(transactionsignature.vout_satoshi_standard_deviation)
            assert(transactionsignature.vout_satoshi_median_absolute_deviation)
            assert(transactionsignature.vout_satoshi_geometric_mean)
            assert(transactionsignature.vout_satoshi_harmonic_mean)
            assert(transactionsignature.vout_satoshi_root_mean_square)
            assert(transactionsignature.vout_satoshi_min)
            assert(transactionsignature.vout_satoshi_max)
            done()
        }
    })
})

