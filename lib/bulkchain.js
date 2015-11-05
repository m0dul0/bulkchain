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

var blockCountToTime = function (blockcount) {
    return(
        client.getBlockHash(blockcount)
        .then( function(blockhash) {
            return client.getBlock(blockhash);
        })
        .then( function(blockheader) {
            return blockheader.time;
        })
        .catch(function(err) {
            logger.error(err);
        })
    );
};

module.exports.blockCountToTime = blockCountToTime;

var bisect = function (lowblockcount, highblockcount, targettime) {
    var midpoint = (parseInt(( highblockcount - lowblockcount ) / 2) + lowblockcount);
    return(
        blockCountToTime(midpoint)
        .then(function(time){
            return time >= targettime ? 
                {lowblockcount: lowblockcount, highblockcount: midpoint, targettime: targettime}:
                {lowblockcount: midpoint, highblockcount: highblockcount, targettime: targettime};
        })
        .then(function(searchparams) {
            return (searchparams.highblockcount - searchparams.lowblockcount) <= 1 ?
                searchparams:
                bisect(searchparams.lowblockcount, searchparams.highblockcount, searchparams.targettime);
        })
        .catch(function(err) {
            logger.error(err);
        })
    );
};

var slow_dateToBlockCount = function (targettime) {
    return (
        client.getBlockCount()
        .then(function (blockcount) {
            var lowblockcount = 0;
            var highblockcount = blockcount;
            return(bisect(lowblockcount, highblockcount, targettime));
        })
        .then(function(results) {
            return (results.midpoint < results.lowblockcount) ?
                results.lowblockcount:
                results.highblockcount;
        })
        .catch(function(err) {
            logger.error(err);
        })
    );
};

var dateToBlockCount = memoize(slow_dateToBlockCount, config.memoize );
module.exports.dateToBlockCount = dateToBlockCount;

var dateRangeToBlockHash = function ( startdate, enddate ) {
    var startblock = dateToBlockCount(startdate)
        .then(function(startblock) {
            return startblock;
        });
    var endblock = dateToBlockCount(enddate)
        .then(function(endblock) {
            return endblock;
        });
    return (Promise.all([startblock, endblock])
        .then(function( blockrange ) {
            return Array.apply(null, new Array((blockrange[1] - blockrange[0]))).map(function (_, i) {
                var blockhash = client.getBlockHash(i + blockrange[0]);
                return blockhash;
            });
        })
        .catch(function(err) {
            logger.error(err);
        })
    );
};
module.exports.dateRangeToBlockHash = dateRangeToBlockHash;

var slow_txidToOutputArr = function (txid) {
    return (
        client.getRawTransaction( txid, 1 )
        .then (function(rawtransaction) {
            return ({destroy_start: rawtransaction.time, vout: rawtransaction.vout});
        })
        .catch(function(err) {
            logger.error(err);
        })
    );
};

var txidToOutputArr = memoize(slow_txidToOutputArr, config.memoize );

module.exports.txidToOutputArr = txidToOutputArr;

var slow_txidToInputItem = function ( txid, vout ) {
    if(txid) {
        return client.getRawTransaction( txid, 1 )
        .then(function(rawtransaction) {
            var promises = rawtransaction.vout.filter(function(outputItem) {
                outputItem.destroy_start = rawtransaction.time;
                return outputItem.n === vout;
            });
            return Promise.all(promises).then(function(outputItems) {
                if (outputItems) {
                    return outputItems[0];
                }
                else {
                    return;
                }
            });
        });
    }
};
var txidToInputItem = memoize(slow_txidToInputItem, config.memoize );
module.exports.txidToInputItem = txidToInputItem;

var slow_rawTransactionToInputItem = function ( rawtransaction ) {
    var promises = rawtransaction.vin.map(function(vin) { 
        return txidToInputItem(vin.txid, vin.vout);
    });
    return Promise.all(promises);
};

var rawTransactionToInputItem = memoize(slow_rawTransactionToInputItem, { async: true } );

module.exports.rawTransactionToInputItem = rawTransactionToInputItem;

var rawTransactionToTransactionSignature = function (rawtransaction) {
    //console.log(rawtransaction.vin);
    if(rawtransaction.vin[0].sequence == 0) {
        return rawtransaction
    }
    else {
        rawTransactionToInputItem(rawtransaction)
        .then(function(vin_detail) {
            let rawtransaction_with_detail = rawtransaction;
            rawtransaction_with_detail.vin_detail = vin_detail;
            console.log(rawtransaction_with_detail);
            return(rawtransaction_with_detail);
        })
    }
};
module.exports.rawTransactionToTransactionSignature = rawTransactionToTransactionSignature;

var dateRangeToTransactionSignature = function (startdate, enddate) {
    dateRangeToBlockHash(startdate, enddate)
    .then(function(blockhashArr) {
        var blockheaderpromises = blockhashArr.map(function(blockhash) {
            client.getBlock(blockhash)
            .then(function(blockheader) {
                return blockheader;
            });
        });
        return Promise.all(blockheaderpromises)
        .then(function(blockheaders) {
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
    //     rawTransactionToInputItem.clear();
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
