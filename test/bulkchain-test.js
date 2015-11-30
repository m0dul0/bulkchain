'use strict';

process.env.NODE_ENV = 'test';
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";


suite('bulkchain:', (done) => {

    var bulkchain = require(process.cwd() + '/lib/bulkchain.js')
    var chai = require('chai');
    var expect = chai.expect;
    var Promise = require('bluebird');

    test('blockCountToTime (magic)', () =>  {
        let blockcount = 367640;
        return (
            Promise.any(bulkchain.blockCountToTime(blockcount))
            .then((blocktime) => expect(blocktime.time).to.equal(1438263884))
        )
    });
    test('timeToBlockCount (pre-genesis)', () =>  {
        let targettime = 100;
        return (
            bulkchain.timeToBlockCount(targettime)
            .then((blockcount) => {
                expect(blockcount).to.equal(1)
            })
        )
    });
    test('timeToBlockCount (post-apocalypse)', () =>  {
        let targettime = 9999999999;
        return (
            bulkchain.timeToBlockCount(targettime)
            .then((blockcount) => {
                expect(blockcount).to.be.above(363312)
            })
        )
    });
    test('timeToBlockCount (targettime == blocktime)', () =>  {
        let targettime = 1438656758;
        return (
            bulkchain.timeToBlockCount(targettime)
            .then((blockcount) => {
                expect(blockcount).to.equal(368329)
            })
        )
    });
    test('timeToBlockCount (targettime != blocktime)', () =>  {
        let targettime = 1438656757;
        return (
            bulkchain.timeToBlockCount(targettime)
            .then((blockcount) => {
                expect(blockcount).to.equal(368329)
            })
        )
    });
    test('dateRangeToBlockHash (targettime == blocktime)', () =>  {
         let starttime = 1438825753; // 368590 Wed Aug  5 18:49:13 PDT 2015
         let endtime =   1438830991;  //368596 Wed Aug  5 20:16:32 PDT 2015
         var blockHashArr = []
         return (
             Promise.each(bulkchain.dateRangeToBlockHash(starttime, endtime), function(blockhash) {
                 blockHashArr.push(blockhash);
                 if ( blockHashArr.length === 6 ) {
                     expect (blockHashArr[0]).to.equal('0000000000000000067c05b9336127c1c83e31ba8bee032d2b0f3e62b486065a');
                     expect (blockHashArr[5]).to.equal('0000000000000000015a8586aed07634f9f0397756914232bd6deea3643ddc27');
                 }
             })
         )
    });
    test('dateRangeToBlockHash (targettime == blocktime)', () =>  {
         let starttime = 1436943600;
         // date -j -f %Y%m%d%H%M%S 20150715000000 +%s
         let endtime =   1437030000;
         // date -j -f %Y%m%d%H%M%S 20150716000000 +%s
         var blockHashArr = []
         return (
             Promise.each(bulkchain.dateRangeToBlockHash(starttime, endtime), function(blockhash) {
                 blockHashArr.push(blockhash);
                 if ( blockHashArr.length === 160 ) {
                     expect (blockHashArr[0]).to.equal('000000000000000012d5e815d36764cc0c7d7e2b0f7716af92c285aebe40eeed');
                     expect (blockHashArr[159]).to.equal('00000000000000000a8a1e247226a15b3c055ab3e3f13a12e351b6680aadaa15');
                 }

             })
         )
    });
    test('txidToOutput (magic)', () =>  {
        let txid = '25d4deffa4ac3b239565804decdde7c91eae489330a746ea486a3e0bdb3214b0';
        bulkchain.txidToOutput(txid).then( function(output) {
            return expect(output.destroy_starttime).to.equal(1437325438);
        })
    });
    test('txidToInputItem (magic)', () =>  {
        let txid = '25d4deffa4ac3b239565804decdde7c91eae489330a746ea486a3e0bdb3214b0';
        let n = 91;
        bulkchain.txidToInputItem(txid, n)
        .then(function(inputdetail) {
            return (expect(inputdetail.n).to.equal(n));
        })
    });
    test('txidToInputItem (magic)', () =>  {
        let txid = '25d4deffa4ac3b239565804decdde7c91eae489330a746ea486a3e0bdb3214b0';
        let n = 91;
        bulkchain.txidToInputItem(txid, n)
        .then(function(inputdetail) {
            return (expect(inputdetail.destroy_start).to.equal(1437325438));
        })
    });
    test('rawTransactionToInputDetail (magic)', () =>  {
        let rawtransaction = JSON.parse('{"hex":"0100000003b01432db0b3e6a48ea46a7309348ae1ec9e7ddec4d806595233baca4ffded4255b0000006b483045022100f176844ba296ca4a2a2383d400fa1ce4f5269528be809efb605682978faaee3d02207f868790bc52255ac0852b82347fcd8a1965488ef7b8f8514f9b485e3d4d63be0121020ab80fad8e873ea6450af1d90f3d8dd503b66cccae5861fe9b7292445bbc2b13ffffffffc572eda0356de9ac7cea8ac260b8f2e2097a9259f996bf569c9b73b9899d8080030000006a4730440220416ee7708cd97d6a888809d1fe4c56f3a765095de2ffa978cd8232ba45baf74d0220071f9ca88da49ca865aedf7f68cbd17252040f2d9285984585c40e354096df410121020ab80fad8e873ea6450af1d90f3d8dd503b66cccae5861fe9b7292445bbc2b13ffffffff4a696bbb8a6d4ce591fc98fda34ba951de6da926f990a8d2e8b99150b0ca8167060000006c493046022100b9a3078d1ee15f4e9f5202a1907e5087ceb3073c2404ed3c87d4bfd12dd7e474022100dcfa89d860f5ba6d74b3b817073c96c693cd1e4494daf082c1497456207e8a0b0121020ab80fad8e873ea6450af1d90f3d8dd503b66cccae5861fe9b7292445bbc2b13ffffffff02841d0000000000001976a91439ccc048204e05347a96a1b29aac0678967e830f88ace6bf3800000000001976a914b3f2fea1670d19b4e12dd575d82a49c1a35904fa88ac00000000","txid":"ed9f0b40ff4cbde454ebb1664fc4d33285525883618e17ea4f6b1406ff420258","version":1,"locktime":0,"vin":[{"txid":"25d4deffa4ac3b239565804decdde7c91eae489330a746ea486a3e0bdb3214b0","vout":91,"scriptSig":{"asm":"3045022100f176844ba296ca4a2a2383d400fa1ce4f5269528be809efb605682978faaee3d02207f868790bc52255ac0852b82347fcd8a1965488ef7b8f8514f9b485e3d4d63be01 020ab80fad8e873ea6450af1d90f3d8dd503b66cccae5861fe9b7292445bbc2b13","hex":"483045022100f176844ba296ca4a2a2383d400fa1ce4f5269528be809efb605682978faaee3d02207f868790bc52255ac0852b82347fcd8a1965488ef7b8f8514f9b485e3d4d63be0121020ab80fad8e873ea6450af1d90f3d8dd503b66cccae5861fe9b7292445bbc2b13"},"sequence":4294967295},{"txid":"80809d89b9739b9c56bf96f959927a09e2f2b860c28aea7cace96d35a0ed72c5","vout":3,"scriptSig":{"asm":"30440220416ee7708cd97d6a888809d1fe4c56f3a765095de2ffa978cd8232ba45baf74d0220071f9ca88da49ca865aedf7f68cbd17252040f2d9285984585c40e354096df4101 020ab80fad8e873ea6450af1d90f3d8dd503b66cccae5861fe9b7292445bbc2b13","hex":"4730440220416ee7708cd97d6a888809d1fe4c56f3a765095de2ffa978cd8232ba45baf74d0220071f9ca88da49ca865aedf7f68cbd17252040f2d9285984585c40e354096df410121020ab80fad8e873ea6450af1d90f3d8dd503b66cccae5861fe9b7292445bbc2b13"},"sequence":4294967295},{"txid":"6781cab05091b9e8d2a890f926a96dde51a94ba3fd98fc91e54c6d8abb6b694a","vout":6,"scriptSig":{"asm":"3046022100b9a3078d1ee15f4e9f5202a1907e5087ceb3073c2404ed3c87d4bfd12dd7e474022100dcfa89d860f5ba6d74b3b817073c96c693cd1e4494daf082c1497456207e8a0b01 020ab80fad8e873ea6450af1d90f3d8dd503b66cccae5861fe9b7292445bbc2b13","hex":"493046022100b9a3078d1ee15f4e9f5202a1907e5087ceb3073c2404ed3c87d4bfd12dd7e474022100dcfa89d860f5ba6d74b3b817073c96c693cd1e4494daf082c1497456207e8a0b0121020ab80fad8e873ea6450af1d90f3d8dd503b66cccae5861fe9b7292445bbc2b13"},"sequence":4294967295}],"vout":[{"value":7.556e-05,"n":0,"scriptPubKey":{"asm":"OP_DUP OP_HASH160 39ccc048204e05347a96a1b29aac0678967e830f OP_EQUALVERIFY OP_CHECKSIG","hex":"76a91439ccc048204e05347a96a1b29aac0678967e830f88ac","reqSigs":1,"type":"pubkeyhash","addresses":["16GcoHqFaCKjZDyUDmKZuvKYEzfdhBRuBD"]}},{"value":0.03719142,"n":1,"scriptPubKey":{"asm":"OP_DUP OP_HASH160 b3f2fea1670d19b4e12dd575d82a49c1a35904fa OP_EQUALVERIFY OP_CHECKSIG","hex":"76a914b3f2fea1670d19b4e12dd575d82a49c1a35904fa88ac","reqSigs":1,"type":"pubkeyhash","addresses":["1HQV3uK7n7o4Y41Qt3sjHaeLZfB9tp7JUM"]}}],"blockhash":"0000000000000000031d1a8126295bd342a4948890f0411e541910aabc8437b5","confirmations":1,"time":1438888798,"blocktime":1438888798}')
        bulkchain.rawTransactionToInputDetail(rawtransaction)
        .then(function (inputitems) {
            return expect(inputitems.sort()[0].n).to.equal(3);
        })
    });
    test('rawTransactionToInputDetail (block reward aka no inputs)', () =>  {
        let rawtransaction = JSON.parse ('{"hex":"01000000010000000000000000000000000000000000000000000000000000000000000000ffffffff49037fb105062f503253482ffabe6d6d7efe4cd94e8c84846fd9c2cccf21123625ae5335024f1e3ea2fbf826d2f9077001000000000000002368030043a66110d55b002f736c7573682f0000000001bb2d0496000000001976a9147c154ed1dc59609e3d26abb2df2ea3d587cd8c4188ac00000000","txid":"4324c8719f8fdb1d13416cc1de3615431d7a9aa42fe71e2a24744d923a8fa77b","version":1,"locktime":0,"vin":[{"coinbase":"037fb105062f503253482ffabe6d6d7efe4cd94e8c84846fd9c2cccf21123625ae5335024f1e3ea2fbf826d2f9077001000000000000002368030043a66110d55b002f736c7573682f","sequence":0}],"vout":[{"value":25.16856251,"n":0,"scriptPubKey":{"asm":"OP_DUP OP_HASH160 7c154ed1dc59609e3d26abb2df2ea3d587cd8c41 OP_EQUALVERIFY OP_CHECKSIG","hex":"76a9147c154ed1dc59609e3d26abb2df2ea3d587cd8c4188ac","reqSigs":1,"type":"pubkeyhash","addresses":["1CK6KHY6MHgYvmRQ4PAafKYDrg1ejbH1cE"]}}],"blockhash":"00000000000000000a276100df16b2e39d8fc8af2be496b99d03b9e8e34ff35f","confirmations":7256,"time":1441453244,"blocktime":1441453244}')
        bulkchain.rawTransactionToInputDetail(rawtransaction)
        .then(function(inputitem) {
            return expect(inputitem[0]).to.equal(undefined);
        })
    });
    test('rawTransactionToTransactionSignature (echo txid for block reward)', () =>  {
        let rawtransaction = JSON.parse ('{"hex":"01000000010000000000000000000000000000000000000000000000000000000000000000ffffffff49037fb105062f503253482ffabe6d6d7efe4cd94e8c84846fd9c2cccf21123625ae5335024f1e3ea2fbf826d2f9077001000000000000002368030043a66110d55b002f736c7573682f0000000001bb2d0496000000001976a9147c154ed1dc59609e3d26abb2df2ea3d587cd8c4188ac00000000","txid":"4324c8719f8fdb1d13416cc1de3615431d7a9aa42fe71e2a24744d923a8fa77b","version":1,"locktime":0,"vin":[{"coinbase":"037fb105062f503253482ffabe6d6d7efe4cd94e8c84846fd9c2cccf21123625ae5335024f1e3ea2fbf826d2f9077001000000000000002368030043a66110d55b002f736c7573682f","sequence":0}],"vout":[{"value":25.16856251,"n":0,"scriptPubKey":{"asm":"OP_DUP OP_HASH160 7c154ed1dc59609e3d26abb2df2ea3d587cd8c41 OP_EQUALVERIFY OP_CHECKSIG","hex":"76a9147c154ed1dc59609e3d26abb2df2ea3d587cd8c4188ac","reqSigs":1,"type":"pubkeyhash","addresses":["1CK6KHY6MHgYvmRQ4PAafKYDrg1ejbH1cE"]}}],"blockhash":"00000000000000000a276100df16b2e39d8fc8af2be496b99d03b9e8e34ff35f","confirmations":7256,"time":1441453244,"blocktime":1441453244}')
        bulkchain.rawTransactionToTransactionSignature(rawtransaction)
        .then(function(transactionSignature) {
            return expect(transactionSignature.txid).to.equal("4324c8719f8fdb1d13416cc1de3615431d7a9aa42fe71e2a24744d923a8fa77b");
        })
    });

    test('rawTransactionTransactionSignature (echo txid for non-reward transaction)', () =>  {
        let rawtransaction = JSON.parse('{"hex":"0100000003b01432db0b3e6a48ea46a7309348ae1ec9e7ddec4d806595233baca4ffded4255b0000006b483045022100f176844ba296ca4a2a2383d400fa1ce4f5269528be809efb605682978faaee3d02207f868790bc52255ac0852b82347fcd8a1965488ef7b8f8514f9b485e3d4d63be0121020ab80fad8e873ea6450af1d90f3d8dd503b66cccae5861fe9b7292445bbc2b13ffffffffc572eda0356de9ac7cea8ac260b8f2e2097a9259f996bf569c9b73b9899d8080030000006a4730440220416ee7708cd97d6a888809d1fe4c56f3a765095de2ffa978cd8232ba45baf74d0220071f9ca88da49ca865aedf7f68cbd17252040f2d9285984585c40e354096df410121020ab80fad8e873ea6450af1d90f3d8dd503b66cccae5861fe9b7292445bbc2b13ffffffff4a696bbb8a6d4ce591fc98fda34ba951de6da926f990a8d2e8b99150b0ca8167060000006c493046022100b9a3078d1ee15f4e9f5202a1907e5087ceb3073c2404ed3c87d4bfd12dd7e474022100dcfa89d860f5ba6d74b3b817073c96c693cd1e4494daf082c1497456207e8a0b0121020ab80fad8e873ea6450af1d90f3d8dd503b66cccae5861fe9b7292445bbc2b13ffffffff02841d0000000000001976a91439ccc048204e05347a96a1b29aac0678967e830f88ace6bf3800000000001976a914b3f2fea1670d19b4e12dd575d82a49c1a35904fa88ac00000000","txid":"ed9f0b40ff4cbde454ebb1664fc4d33285525883618e17ea4f6b1406ff420258","version":1,"locktime":0,"vin":[{"txid":"25d4deffa4ac3b239565804decdde7c91eae489330a746ea486a3e0bdb3214b0","vout":91,"scriptSig":{"asm":"3045022100f176844ba296ca4a2a2383d400fa1ce4f5269528be809efb605682978faaee3d02207f868790bc52255ac0852b82347fcd8a1965488ef7b8f8514f9b485e3d4d63be01 020ab80fad8e873ea6450af1d90f3d8dd503b66cccae5861fe9b7292445bbc2b13","hex":"483045022100f176844ba296ca4a2a2383d400fa1ce4f5269528be809efb605682978faaee3d02207f868790bc52255ac0852b82347fcd8a1965488ef7b8f8514f9b485e3d4d63be0121020ab80fad8e873ea6450af1d90f3d8dd503b66cccae5861fe9b7292445bbc2b13"},"sequence":4294967295},{"txid":"80809d89b9739b9c56bf96f959927a09e2f2b860c28aea7cace96d35a0ed72c5","vout":3,"scriptSig":{"asm":"30440220416ee7708cd97d6a888809d1fe4c56f3a765095de2ffa978cd8232ba45baf74d0220071f9ca88da49ca865aedf7f68cbd17252040f2d9285984585c40e354096df4101 020ab80fad8e873ea6450af1d90f3d8dd503b66cccae5861fe9b7292445bbc2b13","hex":"4730440220416ee7708cd97d6a888809d1fe4c56f3a765095de2ffa978cd8232ba45baf74d0220071f9ca88da49ca865aedf7f68cbd17252040f2d9285984585c40e354096df410121020ab80fad8e873ea6450af1d90f3d8dd503b66cccae5861fe9b7292445bbc2b13"},"sequence":4294967295},{"txid":"6781cab05091b9e8d2a890f926a96dde51a94ba3fd98fc91e54c6d8abb6b694a","vout":6,"scriptSig":{"asm":"3046022100b9a3078d1ee15f4e9f5202a1907e5087ceb3073c2404ed3c87d4bfd12dd7e474022100dcfa89d860f5ba6d74b3b817073c96c693cd1e4494daf082c1497456207e8a0b01 020ab80fad8e873ea6450af1d90f3d8dd503b66cccae5861fe9b7292445bbc2b13","hex":"493046022100b9a3078d1ee15f4e9f5202a1907e5087ceb3073c2404ed3c87d4bfd12dd7e474022100dcfa89d860f5ba6d74b3b817073c96c693cd1e4494daf082c1497456207e8a0b0121020ab80fad8e873ea6450af1d90f3d8dd503b66cccae5861fe9b7292445bbc2b13"},"sequence":4294967295}],"vout":[{"value":7.556e-05,"n":0,"scriptPubKey":{"asm":"OP_DUP OP_HASH160 39ccc048204e05347a96a1b29aac0678967e830f OP_EQUALVERIFY OP_CHECKSIG","hex":"76a91439ccc048204e05347a96a1b29aac0678967e830f88ac","reqSigs":1,"type":"pubkeyhash","addresses":["16GcoHqFaCKjZDyUDmKZuvKYEzfdhBRuBD"]}},{"value":0.03719142,"n":1,"scriptPubKey":{"asm":"OP_DUP OP_HASH160 b3f2fea1670d19b4e12dd575d82a49c1a35904fa OP_EQUALVERIFY OP_CHECKSIG","hex":"76a914b3f2fea1670d19b4e12dd575d82a49c1a35904fa88ac","reqSigs":1,"type":"pubkeyhash","addresses":["1HQV3uK7n7o4Y41Qt3sjHaeLZfB9tp7JUM"]}}],"blockhash":"0000000000000000031d1a8126295bd342a4948890f0411e541910aabc8437b5","confirmations":1,"time":1438888798,"blocktime":1438888798}')
        bulkchain.rawTransactionToTransactionSignature(rawtransaction)
        .then(function(transactionSignature) {
            return expect(transactionSignature.txid).to.equal(rawtransaction.txid)
        })
    });
    //
    // test('rawTransactionToTransactionSignature (magic - input details not empty )', () =>  {
    //     let rawtransaction = JSON.parse('{"hex":"0100000003b01432db0b3e6a48ea46a7309348ae1ec9e7ddec4d806595233baca4ffded4255b0000006b483045022100f176844ba296ca4a2a2383d400fa1ce4f5269528be809efb605682978faaee3d02207f868790bc52255ac0852b82347fcd8a1965488ef7b8f8514f9b485e3d4d63be0121020ab80fad8e873ea6450af1d90f3d8dd503b66cccae5861fe9b7292445bbc2b13ffffffffc572eda0356de9ac7cea8ac260b8f2e2097a9259f996bf569c9b73b9899d8080030000006a4730440220416ee7708cd97d6a888809d1fe4c56f3a765095de2ffa978cd8232ba45baf74d0220071f9ca88da49ca865aedf7f68cbd17252040f2d9285984585c40e354096df410121020ab80fad8e873ea6450af1d90f3d8dd503b66cccae5861fe9b7292445bbc2b13ffffffff4a696bbb8a6d4ce591fc98fda34ba951de6da926f990a8d2e8b99150b0ca8167060000006c493046022100b9a3078d1ee15f4e9f5202a1907e5087ceb3073c2404ed3c87d4bfd12dd7e474022100dcfa89d860f5ba6d74b3b817073c96c693cd1e4494daf082c1497456207e8a0b0121020ab80fad8e873ea6450af1d90f3d8dd503b66cccae5861fe9b7292445bbc2b13ffffffff02841d0000000000001976a91439ccc048204e05347a96a1b29aac0678967e830f88ace6bf3800000000001976a914b3f2fea1670d19b4e12dd575d82a49c1a35904fa88ac00000000","txid":"ed9f0b40ff4cbde454ebb1664fc4d33285525883618e17ea4f6b1406ff420258","version":1,"locktime":0,"vin":[{"txid":"25d4deffa4ac3b239565804decdde7c91eae489330a746ea486a3e0bdb3214b0","vout":91,"scriptSig":{"asm":"3045022100f176844ba296ca4a2a2383d400fa1ce4f5269528be809efb605682978faaee3d02207f868790bc52255ac0852b82347fcd8a1965488ef7b8f8514f9b485e3d4d63be01 020ab80fad8e873ea6450af1d90f3d8dd503b66cccae5861fe9b7292445bbc2b13","hex":"483045022100f176844ba296ca4a2a2383d400fa1ce4f5269528be809efb605682978faaee3d02207f868790bc52255ac0852b82347fcd8a1965488ef7b8f8514f9b485e3d4d63be0121020ab80fad8e873ea6450af1d90f3d8dd503b66cccae5861fe9b7292445bbc2b13"},"sequence":4294967295},{"txid":"80809d89b9739b9c56bf96f959927a09e2f2b860c28aea7cace96d35a0ed72c5","vout":3,"scriptSig":{"asm":"30440220416ee7708cd97d6a888809d1fe4c56f3a765095de2ffa978cd8232ba45baf74d0220071f9ca88da49ca865aedf7f68cbd17252040f2d9285984585c40e354096df4101 020ab80fad8e873ea6450af1d90f3d8dd503b66cccae5861fe9b7292445bbc2b13","hex":"4730440220416ee7708cd97d6a888809d1fe4c56f3a765095de2ffa978cd8232ba45baf74d0220071f9ca88da49ca865aedf7f68cbd17252040f2d9285984585c40e354096df410121020ab80fad8e873ea6450af1d90f3d8dd503b66cccae5861fe9b7292445bbc2b13"},"sequence":4294967295},{"txid":"6781cab05091b9e8d2a890f926a96dde51a94ba3fd98fc91e54c6d8abb6b694a","vout":6,"scriptSig":{"asm":"3046022100b9a3078d1ee15f4e9f5202a1907e5087ceb3073c2404ed3c87d4bfd12dd7e474022100dcfa89d860f5ba6d74b3b817073c96c693cd1e4494daf082c1497456207e8a0b01 020ab80fad8e873ea6450af1d90f3d8dd503b66cccae5861fe9b7292445bbc2b13","hex":"493046022100b9a3078d1ee15f4e9f5202a1907e5087ceb3073c2404ed3c87d4bfd12dd7e474022100dcfa89d860f5ba6d74b3b817073c96c693cd1e4494daf082c1497456207e8a0b0121020ab80fad8e873ea6450af1d90f3d8dd503b66cccae5861fe9b7292445bbc2b13"},"sequence":4294967295}],"vout":[{"value":7.556e-05,"n":0,"scriptPubKey":{"asm":"OP_DUP OP_HASH160 39ccc048204e05347a96a1b29aac0678967e830f OP_EQUALVERIFY OP_CHECKSIG","hex":"76a91439ccc048204e05347a96a1b29aac0678967e830f88ac","reqSigs":1,"type":"pubkeyhash","addresses":["16GcoHqFaCKjZDyUDmKZuvKYEzfdhBRuBD"]}},{"value":0.03719142,"n":1,"scriptPubKey":{"asm":"OP_DUP OP_HASH160 b3f2fea1670d19b4e12dd575d82a49c1a35904fa OP_EQUALVERIFY OP_CHECKSIG","hex":"76a914b3f2fea1670d19b4e12dd575d82a49c1a35904fa88ac","reqSigs":1,"type":"pubkeyhash","addresses":["1HQV3uK7n7o4Y41Qt3sjHaeLZfB9tp7JUM"]}}],"blockhash":"0000000000000000031d1a8126295bd342a4948890f0411e541910aabc8437b5","confirmations":1,"time":1438888798,"blocktime":1438888798}')
    //     var transactionSignature_vin_detail_n = bulkchain.rawTransactionToTransactionSignature(rawtransaction)
    //     .then((transactionsignature) => transactionsignature.vin_detail[0].n );
    //     return expect(transactionSignature_vin_detail_n).to.eventually.equal(91);
    // });
    //
    // test('rawTransactionToTransactionSignature (magic - input details not empty - length )', () =>  {
    //     let rawtransaction = JSON.parse('{"hex":"0100000003b01432db0b3e6a48ea46a7309348ae1ec9e7ddec4d806595233baca4ffded4255b0000006b483045022100f176844ba296ca4a2a2383d400fa1ce4f5269528be809efb605682978faaee3d02207f868790bc52255ac0852b82347fcd8a1965488ef7b8f8514f9b485e3d4d63be0121020ab80fad8e873ea6450af1d90f3d8dd503b66cccae5861fe9b7292445bbc2b13ffffffffc572eda0356de9ac7cea8ac260b8f2e2097a9259f996bf569c9b73b9899d8080030000006a4730440220416ee7708cd97d6a888809d1fe4c56f3a765095de2ffa978cd8232ba45baf74d0220071f9ca88da49ca865aedf7f68cbd17252040f2d9285984585c40e354096df410121020ab80fad8e873ea6450af1d90f3d8dd503b66cccae5861fe9b7292445bbc2b13ffffffff4a696bbb8a6d4ce591fc98fda34ba951de6da926f990a8d2e8b99150b0ca8167060000006c493046022100b9a3078d1ee15f4e9f5202a1907e5087ceb3073c2404ed3c87d4bfd12dd7e474022100dcfa89d860f5ba6d74b3b817073c96c693cd1e4494daf082c1497456207e8a0b0121020ab80fad8e873ea6450af1d90f3d8dd503b66cccae5861fe9b7292445bbc2b13ffffffff02841d0000000000001976a91439ccc048204e05347a96a1b29aac0678967e830f88ace6bf3800000000001976a914b3f2fea1670d19b4e12dd575d82a49c1a35904fa88ac00000000","txid":"ed9f0b40ff4cbde454ebb1664fc4d33285525883618e17ea4f6b1406ff420258","version":1,"locktime":0,"vin":[{"txid":"25d4deffa4ac3b239565804decdde7c91eae489330a746ea486a3e0bdb3214b0","vout":91,"scriptSig":{"asm":"3045022100f176844ba296ca4a2a2383d400fa1ce4f5269528be809efb605682978faaee3d02207f868790bc52255ac0852b82347fcd8a1965488ef7b8f8514f9b485e3d4d63be01 020ab80fad8e873ea6450af1d90f3d8dd503b66cccae5861fe9b7292445bbc2b13","hex":"483045022100f176844ba296ca4a2a2383d400fa1ce4f5269528be809efb605682978faaee3d02207f868790bc52255ac0852b82347fcd8a1965488ef7b8f8514f9b485e3d4d63be0121020ab80fad8e873ea6450af1d90f3d8dd503b66cccae5861fe9b7292445bbc2b13"},"sequence":4294967295},{"txid":"80809d89b9739b9c56bf96f959927a09e2f2b860c28aea7cace96d35a0ed72c5","vout":3,"scriptSig":{"asm":"30440220416ee7708cd97d6a888809d1fe4c56f3a765095de2ffa978cd8232ba45baf74d0220071f9ca88da49ca865aedf7f68cbd17252040f2d9285984585c40e354096df4101 020ab80fad8e873ea6450af1d90f3d8dd503b66cccae5861fe9b7292445bbc2b13","hex":"4730440220416ee7708cd97d6a888809d1fe4c56f3a765095de2ffa978cd8232ba45baf74d0220071f9ca88da49ca865aedf7f68cbd17252040f2d9285984585c40e354096df410121020ab80fad8e873ea6450af1d90f3d8dd503b66cccae5861fe9b7292445bbc2b13"},"sequence":4294967295},{"txid":"6781cab05091b9e8d2a890f926a96dde51a94ba3fd98fc91e54c6d8abb6b694a","vout":6,"scriptSig":{"asm":"3046022100b9a3078d1ee15f4e9f5202a1907e5087ceb3073c2404ed3c87d4bfd12dd7e474022100dcfa89d860f5ba6d74b3b817073c96c693cd1e4494daf082c1497456207e8a0b01 020ab80fad8e873ea6450af1d90f3d8dd503b66cccae5861fe9b7292445bbc2b13","hex":"493046022100b9a3078d1ee15f4e9f5202a1907e5087ceb3073c2404ed3c87d4bfd12dd7e474022100dcfa89d860f5ba6d74b3b817073c96c693cd1e4494daf082c1497456207e8a0b0121020ab80fad8e873ea6450af1d90f3d8dd503b66cccae5861fe9b7292445bbc2b13"},"sequence":4294967295}],"vout":[{"value":7.556e-05,"n":0,"scriptPubKey":{"asm":"OP_DUP OP_HASH160 39ccc048204e05347a96a1b29aac0678967e830f OP_EQUALVERIFY OP_CHECKSIG","hex":"76a91439ccc048204e05347a96a1b29aac0678967e830f88ac","reqSigs":1,"type":"pubkeyhash","addresses":["16GcoHqFaCKjZDyUDmKZuvKYEzfdhBRuBD"]}},{"value":0.03719142,"n":1,"scriptPubKey":{"asm":"OP_DUP OP_HASH160 b3f2fea1670d19b4e12dd575d82a49c1a35904fa OP_EQUALVERIFY OP_CHECKSIG","hex":"76a914b3f2fea1670d19b4e12dd575d82a49c1a35904fa88ac","reqSigs":1,"type":"pubkeyhash","addresses":["1HQV3uK7n7o4Y41Qt3sjHaeLZfB9tp7JUM"]}}],"blockhash":"0000000000000000031d1a8126295bd342a4948890f0411e541910aabc8437b5","confirmations":1,"time":1438888798,"blocktime":1438888798}')
    //     var transactionSignatureArr_length = bulkchain.rawTransactionToTransactionSignature(rawtransaction)
    //         .then((transactionSignature) => transactionSignature.vin_detail.length)
    //     return expect(transactionSignatureArr_length).to.eventually.equal(3);
    // });
    //
    // test('dateRangeToTransactionSignature (time trial 1 block)', () =>  {
    //     this.timeout(1200000);
    //     let starttime = 1438825753; // 368590 Wed Aug  5 18:49:13 PDT 2015
    //     let endtime =   1438830991;  //368596 Wed Aug  5 20:16:32 PDT 2015
    //     var transactionSignatureGenerator = bulkchain.dateRangeToTransactionSignature( starttime, endtime)
    //     var i;
    //      for (i of transactionSignatureGenerator)
    //         i.then(function(transactionSignature) {
    //             console.log('***',i);
    //         })
    //     console.log(i);
         // Outputs '16'
        //     .then(function(signatureArr) {
        //         signatureArr.map(function(signaturePromise) {
        //             signaturePromise.then(function(signature) {
        //                 console.log(signature);
        //                 return signature
        //             })
        //         })
        //         return signatureArr[0]
        //     });
        // return expect(promiseSignatureArr_zero).to.eventually.not.equal(undefined);
   // });
})
