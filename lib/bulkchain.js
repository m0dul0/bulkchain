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

var dateRangeToBlockHash = ( startdate, enddate ) => {
    var startblock = dateToBlockCount(startdate);
    var endblock = dateToBlockCount(enddate);
    return (Promise.all([startblock, endblock])
        .then((blockrange) => {
            return Array.apply(null, new Array((blockrange[1] - blockrange[0]))).map((_, i) => {
                var blockhash = client.getBlockHash(i + blockrange[0]);
                return blockhash;
            });
        })
        .catch((err) => {
            logger.error(err);
        })
    );
};
module.exports.dateRangeToBlockHash = dateRangeToBlockHash;

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

var dateRangeToTransactionSignature = (startdate, enddate) => {
    dateRangeToBlockHash(startdate, enddate)
    .then((blockhashArr) => {
        var blockheaderpromises = blockhashArr.map((blockhash) => {
            client.getBlock(blockhash)
            .then((blockheader) => {
                return blockheader;
            });
        });
        return Promise.all(blockheaderpromises)
        .then((blockheaders) => {
            return blockheaders;
        });
    });

    // var q_rawTransactionToTransactionSignature = async.queue(function (task) {
    //     logger.debug({functionname:'q_rawTransactionToTransactionSignature', blocks_in_queue: q_blockHashToTxid.length(), txid_in_queue: q_txidToRawTransaction.length(), rawtransaction_in_queue: q_rawTransactionToTransactionSignature.length()});
    //     rawTransactionToTransactionSignature(task.rawtransaction, function (transactionSignature) {
    //         if(transactionSignature) {
    //             transactionSignatureArr.push(transactionSignature);
    //         }
    //         else {
    //             q_rawTransactionToTransactionSignature.push({rawtransaction: task.rawtransaction}, function () {
    //             });
    //         }
    //      });
    // }, 1);
    //
    // var q_txidToRawTransaction = async.queue(function (task, callback) {
    //     if(q_rawTransactionToTransactionSignature.length() > 1) {
    //         q_txidToRawTransaction.pause();
    //     }
    //     logger.silly({
    //         functionname: 'q_txidToRawTransaction',
    //         txid: task.txid,
    //         blocks_in_queue: q_blockHashToTxid.length(),
    //         txid_in_queue: q_txidToRawTransaction.length(),
    //         rawtransaction_in_queue: q_rawTransactionToTransactionSignature.length()
    //     });
    //     txidToRawTransaction(task.txid, function (err, rawtransaction) {
    //         if(rawtransaction) {
    //             q_rawTransactionToTransactionSignature.push({rawtransaction: rawtransaction});
    //         }
    //         else {
    //             q_txidToRawTransaction.unshift({txid: task.txid}, function () {});
    //         }
    //         callback();
    //     });
    // }, 1);
    //
    // var q_blockHashToTxid = async.queue(function (task, callback) {
    //     if(q_txidToRawTransaction.length() > 0) {
    //         q_blockHashToTxid.pause();
    //     }
    //     logger.silly({functionname: 'q_blockHashToTxid', blockhash: task.blockhash});
    //     blockHashToTxid(task.blockhash, function cb_blockHashToTxid(err, txidArr) {
    //         if(txidArr) {
    //             async.map(txidArr, function(txid) {
    //                 logger.silly({functionname:'cb_blockHashToTxid', txid: txid});
    //                 q_txidToRawTransaction.push({txid: txid});
    //             });
    //         }
    //         else {
    //             q_blockHashToTxid.unshift({blockhash: task.blockhash}, function () {});
    //         }
    //         callback();
    //     });
    // }, 1 );
    //
    // q_txidToRawTransaction.drain = function() {
    //     blockHashToTxid.clear();
    //     txidToOutputArr.clear();
    //     blockCountToBlockHash.clear();
    //     blockCountToTime.clear();
    //     rawTransactionToInputDetail.clear();
    //     q_blockHashToTxid.resume();
    // };

    // q_rawTransactionToTransactionSignature.drain = function() {
    //     logger.silly({functionname:'q_rawTransactionToTransactionSignature.drain', blocks_in_queue: q_blockHashToTxid.length(), txid_in_queue: q_txidToRawTransaction.length(), rawtransaction_in_queue: q_rawTransactionToTransactionSignature.length()})
    //     if( ( q_blockHashToTxid.length() + q_txidToRawTransaction.length() + q_rawTransactionToTransactionSignature.length()) === 0) {
    //         logger.silly(transactionSignatureArr)
    //         callback(transactionSignatureArr);
    //     }
    //     else {
    //         q_txidToRawTransaction.resume()
    //     }
    // };
};
module.exports.dateRangeToTransactionSignature = dateRangeToTransactionSignature;
