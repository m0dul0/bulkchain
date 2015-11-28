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
    var blockCountLow  = 1;
    var blockCountGuess;
    var blockTimeGuess;
    do {
        blockCountGuess = blockCountLow + parseInt((blockCountHigh - blockCountLow) / 2);
        blockTimeGuess = yield (
            client.getBlockHash(blockCountGuess)
            .then((blockhash) => client.getBlock(blockhash))
            .then((blockheader) => blockheader.time)
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

// var dateRangeToBlockHeader = function dateRangeToBlockheader(starttime, endtime) {
//     for (let blockhashPromiseArrPromise of dateRangeToBlockHashPromise(starttime, endtime)) {
//         Promise.map(blockhashPromiseArrPromise)
//         .then(function(blockhashPromiseArr) {
//             return blockhashPromiseArr
//         })
//         .then(function(blockhashPromiseArr) {
//             logger.debug(blockhashPromiseArr);
//         })
//     }
// };
// module.exports.dateRangeToBlockHeader = dateRangeToBlockHeader;
//


//
// var dateRangeToBlockRange = function ( startdate, enddate ) {
//     var startblock = timeToBlockCount(startdate);
//     var endblock = timeToBlockCount(enddate);
//     return (Promise.all([startblock, endblock]));
// };
// module.exports.dateRangeToBlockRange = dateRangeToBlockRange;
//
// function* blockRangeToBlockhash(blockRangePromise) {
//     yield blockRangePromise.then(function (blockrange) {
//         return(
//             Array.apply(null, new Array((blockrange[1] - blockrange[0]))).map((_, i) => {
//                 return (
//                     client.getBlockHash(i + blockrange[0])
//                     .then(function(blockhash) {
//                         return blockhash;
//                     })
//                 )
//             })
//         )
//     })
// }
// module.exports.blockRangeToBlockhash = blockRangeToBlockhash;
//
// var dateRangeToBlockHashPromise = function* dateRangeToBlockHashPromise(starttime, endtime) {
//     var blockrange = dateRangeToBlockRange(starttime, endtime)
//     yield* blockRangeToBlockhash(blockrange);
// };
// module.exports.dateRangeToBlockHashPromise = dateRangeToBlockHashPromise;
//
// var blockhashPromiseArrToBlockhash = function blockhashPromiseArrToBlockhash(blockhashPromiseArr) {
//     for (let blockhashPromise of blockhashPromiseArr) {
//         blockhashPromise.then(function (blockhash) {
//         })
//     }
// }
//
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
// var dateRangeToBlockHash = function* dateRangeToBlockHash(starttime, endtime) {
//     for (let blockhashPromiseArrPromise of dateRangeToBlockHashPromise(starttime, endtime)) {
//         blockhashPromiseArrPromise
//         .then(function(blockhashPromiseArr) {
//             blockhashPromiseArrToBlockhash(blockhashPromiseArr)
//         })
//     }
// };
// module.exports.dateRangeToBlockHash = dateRangeToBlockHash;
//

//
// var bisect = (lowblockcount, highblockcount, targettime) => {
//     var midpoint = (parseInt(( highblockcount - lowblockcount ) / 2) + lowblockcount);
//     return(
//         blockCountToTime(midpoint)
//         .then((time) => {
//             return time >= targettime ?
//                 {lowblockcount: lowblockcount, highblockcount: midpoint, targettime: targettime}:
//                 {lowblockcount: midpoint, highblockcount: highblockcount, targettime: targettime};
//         })
//         .then((searchguess) => {
//             return (searchguess.highblockcount - searchguess.lowblockcount) <= 1 ?
//                 searchguess:
//                 bisect(searchguess.lowblockcount, searchguess.highblockcount, searchguess.targettime);
//         })
//         .catch((err) => {
//             logger.error(err);
//         })
//     );
// };
//
// // var slow_txidToOutputArr = (txid) => {
// //     return (
// //         client.getRawTransaction( txid, 1 )
// //         .then ((rawtransaction) => {
// //             return (
// //                 {destroy_start: rawtransaction.time, vout: rawtransaction.vout}
// //             );
// //         })
// //         .catch((err) => { logger.error(err); })
// //     );
// // };
// // var txidToOutputArr = memoize(slow_txidToOutputArr, config.memoize );
// // module.exports.txidToOutputArr = txidToOutputArr;
//
// var slow_txidToInputItem = ( txid, vout ) => {
//     if(txid) {
//         return client.getRawTransaction( txid, 1 )
//         .then((rawtransaction) => {
//             var promises = rawtransaction.vout.filter((outputItem) => {
//                 outputItem.destroy_start = rawtransaction.time;
//                 return outputItem.n === vout;
//             });
//             return Promise.all(promises).then((outputItems) => outputItems[0]);
//         });
//     }
// };
// var txidToInputItem = memoize(slow_txidToInputItem, config.memoize );
// module.exports.txidToInputItem = txidToInputItem;
//
// var slow_rawTransactionToInputDetail = ( rawtransaction ) => {
//     logger.debug(rawtransaction);
//     // var txid_inputs = rawtransaction.vin.map((vin) => {
//     //     return txidToInputItem(vin.txid, vin.vout);
//     // });
//     // return Promise.all(txid_inputs);
// };
// var rawTransactionToInputDetail = memoize(slow_rawTransactionToInputDetail, { async: true } );
// module.exports.rawTransactionToInputDetail = rawTransactionToInputDetail;
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
