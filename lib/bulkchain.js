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
    console.log('***', {blockcountToTime: {blockcount: blockcount}});
    yield Promise.props(
        {
            blockcount: blockcount,
            time: (client.getBlockHash(blockcount)
                .then( blockhash => client.getBlock(blockhash))
                .then( blockheader => blockheader.time ))
        }
    )
    .then(function(result) {
        console.log({blockcountToTime: result})
        return result ;
    })
    .catch((err) => {
        logger.error(err);
    });
};
module.exports.blockCountToTime = blockCountToTime;

var slow_timeToBlockCount = function* (targetTime) {
    console.log('***', {slow_timeToBlockCount: {targetTime: targetTime}});
    yield Promise.props(
        {
            targetTime: targetTime,
            latestBlockCount: (client.getBlockCount()
                .then(blockcount => blockcount)
                ),
            latestBlockTime: (client.getBlockCount()
                .then(blockcount => client.getBlockHash(blockcount))
                .then(blockhash => client.getBlock(blockhash))
                .then(blockheader => blockheader.time)
                ),
            latestBlockCount: (client.getBlockCount()
                .then(blockcount => blockcount)
                ),
            latestBlockTime: (client.getBlockCount()
                .then(blockcount => client.getBlockHash(blockcount))
                .then(blockhash => client.getBlock(blockhash))
                .then(blockheader => blockheader.time)
                ),
            earliestBlockCount: 1,
            earliestBlockTime: (client.getBlockHash(1)
                .then(blockhash => client.getBlock(blockhash))
                .then(blockheader => blockheader.time)
                ),
            firstGuessBlockCount: (client.getBlockCount()
                .then(blockcount => (parseInt(blockcount / 2)) )
                ),
        }
    )
    .then(function(startingpoint) {
        console.log({startingpoint: startingpoint})
        if(startingpoint.targetTime < startingpoint.earliestBlockTime) {
            return startingpoint.earliestBlockCount
        }
        else {
            return startingpoint
        }
    })
    .catch((err) => {
        logger.error(err);
    });
};
var timeToBlockCount = memoize(slow_timeToBlockCount, config.memoize );
module.exports.timeToBlockCount = timeToBlockCount;


// var slow_timeToBlockCount = (targettime) => {
//     return (
//         client.getBlockCount()
//         .then((blockcount) => {
//             var lowblockcount = 0;
//             var highblockcount = blockcount;
//             return(bisect(lowblockcount, highblockcount, targettime));
//         })
//         .then((results) => {
//             return (results.midpoint < results.lowblockcount) ?
//                 results.lowblockcount:
//                 results.highblockcount;
//         })
//         .catch((err) => {
//             logger.error(err);
//         })
//     );
// };



// var dateRangeToBlockHeader = function dateRangeToBlockheader(starttime, endtime) {
//     for (let blockhashPromiseArrPromise of dateRangeToBlockHashPromise(starttime, endtime)) {
//         Promise.map(blockhashPromiseArrPromise)
//         .then(function(blockhashPromiseArr) {
//             return blockhashPromiseArr
//         })
//         .then(function(blockhashPromiseArr) {
//             console.log(blockhashPromiseArr);
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
//         console.log('**************************************');
//         txidToRawTransaction(txidArr);
//     })
// }
//
// var txidToRawTransaction = function (txidArr) {
//     txidArr.map(function(txid) {
//         console.log(txid);
//         client.getRawTransaction(txid, 1)
//         .then(function(rawtransaction) {
//             console.log(rawtransaction);
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
//         .then((searchparams) => {
//             return (searchparams.highblockcount - searchparams.lowblockcount) <= 1 ?
//                 searchparams:
//                 bisect(searchparams.lowblockcount, searchparams.highblockcount, searchparams.targettime);
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
//     console.log(rawtransaction);
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
// //     //     console.log(blockhashArr);
// //     //     yield blockhashArr;
// //     // })
// //     //         console.log(blockhash);
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
