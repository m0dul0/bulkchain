'use strict';

var config = require(__dirname + '/../config/options.js');
var winston = require('winston');
var Promise = require('bluebird'); // jshint ignore:line
var map = Promise.map;
var join = Promise.join;
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

var txidToTransactionSignature = function* (txidArr) {
    yield* txidToRawTransaction(txidArr)
};
module.exports.txidToTransactionSignature = txidToTransactionSignature;

var dateRangeToTransactionSignature = function* (starttime, endtime) {
    for (let blockhash of dateRangeToBlockHash(starttime, endtime)) {
        for (let txid of blockhashToTxid(blockhash)) {
            yield* txidToTransactionSignature(txid);
        };
    }
};
module.exports.dateRangeToTransactionSignature = dateRangeToTransactionSignature;

var blockhashToTxid = function* (blockhash) {
    yield blockhash.then(function (blockhash) { 
        return client.getBlock(blockhash).then((blockheader) => blockheader.tx)
    })
};

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

var dateRangeToBlockHash = function* (starttime, endtime) {
    var blockCountHigh = timeToBlockCount(endtime).then((blockcount) => blockcount);
    var blockCount = timeToBlockCount(starttime).then((blockcount) => blockcount);
    while ( blockCount <= blockCountHigh) {
        var blockcount = Promise.resolve(blockCount);
        yield blockcount.then(function(blockcount) {
            return client.getBlockHash(blockcount);
        })
        blockCount++;
    }
};
module.exports.dateRangeToBlockHash = dateRangeToBlockHash;

var slow_txidToInputItem = Promise.coroutine(function* (txid, vout) {
    if(txid) {
        var inputitem = yield client.getRawTransaction( txid, 1 )
            .then((rawtransaction) => {
                var input_item = rawtransaction.vout.filter((outputItem) => {
                    outputItem.destroy_start = rawtransaction.time;
                    outputItem.vin_txid = rawtransaction.txid;
                    return outputItem.n === vout;
            });
            return input_item;
        });
        return inputitem;
    }
});
var txidToInputItem = memoize(slow_txidToInputItem, config.memoize );
module.exports.txidToInputItem = txidToInputItem;

var txidToRawTransaction = function* (txid) {
    var txid = Promise.resolve(txid);
    yield Promise.map(txid, function(txid) {
        return client.getRawTransaction(txid, 1);
    }, {concurrency: 1} )
    .then((rawtransaction) => rawtransaction);
};

// var slow_rawTransactionToInputDetail = function* ( rawtransaction ) {
//     Promise.map(rawtransaction, function();
//     })
//     // if(rawtransaction.vin) {
//     //     yield Promise.map(rawtransaction.vin, function(vinitem) {
//     //         return vinitem;
//     //     }, {concurrency: 3})
//     //     .then(function(vinitem) {
//     //         return txidToInputItem(vinitem.txid, vinitem.vout)
//     //     })
//     // } else {
//     //     rawtransaction.then(function(rawtransaction) {
//     //         //console.log(rawtransaction);
//     //         return rawtransaction
//     //     });
//     // }
// };
//
//     //             var inputItem = txidToInputItem(vinitem.txid, vinitem.vout)
//     //             .then(function(inputdetail) {
//     //                 if (inputdetail !== null) {inputDetailArr.push(inputdetail)};
//     //                 if(inputDetailArr.length === rawtransaction.vin.length) {
//     //                     console.log(inputDetailArr.reduce(function(a, b) {return a.concat(b)}))
//     //                     return inputDetailArr.reduce(function(a, b) {return a.concat(b)})
//     //                 }
//     //             });
//     //         //     return inputItem;
//     //         // return vinitem;
//     //     }, {concurrency: 3});
//     // }
//
//     // }, {concurrency: 2});
//     // return inputDetailArr

// var rawTransactionToInputDetail = memoize(slow_rawTransactionToInputDetail, { async: true } );
// module.exports.rawTransactionToInputDetail = rawTransactionToInputDetail;

var rawTransactionToTransactionSignature = function* (rawtransaction) {
    var rawtransaction = Promise.resolve(rawtransaction);
    yield* rawTransactionToInputDetail(rawtransaction)
    // .then(function (inputdetail) {
    //     return inputdetail;
    //     // if ( inputdetail !== [] ) {
    //     //     rawtransaction.inputDetail = inputdetail;
    //     //     return rawtransaction;
    //     // } else {
    //     //     rawtransaction.inputDetail = 'empty';
    //     //     return rawtransaction;
    //     // }
    // })
};
module.exports.rawTransactionToTransactionSignature = rawTransactionToTransactionSignature;

