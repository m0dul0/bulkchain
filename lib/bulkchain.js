'use strict';

var config = require(__dirname + '/../config/options.js');
var winston = require('winston');
var Promise = require('bluebird'); // jshint ignore:line
var PromiseQueue = require('promiseq')
var map = Promise.map;
var join = Promise.join;
var bitcoin = require('bitcoin-promise');
var retry = require('bluebird-retry');

var logger = new(winston.Logger) ({
    transports: [ new(winston.transports.File)({filename: './bulkchain.log'})],
    level: config.winston_log_level
});

var client = new bitcoin.Client({
    host: config.bitcoind_host,
    user: config.bitcoind_rpc_user,
    pass: config.bitcoind_rpc_pass,
    timeout: 3600000
});

var rawTransactionToInputDetailItem = function (rawtransaction, vin_vout) {
    return rawtransaction.vout.map(function(voutitem) {
        if(voutitem.n === vin_vout) {
            return voutitem;
        }
    })
}

var rawTransactionToTransactionSignature = function (rawtransaction, output) {
    if( rawtransaction.vin[0].txid === undefined ) {
        output(JSON.stringify(rawtransaction));
    }
    else {
        var transactionsignature = rawtransaction;
        var inputDetail = Promise.all(rawtransaction.vin.map(function(vinitem) {
            return client.getRawTransaction(vinitem.txid, 1)
            .then(function (sourcetransaction) {
                return ({
                    destroy_start: sourcetransaction.time,
                    txid: sourcetransaction.txid,
                    sourcedetail: sourcetransaction.vout.map(function(voutitem) {
                        if(voutitem.n === vinitem.vout) {
                            return(voutitem);
                        }
                    }, {concurrency: 1})
                    .filter(function(voutitem) {
                        return voutitem !== undefined
                    })
                })
            })
        }, {concurrency: 1} ))
        return Promise.join(transactionsignature, inputDetail, function(transactionsignature, inputDetail) {
            transactionsignature.inputdetail = inputDetail;
            return(transactionsignature);
        })
        .then(function(transactionsignature) {
            output(JSON.stringify(transactionsignature));
        })
    }
}

var dateRangeToTransactionSignature = function (starttime, endtime, output) {
    var q_txidToRawTransaction = new PromiseQueue();
    dateRangeToBlockCount(starttime, endtime)
    .then((blockcountArr) => blockcountArr)
    .map((blockcount) => client.getBlockHash(blockcount), {concurrency: 1})
    .map((blockhash) => client.getBlock(blockhash).then((blockheader) => {
        blockheader.tx.map((targettxid) => {
            q_txidToRawTransaction.push(function() {
                return client.getRawTransaction(targettxid, 1)
            })
            .then(function(rawtransaction){
                return rawTransactionToTransactionSignature(rawtransaction, output);
            })
        }, {concurrency: 1})
    }), {concurrency: 1})
    .catch((err) => {
        logger.error(err);
    })
};
module.exports.dateRangeToTransactionSignature = dateRangeToTransactionSignature;

var dateRangeToBlockCount = function (starttime, endtime, output) {
    var blockcountArr = []
    let blockcounthigh = timeToBlockCount(endtime, output).then((blockcount) => {
        return blockcount
    });
    let blockcountlow = timeToBlockCount(starttime, output).then((blockcount) => blockcount);
    return Promise.join(blockcountlow, blockcounthigh, function(blockcountlow, blockcounthigh) {
        for (let blockcount=blockcountlow; blockcount<blockcounthigh; blockcount++) {
            blockcountArr.push(blockcount)
        }
    })
    .then(function() {
        return(blockcountArr)
    })
    .catch((err) => {
        logger.error(err);
    })
}

var timeToBlockCount = Promise.coroutine(function* (targetTime) {
    let blockCountHigh = yield (client.getBlockCount().then((blockcount) => blockcount ));
    let blockCountLow = 1;
    var blockCountGuess, blockTimeGuess;
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
module.exports.timeToBlockCount = timeToBlockCount;
