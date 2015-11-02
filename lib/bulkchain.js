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

var slow_blockCountToTime = function (blockcount) {
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

var blockCountToTime = memoize(slow_blockCountToTime, config.memoize );
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
            var lowblockcount = 1;
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

var slow_txidToInputDetail = function ( txid, vout ) {
    return client.getRawTransaction( txid, 1 )
    .then(function(rawtransaction) {
        var promises = rawtransaction.vout.filter(function(outputItem) {
            outputItem.destroy_start = rawtransaction.time;
            return outputItem.n === vout;
        });
        return Promise.all(promises).then(function(outputItems) {
            return outputItems[0];
        });
    });
};
var txidToInputDetail = memoize(slow_txidToInputDetail, config.memoize );
module.exports.txidToInputDetail = txidToInputDetail;

var slow_rawTransactionToInputDetail = function ( rawtransaction ) {
    var promises = rawtransaction.vin.map(function(vin) {
        txidToInputDetail(vin.txid, vin.vout)
        .then(function (inputDetail) {
            return (inputDetail);
        });
    });
    return Promise.all(promises).then(function(inputDetail) {
        return inputDetail;
    });
};

var rawTransactionToInputDetail = memoize(slow_rawTransactionToInputDetail, { async: true } );

module.exports.rawTransactionToInputDetail = rawTransactionToInputDetail;

var rawTransactionToTransactionSignature = function (rawtransaction) {
    //console.log(rawtransaction);
    let transactionSignature = {};
    return rawTransactionToInputDetail(rawtransaction)
    .then(function(inputDetail) {
        rawtransaction.vin_detail = inputDetail;
        return rawtransaction;
    });
    // return(transactionSignature);
    // async.parallel({
    //     version: function(callback) {
    //         logger.silly({version: rawtransaction.version});
    //         callback(null, rawtransaction.version);
    //     },
    //     txid: function(callback) {
    //         logger.silly({txid: rawtransaction.txid});
    //         callback(null, rawtransaction.txid);
    //     },
    //     locktime: function(callback) {
    //         logger.silly({locktime: rawtransaction.locktime});
    //         callback(null, rawtransaction.locktime);
    //     },
    //     blockhash: function(callback) {
    //         logger.silly({blockhash: rawtransaction.blockhash});
    //         callback(null, rawtransaction.blockhash);
    //     },
    //     confirmations: function(callback) {
    //         logger.silly({locktime: rawtransaction.confirmations});
    //         callback(null, rawtransaction.confirmations);
    //     },
    //     time: function(callback) {
    //         logger.silly({time: rawtransaction.time});
    //         callback(null, rawtransaction.time);
    //     },
    //     blocktime: function(callback) {
    //         logger.silly({blocktime: rawtransaction.blocktime});
    //         callback(null, rawtransaction.blocktime);
    //     },
    //     vout_satoshi_sum: function vout_satoshi_sum (callback) {
    //         logger.silly({functionname:'vout_value_sum', rawtransaction: rawtransaction});
    //         async.reduce(
    //             rawtransaction.vout,
    //             0.0,
    //             function add_vout_val(vout_value_sum, vout_item, callback) {
    //                 logger.silly({functionname: 'add_vout_val', vout_value_sum: vout_value_sum, vout_item_value: vout_item.value});
    //                 callback(null, vout_value_sum + parseInt((vout_item.value * 100000000) + 0.5));
    //             },
    //             function ship_output_value_sum (err, vout_value_sum) {
    //                 logger.silly({functionname: 'ship_output_value_sum', vout_value_sum: vout_value_sum});
    //                 callback(null, vout_value_sum);
    //             }
    //         );
    //     },
    //     vout_value_concat: function vout_value_concat (callback) {
    //         logger.silly({functionname:'vout_value_concat', rawtransaction: rawtransaction});
    //         async.reduce(
    //             rawtransaction.vout,
    //             [],
    //             function concat_vout_val(vout_value_arr, vout_item, callback) {
    //                 logger.silly({functionname: 'concat_vout_val', vout_value_concat: vout_value_arr, vout_item_value: vout_item.value});
    //                 callback(null, vout_value_arr.concat(parseInt((vout_item.value * 100000000) + 0.5)));
    //             },
    //             function ship_vout_value_concat (err, vout_value_concat) {
    //                 logger.silly({functionname: 'ship_output_value_concat', vout_value_concat: vout_value_concat});
    //                 callback(null, vout_value_concat);
    //             }
    //         );
    //     },
    //     vout_count: function vout_count (callback) {
    //         logger.silly({functionname:'vout_count', rawtransaction: rawtransaction});
    //         callback(null, rawtransaction.vout.length);
    //     },
    //     vin_value_concat: function vin_value_concat (callback) {
    //         logger.silly({functionname:'vin_value_concat', rawtransaction: rawtransaction});
    //         rawTransactionToInputDetail(rawtransaction, cb_rawTransactionToInputDetail);
    //         function cb_rawTransactionToInputDetail (inputdetail) {
    //             logger.silly({functionname: 'cb_rawTransactionToInputDetail', inputdetail: inputdetail });
    //             async.reduce(
    //                 inputdetail,
    //                 [],
    //                 function concat_vin_val(vin_value_arr, vin_item, callback) {
    //                     logger.silly({functionname: 'concat_vin_val', vin_value_concat: vin_value_arr, vin_item_value: vin_item.value});
    //                     callback(null, vin_value_arr.concat(parseInt((vin_item.value * 100000000) + 0.5)));
    //                 },
    //                 function ship_vin_value_concat (err, vin_value_concat) {
    //                     logger.silly({functionname: 'ship_input_value_concat', vin_value_concat: vin_value_concat});
    //                     callback(null, vin_value_concat);
    //                 }
    //             );
    //         }
    //     },
    //     vin_satoshi_sum: function vin_satoshi_sum (callback) {
    //         rawTransactionToInputDetail(rawtransaction, cb_rawTransactionToInputDetail);
    //         function cb_rawTransactionToInputDetail (inputdetail) {
    //             logger.silly({functionname: 'cb_rawTransactionToInputDetail', inputdetail: inputdetail });
    //             async.reduce(
    //                 inputdetail,
    //                 0.0,
    //                 function add_vin_val(vin_value_sum, vin_item, callback) {
    //                     logger.silly({functionname: 'add_vin_val', vin_value_sum: vin_value_sum, vin_item_value: vin_item.value});
    //                     callback(null, vin_value_sum + parseInt((vin_item.value * 100000000) + 0.5));
    //                 },
    //                 function ship_input_value_sum (err, vin_value_sum) {
    //                     logger.silly({functionname: 'ship_input_value_sum', vin_value_sum: vin_value_sum});
    //                     callback(null, vin_value_sum);
    //                 }
    //             );
    //         }
    //     },
    //     vin_count: function vin_count (callback) {
    //         logger.silly({functionname:'vin_count', rawtransaction: rawtransaction});
    //         callback(null, rawtransaction.vin.length);
    //     },
    //     satoshi_seconds_destroyed_concat: function vin_satoshisecondsdestroyed_concat (callback) {
    //         logger.silly({functionname:'vin_satoshisecondsdestroyed_concat', rawtransaction: rawtransaction});
    //         rawTransactionToInputDetail(rawtransaction, cb_rawTransactionToInputDetail);
    //         function cb_rawTransactionToInputDetail (inputdetail) {
    //             logger.silly({functionname: 'cb_rawTransactionToInputDetail', inputdetail: inputdetail });
    //             async.reduce(
    //                 inputdetail,
    //                 [],
    //                 function (vin_arr, vin_item, callback) {
    //                     let satoshiSecondsDestroyed = ((rawtransaction.time - vin_item.destroy_start) * parseInt((vin_item.value * 100000000) + 0.5));
    //                     logger.silly({satoshiSecondsDestroyed: satoshiSecondsDestroyed});
    //                     callback(null, vin_arr.concat(satoshiSecondsDestroyed));
    //                 },
    //                 function ship_vin_satoshisecondsdestroyed_concat (err, vin_satoshisecondsdestroyed_concat) {
    //                     logger.silly({satoshiSecondsDestroyed: vin_satoshisecondsdestroyed_concat});
    //                     callback(null, vin_satoshisecondsdestroyed_concat);
    //                 }
    //             );
    //         }
    //     },
    //     satoshi_seconds_destroyed_sum: function seconds_destroyed_sum (callback) {
    //         rawTransactionToInputDetail(rawtransaction, cb_rawTransactionToInputDetail);
    //         function cb_rawTransactionToInputDetail (inputdetail) {
    //             logger.silly({functionname: 'cb_rawTransactionToInputDetail', inputdetail: inputdetail });
    //             async.reduce(
    //                 inputdetail,
    //                 0,
    //                 function add_vin_val(vin_satoshisecondsdestroyed_sum, vin_item, callback) {
    //                     let satoshiSecondsDestroyed = ((rawtransaction.time - vin_item.destroy_start) * parseInt((vin_item.value * 100000000) + 0.5));
    //                     callback(null, vin_satoshisecondsdestroyed_sum + satoshiSecondsDestroyed);
    //                 },
    //                 function ship_input_satoshisecondsdestroyed_sum (err, vin_satoshisecondsdestroyed_sum) {
    //                     logger.silly({functionname: 'ship_input_satoshisecondsdestroyed_sum', vin_satoshisecondsdestroyed_sum: vin_satoshisecondsdestroyed_sum});
    //                     callback(null, vin_satoshisecondsdestroyed_sum);
    //                 }
    //             );
    //         }
    //     }
    // },
    // function(transactionsignature) {
    //     return transactionsignature;
    // });
};
module.exports.rawTransactionToTransactionSignature = rawTransactionToTransactionSignature;

var dateRangeToTransactionSignature = function (startdate, enddate) {
    logger.silly({functionname: 'dateRangeToTransactionSignature', startdate: startdate, enddate: enddate});
    var transactionSignatureArr = [];

    dateRangeToBlockHash( startdate, enddate )
        .then(function (blockhasharr) {
            var promises = blockhasharr.map(function(blockhash) {
                return blockhash;
            });
            return Promise.all(promises).then(function(blockhashArr) {
                //console.log(blockhashArr);
                return blockhashArr
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
