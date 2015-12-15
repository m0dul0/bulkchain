'use strict';

var config = require(__dirname + '/../config/options.js');
var winston = require('winston');
var Promise = require('bluebird'); // jshint ignore:line
var map = Promise.map;
var join = Promise.join;
var bitcoin = require('bitcoin-promise');

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
    dateRangeToBlockCount(starttime, endtime)
    .map((blockcount) => client.getBlockHash(blockcount), {concurrency: 1})
    .map((blockhash) => { 
        client.getBlock(blockhash)
        .then((blockheader) => {
            blockheader.tx.map((targettxid) => {
                client.getRawTransaction(targettxid, 1).then((targettransaction) => {
                    var sourcedetail = [];
                    targettransaction.vin.map((targetvin) => {
                        client.getRawTransaction(targetvin.txid, 1).then((sourceitem) => {
                            sourceitem.vout.map((voutitem) => {
                                if(voutitem.n === targetvin.vout) {
                                    sourcedetail.push({
                                        'txid': sourceitem.txid,
                                        'destroy_start': sourceitem.time,
                                        'inputdetail': voutitem
                                    })
                                }
                                if (sourcedetail.length === targettransaction.vin.length) {
                                    var transactionsignature = targettransaction;
                                    transactionsignature.sourcedetail = sourcedetail;
                                    output(JSON.stringify(transactionsignature));
                                }
                            })
                        })
                    }, {concurrency: 3})
                })
            }, {concurrency: 1})
        })
    }, {concurrency: 1})
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
