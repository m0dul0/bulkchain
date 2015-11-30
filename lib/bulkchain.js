'use strict';

var config = require(__dirname + '/../config/options.js');
var winston = require('winston');
var Promise = require('bluebird'); // jshint ignore:line

var bitcoin = require('bitcoin-promise');
var memoize = require('memoizee');

var logger = new(winston.Logger) ({
    transports: [ new(winston.transports.File)({filename: './bulkchain.log'})],
    level: config.winston_log_level
});

var client = new bitcoin.Client({
    host: config.bitcoind_host,
    user: config.bitcoind_rpc_user,
    pass: config.bitcoind_rpc_pass,
    timeout: 120000
});

var blockCountToTime = function* (blockcount) {
    logger.debug({blockcountToTime: {blockcount: blockcount}});
    yield Promise.props(
        {
            blockcount: blockcount,
            time: (client.getBlockHash(blockcount)
                .then( blockhash => client.getBlock(blockhash))
                .then( blockheader => blockheader.time ))
        }
    )
    .then(function(result) {
        return result ;
    })
    .catch((err) => {
        logger.error(err);
    });
};

module.exports.blockCountToTime = blockCountToTime;

var slow_timeToBlockCount = Promise.coroutine(function* (targetTime) {
    var blockCountHigh = yield (client.getBlockCount().then((blockCount) => blockCount));
    var blockCountLow = 1;
    var blockCountGuess;
    var blockTimeGuess;
    do {
        blockCountGuess = blockCountLow + parseInt((blockCountHigh - blockCountLow) / 2);
        blockTimeGuess = yield (
            client.getBlockHash(blockCountGuess)
            .then((blockhash) => client.getBlock(blockhash))
            .then((blockheader) => blockheader.time)
            .catch((err) => {
                logger.error(err);
            })
        );
        if(blockCountHigh - blockCountLow < 2) {
            return (blockTimeGuess >= targetTime) ? blockCountLow: blockCountHigh;
        } else {
            (blockTimeGuess >= targetTime) ? blockCountHigh = blockCountGuess: blockCountLow = blockCountGuess;
        }
    }
    while (blockTimeGuess);
});
var timeToBlockCount = memoize(slow_timeToBlockCount, config.memoize );
module.exports.timeToBlockCount = timeToBlockCount;


var dateRangeToBlockHash = Promise.coroutine(function* (startTime, endTime) {
    // todo: this function would be better handled with Promise.join
    // http://bluebirdjs.com/docs/api/promise.join.html
    var blockCountHigh = yield timeToBlockCount(endTime).then((blockcount) => blockcount);
    var blockCountLow = yield timeToBlockCount(startTime).then((blockcount) => blockcount);
    var blockCount = blockCountLow;
    var blockHashArr = [];
    while ( blockCount <= blockCountHigh) {
        if ( blockCount === blockCountHigh ) {
            return blockHashArr;
        } else {
            blockHashArr.push(client.getBlockHash(blockCount).then((blockhash) => blockhash));
            blockCount++;
        }
    }
});
module.exports.dateRangeToBlockHash = dateRangeToBlockHash;

var slow_txidToOutput = Promise.coroutine(function* (txid) {
    var rawtransaction = yield client.getRawTransaction( txid, 1 )
        .then ((rawtransaction) => rawtransaction)
        .catch((err) => logger.error(err));
    return ({"destroy_starttime": rawtransaction.time, "vout": rawtransaction.vout});
});
var txidToOutput = memoize(slow_txidToOutput, config.memoize );
module.exports.txidToOutput = txidToOutput;

var slow_txidToInputItem = Promise.coroutine(function* (txid, vout) {
    // this function should probably use Promise.spread
    // http://bluebirdjs.com/docs/api/spread.html
    if(txid) {
        var inputitem = yield client.getRawTransaction( txid, 1 )
            .then((rawtransaction) => {
                var input_item = rawtransaction.vout.filter((outputItem) => {
                    outputItem.destroy_start = rawtransaction.time;
                    return outputItem.n === vout;
            });
            return input_item[0];
        });
        return inputitem;
    }
});
var txidToInputItem = memoize(slow_txidToInputItem, config.memoize );
module.exports.txidToInputItem = txidToInputItem;

var slow_rawTransactionToInputDetail = Promise.coroutine(function* ( rawtransaction ) {
    var inputDetailArr = [];
    var inputdetails = yield Promise.map(rawtransaction.vin, function(vinitem) {
        var inputItem = txidToInputItem(vinitem.txid, vinitem.vout)
        .then(function(inputdetail) {
            inputDetailArr.push(inputdetail);
            if(inputDetailArr.length === rawtransaction.vin.length) {
                return inputDetailArr;
            }
        });
        return inputItem;
    });
    return inputdetails[0];
});
var rawTransactionToInputDetail = memoize(slow_rawTransactionToInputDetail, { async: true } );
module.exports.rawTransactionToInputDetail = rawTransactionToInputDetail;

var rawTransactionToTransactionSignature = Promise.coroutine( function* (rawtransaction) {
    rawtransaction.inputDetail = yield rawTransactionToInputDetail(rawtransaction).then((inputdetail) => inputdetail);
    return rawtransaction;
});
module.exports.rawTransactionToTransactionSignature = rawTransactionToTransactionSignature;


// var blockhashPromiseArrToBlockHeader = function (blockhashPromiseArr) {
//     var txidArr = []
//     blockhashPromiseArr.map(function(blockhashPromise) {
//         blockhashPromise.then(function(blockhash) {
//             client.getBlock(blockhash)
//             .then(function(blockheader) {
//                 txidArr.push(blockheader.tx);
//             })
//         })
//     }, {concurrency: 1})
//     .then(function() {
//         logger.debug('**************************************');
//         txidToRawTransaction(txidArr);
//     })
// }
//
// var txidToRawTransaction = function (txidArr) {
//     txidArr.map(function(txid) {
//         logger.debug(txid);
//         client.getRawTransaction(txid, 1)
//         .then(function(rawtransaction) {
//             logger.debug(rawtransaction);
//         })
//     }, {concurrency: 1})
// }
// module.exports.txidToRawTransaction = txidToRawTransaction;
//
//

//
// var rawTransactionToTransactionSignature = (rawtransaction) => {
//     return rawtransaction[0];
//     //return (rawtransaction.vin[0].txid)
//     //?
//     // rawTransactionToInputDetail(rawtransaction):
//     // //     .then((vin_detail) => {
//     // //          rawtransaction.vin_detail = vin_detail;
//     // //          return rawtransaction;
//     // //     }):
//     // rawtransaction;
// };
// module.exports.rawTransactionToTransactionSignature = rawTransactionToTransactionSignature;
//
// //
// //     // for (var i = 1; ; i++) {
// //     //     // Every time we 'yield', this function's execution pauses until
// //     //      // the generator is restarted by a call to 'next' (see below).
// //     //      yield i * i;
// //     //      if (i === 10){
// //     //          return
// //     //      }
// //     //  }
// // //    return dateRangeToBlockHash(starttime, endtime)
// //     // .then(function * (blockhashArr) {
// //     //     logger.debug(blockhashArr);
// //     //     yield blockhashArr;
// //     // })
// //     //         logger.debug(blockhash);
// //     //         yield (blockhash);
// //     //     //     yield blockhash;
// //     //     //     blockhash.then(function(blockhash) {
// //     //     //         client.getBlock(blockhash)
// //     //     //         .then(function(blockheader) {
// //     //     //             blockheader.tx.map(function(txid) {
// //     //     //                 client.getRawTransaction(txid, 1)
// //     //     //                 .then(function(rawtransaction) {
// //     //     //                     rawTransactionToTransactionSignature(rawtransaction)
// //     //     //                     .then(function(transactionsignature) {
// //     //     //                         logger.debug(transactionsignature);
// //     //     //                 //transactionSignatureArr.push(transactionsignature);
// //     //     //                         //return ransactionsignature;
// //     //     //                     });
// //     //     //                 });
// //     //     //             });
// //     //     //         });
// //     //     //     });
// //     //     });
// //     //});
// //     //return blockhashArrPromise;
// // };
// // module.exports.dateRangeToTransactionSignature = dateRangeToTransactionSignature;
