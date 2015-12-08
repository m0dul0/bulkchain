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

var txidToTransactionSignature = function* (txidArr) {
    var txid = Promise.resolve(txidArr);
    yield Promise.map(txid, function(txid) {
        return client.getRawTransaction(txid, 1)
        .then(function (rawtransaction) {
            var transactionsignature = rawtransaction;
            if (rawtransaction.vin) {
                var inputDetail = rawTransactionToInputDetail(rawtransaction.vin).then((inputDetail) => inputDetail);
                transactionsignature.vin_detail = inputDetail.reduce(function(a, b) {return a.concat(b)});
                return transactionsignature;
            } else {
                return transactionsignature;
            }
        })
    }, {concurrency: 1} );
};
module.exports.txidToTransactionSignature = txidToTransactionSignature;

var rawTransactionToInputDetail = function ( rawtransaction_vin ) {
    return Promise.map(rawtransaction_vin, function(vinItem) {
        if(vinItem.txid) {
            return txidToInputItem(vinItem.txid, vinItem.vout)
            .then((inputdetail) => inputdetail);
        }
    }, {concurrency: 3})
};

var txidToInputItem = function (txid, vout) {
    return client.getRawTransaction(txid, 1)
    .then(function(rawtransaction) {
        return rawtransaction.vout.filter((outputItem) => {
            outputItem.destroy_start = rawtransaction.time;
            outputItem.vin_txid = rawtransaction.txid;
            return outputItem.n === vout;
        })
    })
};
module.exports.txidToInputItem = txidToInputItem;

var dateRangeToTransactionSignature = function* (starttime, endtime) {
    for (let blockhash of dateRangeToBlockHash(starttime, endtime)) {
        for (let txid of blockhashToTxid(blockhash)) {
            yield* txidToTransactionSignature(txid);
        };
    }
};
module.exports.dateRangeToTransactionSignature = dateRangeToTransactionSignature;

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

var blockhashToTxid = function* (blockhash) {
    yield blockhash.then(function (blockhash) {
        return client.getBlock(blockhash).then((blockheader) => blockheader.tx)
    })
};

var txidToRawTransaction = function* (txid) {
    var txid = Promise.resolve(txid);
    yield Promise.map(txid, function(txid) {
        return client.getRawTransaction(txid, 1);
    }, {concurrency: 1} )
    .then((rawtransaction) => rawtransaction);
};