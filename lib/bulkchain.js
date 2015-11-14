'use strict';

var config = require(__dirname + '/../config/options.js');
var bitcoin = require('bitcoin-promise');
var winston = require('winston');
var logger = new(winston.Logger) ({
    transports: [ new(winston.transports.File)({filename: './bulkchain.log'})],
    level: config.winston_log_level
});

var memoize = require('memoizee');

var client = new bitcoin.Client({
    host: config.bitcoind_host,
    user: config.bitcoind_rpc_user,
    pass: config.bitcoind_rpc_pass,
    timeout: 120000
});

var slow_dateToBlockCount = (targettime) => {
    return (
        client.getBlockCount()
        .then((blockcount) => {
            var lowblockcount = 0;
            var highblockcount = blockcount;
            return(bisect(lowblockcount, highblockcount, targettime));
        })
        .then((results) => {
            return (results.midpoint < results.lowblockcount) ?
                results.lowblockcount:
                results.highblockcount;
        })
        .catch((err) => {
            logger.error(err);
        })
    );
};

var dateToBlockCount = memoize(slow_dateToBlockCount, config.memoize );
module.exports.dateToBlockCount = dateToBlockCount;

var dateRangeToBlockRange = function ( startdate, enddate ) {
    var startblock = dateToBlockCount(startdate);
    var endblock = dateToBlockCount(enddate);
    return (Promise.all([startblock, endblock]));
};
module.exports.dateRangeToBlockRange = dateRangeToBlockRange;

function* blockRangeToBlockhash(blockRangePromise) {
    yield blockRangePromise.then(function (blockrange) {
        return(
            Array.apply(null, new Array((blockrange[1] - blockrange[0]))).map((_, i) => {
                return (
                    client.getBlockHash(i + blockrange[0])
                    .then(function(blockhash) {
                        return blockhash;
                    })
                )
            })
        ) 
    })
}
module.exports.blockRangeToBlockhash = blockRangeToBlockhash;

function* dateRangeToTransactionSignatureGenerator(starttime, endtime) {
    var blockrange = dateRangeToBlockRange(starttime, endtime)
    yield* blockRangeToBlockhash(blockrange);
};
module.exports.dateRangeToTransactionSignatureGenerator = dateRangeToTransactionSignatureGenerator;

var blockCountToTime = (blockcount) => {
    return(
        client.getBlockHash(blockcount)
        .then( (blockhash) => client.getBlock(blockhash))
        .then( (blockheader) => blockheader.time )
        .catch((err) => logger.error(err) )
    );
};
module.exports.blockCountToTime = blockCountToTime;

var bisect = (lowblockcount, highblockcount, targettime) => {
    var midpoint = (parseInt(( highblockcount - lowblockcount ) / 2) + lowblockcount);
    return(
        blockCountToTime(midpoint)
        .then((time) => {
            return time >= targettime ?
                {lowblockcount: lowblockcount, highblockcount: midpoint, targettime: targettime}:
                {lowblockcount: midpoint, highblockcount: highblockcount, targettime: targettime};
        })
        .then((searchparams) => {
            return (searchparams.highblockcount - searchparams.lowblockcount) <= 1 ?
                searchparams:
                bisect(searchparams.lowblockcount, searchparams.highblockcount, searchparams.targettime);
        })
        .catch((err) => {
            logger.error(err);
        })
    );
};

var slow_txidToOutputArr = (txid) => {
    return (
        client.getRawTransaction( txid, 1 )
        .then ((rawtransaction) => {
            return (
                {destroy_start: rawtransaction.time, vout: rawtransaction.vout}
            );
        })
        .catch((err) => { logger.error(err); })
    );
};
var txidToOutputArr = memoize(slow_txidToOutputArr, config.memoize );
module.exports.txidToOutputArr = txidToOutputArr;

var slow_txidToInputItem = ( txid, vout ) => {
    if(txid) {
        return client.getRawTransaction( txid, 1 )
        .then((rawtransaction) => {
            var promises = rawtransaction.vout.filter((outputItem) => {
                outputItem.destroy_start = rawtransaction.time;
                return outputItem.n === vout;
            });
            return Promise.all(promises).then((outputItems) => outputItems[0]);
        });
    }
};
var txidToInputItem = memoize(slow_txidToInputItem, config.memoize );
module.exports.txidToInputItem = txidToInputItem;

var slow_rawTransactionToInputDetail = ( rawtransaction ) => {
    var txid_inputs = rawtransaction.vin.map((vin) => {
        return txidToInputItem(vin.txid, vin.vout);
    });
    return Promise.all(txid_inputs);
};
var rawTransactionToInputDetail = memoize(slow_rawTransactionToInputDetail, { async: true } );
module.exports.rawTransactionToInputDetail = rawTransactionToInputDetail;

var rawTransactionToTransactionSignature = (rawtransaction) => {
    return (rawtransaction.vin[0].txid) ?
        rawTransactionToInputDetail(rawtransaction)
        .then((vin_detail) => {
             rawtransaction.vin_detail = vin_detail;
             return rawtransaction;
        }):
        rawtransaction;
};
module.exports.rawTransactionToTransactionSignature = rawTransactionToTransactionSignature;
//
// var dateRangeToTransactionSignature = function* (starttime, endtime) {
//     bulkchain.dateRangeToBlockHash(starttime, endtime)
//     .then((blockhashPromiseArr) => blockhashPromiseArr.map(function (blockhashPromise) {
//         blockhashPromise.then((blockhash) => log(blockhash));
//     }))
//
//     // for (var i = 1; ; i++) {
//     //     // Every time we 'yield', this function's execution pauses until
//     //      // the generator is restarted by a call to 'next' (see below).
//     //      yield i * i;
//     //      if (i === 10){
//     //          return
//     //      }
//     //  }
// //    return dateRangeToBlockHash(starttime, endtime)
//     // .then(function * (blockhashArr) {
//     //     console.log(blockhashArr);
//     //     yield blockhashArr;
//     // })
//     //         console.log(blockhash);
//     //         yield (blockhash);
//     //     //     yield blockhash;
//     //     //     blockhash.then(function(blockhash) {
//     //     //         client.getBlock(blockhash)
//     //     //         .then(function(blockheader) {
//     //     //             blockheader.tx.map(function(txid) {
//     //     //                 client.getRawTransaction(txid, 1)
//     //     //                 .then(function(rawtransaction) {
//     //     //                     rawTransactionToTransactionSignature(rawtransaction)
//     //     //                     .then(function(transactionsignature) {
//     //     //                         logger.debug(transactionsignature);
//     //     //                 //transactionSignatureArr.push(transactionsignature);
//     //     //                         //return ransactionsignature;
//     //     //                     });
//     //     //                 });
//     //     //             });
//     //     //         });
//     //     //     });
//     //     });
//     //});
//     //return blockhashArrPromise;
// };
// module.exports.dateRangeToTransactionSignature = dateRangeToTransactionSignature;
