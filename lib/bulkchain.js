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

var dateRangeToTransactionSignature = function (starttime, endtime, output) {
    var scope = {};
    dateRangeToBlockCount(starttime, endtime)
    .map((blockcount) => client.getBlockHash(blockcount), {concurrency: 1})
    .map((blockhash) => client.getBlock(blockhash), {concurrency: 1})
    .then((blockheader) => blockheader[0].tx)
    .map((txid) => client.getRawTransaction(txid, 1), {concurrency: 1})
    .map((rawtransaction) => rawtransaction.vin    
        .map((vin) => {
            client.getRawTransaction(vin.txid, 1)
            .then((sourcetransaction) => output(sourcetransaction.vout))
            output({'txid': rawtransaction.txid, 'length':rawtransaction.vin.length, 'vin_txid': vin.txid, 'vout': vin.vout})
        }
        , {concurrency: 3})
    , {concurrency: 2})
};
module.exports.dateRangeToTransactionSignature = dateRangeToTransactionSignature;

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

var dateRangeToBlockCount = function (starttime, endtime, output) {
    var blockcountArr = []
    let blockcounthigh = timeToBlockCount(endtime).then((blockcount) => blockcount);
    let blockcountlow = timeToBlockCount(starttime).then((blockcount) => blockcount);
    return Promise.join(blockcountlow, blockcounthigh, function(blockcountlow, blockcounthigh) {
        for (let blockcount=blockcountlow; blockcount<blockcounthigh; blockcount++) {
            blockcountArr.push(blockcount);
        }
    })
    .then(function() {
        return(blockcountArr)
    })
}

var timeToBlockCount = Promise.coroutine(function* (targetTime) {
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
module.exports.timeToBlockCount = timeToBlockCount;