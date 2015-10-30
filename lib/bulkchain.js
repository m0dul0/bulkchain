'use strict';

var config = require(__dirname + '/../config/options.js');
var bitcoin = require('bitcoin-promise');
var winston = require('winston');
var logger = new(winston.Logger) ({
    transports: [ new(winston.transports.File)({filename: './bulkchain.log'})],
    level: config.winston_log_level
});
var async = require('async');
var memoize = require('memoizee');
var assert = require('assert');

var client = new bitcoin.Client({
    host: config.bitcoind_host,
    user: config.bitcoind_rpc_user,
    pass: config.bitcoind_rpc_pass,
    timeout: 120000
});

var getBlockCount = client.getBlockCount()
    .then(function (blockcount){
        return blockcount;
    })
    .catch(function(err) {
        logger.error(err);
    });

module.exports.getBlockCount = getBlockCount;

var slow_blockCountToBlockHash = function(blockcount) {
    return (
        client.getBlockHash(blockcount)
        .then(function (blockhash){
            return blockhash;
        })
        .catch(function(err) {
            logger.error(err);
        })
    );
};

var blockCountToBlockHash = memoize(slow_blockCountToBlockHash, { primitive: true, async: true} );

module.exports.blockCountToBlockHash = blockCountToBlockHash;

var blockHashToBlockHeader = function (blockhash) {
    return (
        client.getBlock( blockhash )
        .then(function(blockheader) {
            assert.equal(blockheader.hash, blockhash);
            return blockheader;
        })
        .catch(function(err) {
            logger.error(err);
        })
    );
};

module.exports.blockHashToBlockHeader = blockHashToBlockHeader;

var slow_blockCountToTime = function (blockcount) {
    return(
        blockCountToBlockHash(blockcount)
        .then( function(blockhash) {
            return blockHashToBlockHeader(blockhash);
        })
        .then( function(blockheader) {
            return blockheader.time;
        })
        .catch(function(err) {
            logger.error(err);
        })
    );
};

var blockCountToTime = memoize(slow_blockCountToTime, { primitive: true, async: true} );
module.exports.blockCountToTime = blockCountToTime;

var latestBlockTime = (function () {
    return (
        getBlockCount
        .then( function(blockcount) {
            return blockCountToTime(blockcount);
        })
        .catch(function(err) {
            logger.error(err);
        })
    );
})();
module.exports.latestBlockTime = latestBlockTime;

var bifurcate = function (lowblockcount, highblockcount, targettime) {
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
                bifurcate(searchparams.lowblockcount, searchparams.highblockcount, searchparams.targettime);
        })
        .catch(function(err) {
            logger.error(err);
        })
    );
};

var slow_dateToBlockCount = function (targettime) {
    return (
        getBlockCount
        .then(function (blockcount) {
            var lowblockcount = 1;
            var highblockcount = blockcount;
            return(bifurcate(lowblockcount, highblockcount, targettime));
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

var dateToBlockCount = memoize(slow_dateToBlockCount, { primitive: true, async: true} );
module.exports.dateToBlockCount = dateToBlockCount;

var dateRangeToBlockHash = function ( startdate, enddate ) {
    var startblock = dateToBlockCount(startdate)
        .then(function(startblock) {
            return startblock;
        })
    var endblock = dateToBlockCount(enddate)
        .then(function(endblock) {
            return endblock;
        })
    return (Promise.all([startblock, endblock])
        .then(function( blockrange ) {
            return Array.apply(null, Array((blockrange[1] - blockrange[0]))).map(function (_, i) {
                var blockhash = blockCountToBlockHash(i + blockrange[0]);
                return blockhash
            });
        })
    )
    .then(function(results) {
        return (results);
    })
    .catch(function(err) {
        logger.error(err);
    })
};
module.exports.dateRangeToBlockHash = dateRangeToBlockHash;

var slow_blockHashToTxid = function blockHashToTxid( blockhash, callback) {
    blockHashToBlockHeader( blockhash, cb_blockHashToBlockHeader );
    function cb_blockHashToBlockHeader(err, blockheader) {
        callback(err, blockheader.tx);
    }
};

var blockHashToTxid = memoize(slow_blockHashToTxid, { primitive: true, async: true} );
module.exports.blockHashToTxid = blockHashToTxid;

var txidToRawTransaction = function ( txid, callback) {
    let verbose = 1;
    client.getRawTransaction( txid, verbose, function (err, rawtransaction) {
        logger.debug({'functionname': 'txidToRawTransaction', 'rawtransaction': rawtransaction});
        callback(err, rawtransaction);
    });
};
module.exports.txidToRawTransaction = txidToRawTransaction;

var slow_txidToOutputArr = function ( txid, callback) {
    txidToRawTransaction(txid, function (err, rawtransaction) {
        if(rawtransaction) {
            callback(err, {destroy_start: rawtransaction.time, vout: rawtransaction.vout});
        }
        else {
            callback(err, null);
        }
    });
};

var txidToOutputArr = memoize(slow_txidToOutputArr, { async: true } );

module.exports.txidToOutputArr = txidToOutputArr;

var slow_txidToInputDetail = function ( txid, vout, callback) {
    txidToOutputArr(txid, function (err, outputArr) {
        logger.silly({'functionname': 'txidToOutputArr', 'outputArr': outputArr});
        if(outputArr) { 
            async.filter(
                outputArr.vout,
                function matchInputOutput(inputdetail, callback) {
                    inputdetail.destroy_start = outputArr.destroy_start;
                    callback(inputdetail.n === vout);
                },
                function shipInputs(inputDetailArr) {
                    logger.silly({'txidToInputDetail': inputDetailArr });
                    callback(err, inputDetailArr);
                }
            );
        }
        else {
            logger.error({txid: txid});
            callback(null);
        }
    });
};
var txidToInputDetail = memoize(slow_txidToInputDetail, {primitive: true, async: true});
module.exports.txidToInputDetail = txidToInputDetail;

var slow_rawTransactionToInputDetail = function ( rawtransaction, callback ) {
    let inputDetailArr = [];
    var q_txidToInputDetail = async.queue(function (task, callback) {
        // this queue was set up to deal with too many inputs. causing timeout
        // the problem was actually zero inputs causing timeout.
        // therefore we can make this normal again while refactoring some day.
        // leaving in for verbose logging.
        logger.silly({"functionname": 'q_txidToInputDetail', "task": task } );
        txidToInputDetail(task.txid, task.vout, function (err, inputDetail) {
            if (inputDetail) {
                logger.debug({'q_txidToInputDetail': q_txidToInputDetail.length(), 'txid': task.txid});
                inputDetailArr.push({'txid': task.txid, 'value': inputDetail[0].value, 'n': inputDetail[0].n, 'destroy_start':inputDetail[0].destroy_start, 'scriptPubKey': inputDetail[0].scriptPubKey});
                callback();
            }
            else {
                logger.silly('@@@RELOAD@@@');
                q_txidToInputDetail.unshift({txid: task.txid, vout: task.vout});
                callback(err, null);
            }
        });
    }, 1);
    if(rawtransaction.vin[0].txid) {
        logger.silly({'rawtransaction.vin': rawtransaction.vin});
        async.map(
            rawtransaction.vin, 
            function (input) {
                q_txidToInputDetail.push({"txid": input.txid, "vout": input.vout}, function (err) {logger.error(err);});
            }
        );
    }
    else {
        callback();
    }

    q_txidToInputDetail.drain = function() {
        logger.silly({'DRAINinputDetailArr': inputDetailArr});
        callback( inputDetailArr );
    };
};
var rawTransactionToInputDetail = memoize(slow_rawTransactionToInputDetail, { async: true } );

module.exports.rawTransactionToInputDetail = rawTransactionToInputDetail;

var rawTransactionToTransactionSignature = function rawTransactionToTransactionSignature(rawtransaction) {
    logger.silly({functionname: 'rawTransactionToTransactionSignature', rawtransaction: JSON.stringify(rawtransaction)});
    async.parallel({
        version: function(callback) {
            logger.silly({version: rawtransaction.version});
            callback(null, rawtransaction.version);
        },
        txid: function(callback) {
            logger.silly({txid: rawtransaction.txid});
            callback(null, rawtransaction.txid);
        },
        locktime: function(callback) {
            logger.silly({locktime: rawtransaction.locktime});
            callback(null, rawtransaction.locktime);
        },
        blockhash: function(callback) {
            logger.silly({blockhash: rawtransaction.blockhash});
            callback(null, rawtransaction.blockhash);
        },
        confirmations: function(callback) {
            logger.silly({locktime: rawtransaction.confirmations});
            callback(null, rawtransaction.confirmations);
        },
        time: function(callback) {
            logger.silly({time: rawtransaction.time});
            callback(null, rawtransaction.time);
        },
        blocktime: function(callback) {
            logger.silly({blocktime: rawtransaction.blocktime});
            callback(null, rawtransaction.blocktime);
        },
        vout_satoshi_sum: function vout_satoshi_sum (callback) {
            logger.silly({functionname:'vout_value_sum', rawtransaction: rawtransaction});
            async.reduce(
                rawtransaction.vout,
                0.0,
                function add_vout_val(vout_value_sum, vout_item, callback) {
                    logger.silly({functionname: 'add_vout_val', vout_value_sum: vout_value_sum, vout_item_value: vout_item.value});
                    callback(null, vout_value_sum + parseInt((vout_item.value * 100000000) + 0.5));
                },
                function ship_output_value_sum (err, vout_value_sum) {
                    logger.silly({functionname: 'ship_output_value_sum', vout_value_sum: vout_value_sum});
                    callback(null, vout_value_sum);
                }
            );
        },
        vout_value_concat: function vout_value_concat (callback) {
            logger.silly({functionname:'vout_value_concat', rawtransaction: rawtransaction});
            async.reduce(
                rawtransaction.vout,
                [],
                function concat_vout_val(vout_value_arr, vout_item, callback) {
                    logger.silly({functionname: 'concat_vout_val', vout_value_concat: vout_value_arr, vout_item_value: vout_item.value});
                    callback(null, vout_value_arr.concat(parseInt((vout_item.value * 100000000) + 0.5)));
                },
                function ship_vout_value_concat (err, vout_value_concat) {
                    logger.silly({functionname: 'ship_output_value_concat', vout_value_concat: vout_value_concat});
                    callback(null, vout_value_concat);
                }
            );
        },
        vout_count: function vout_count (callback) {
            logger.silly({functionname:'vout_count', rawtransaction: rawtransaction});
            callback(null, rawtransaction.vout.length);
        },
        vin_value_concat: function vin_value_concat (callback) {
            logger.silly({functionname:'vin_value_concat', rawtransaction: rawtransaction});
            rawTransactionToInputDetail(rawtransaction, cb_rawTransactionToInputDetail);
            function cb_rawTransactionToInputDetail (inputdetail) {
                logger.silly({functionname: 'cb_rawTransactionToInputDetail', inputdetail: inputdetail });
                async.reduce(
                    inputdetail,
                    [],
                    function concat_vin_val(vin_value_arr, vin_item, callback) {
                        logger.silly({functionname: 'concat_vin_val', vin_value_concat: vin_value_arr, vin_item_value: vin_item.value});
                        callback(null, vin_value_arr.concat(parseInt((vin_item.value * 100000000) + 0.5)));
                    },
                    function ship_vin_value_concat (err, vin_value_concat) {
                        logger.silly({functionname: 'ship_input_value_concat', vin_value_concat: vin_value_concat});
                        callback(null, vin_value_concat);
                    }
                );
            }
        },
        vin_satoshi_sum: function vin_satoshi_sum (callback) {
            rawTransactionToInputDetail(rawtransaction, cb_rawTransactionToInputDetail);
            function cb_rawTransactionToInputDetail (inputdetail) {
                logger.silly({functionname: 'cb_rawTransactionToInputDetail', inputdetail: inputdetail });
                async.reduce(
                    inputdetail,
                    0.0,
                    function add_vin_val(vin_value_sum, vin_item, callback) {
                        logger.silly({functionname: 'add_vin_val', vin_value_sum: vin_value_sum, vin_item_value: vin_item.value});
                        callback(null, vin_value_sum + parseInt((vin_item.value * 100000000) + 0.5));
                    },
                    function ship_input_value_sum (err, vin_value_sum) {
                        logger.silly({functionname: 'ship_input_value_sum', vin_value_sum: vin_value_sum});
                        callback(null, vin_value_sum);
                    }
                );
            }
        },
        vin_count: function vin_count (callback) {
            logger.silly({functionname:'vin_count', rawtransaction: rawtransaction});
            callback(null, rawtransaction.vin.length);
        },
        satoshi_seconds_destroyed_concat: function vin_satoshisecondsdestroyed_concat (callback) {
            logger.silly({functionname:'vin_satoshisecondsdestroyed_concat', rawtransaction: rawtransaction});
            rawTransactionToInputDetail(rawtransaction, cb_rawTransactionToInputDetail);
            function cb_rawTransactionToInputDetail (inputdetail) {
                logger.silly({functionname: 'cb_rawTransactionToInputDetail', inputdetail: inputdetail });
                async.reduce(
                    inputdetail,
                    [],
                    function (vin_arr, vin_item, callback) {
                        let satoshiSecondsDestroyed = ((rawtransaction.time - vin_item.destroy_start) * parseInt((vin_item.value * 100000000) + 0.5));
                        logger.silly({satoshiSecondsDestroyed: satoshiSecondsDestroyed});
                        callback(null, vin_arr.concat(satoshiSecondsDestroyed));
                    },
                    function ship_vin_satoshisecondsdestroyed_concat (err, vin_satoshisecondsdestroyed_concat) {
                        logger.silly({satoshiSecondsDestroyed: vin_satoshisecondsdestroyed_concat});
                        callback(null, vin_satoshisecondsdestroyed_concat);
                    }
                );
            }
        },
        satoshi_seconds_destroyed_sum: function seconds_destroyed_sum (callback) {
            rawTransactionToInputDetail(rawtransaction, cb_rawTransactionToInputDetail);
            function cb_rawTransactionToInputDetail (inputdetail) {
                logger.silly({functionname: 'cb_rawTransactionToInputDetail', inputdetail: inputdetail });
                async.reduce(
                    inputdetail,
                    0,
                    function add_vin_val(vin_satoshisecondsdestroyed_sum, vin_item, callback) {
                        let satoshiSecondsDestroyed = ((rawtransaction.time - vin_item.destroy_start) * parseInt((vin_item.value * 100000000) + 0.5));
                        callback(null, vin_satoshisecondsdestroyed_sum + satoshiSecondsDestroyed);
                    },
                    function ship_input_satoshisecondsdestroyed_sum (err, vin_satoshisecondsdestroyed_sum) {
                        logger.silly({functionname: 'ship_input_satoshisecondsdestroyed_sum', vin_satoshisecondsdestroyed_sum: vin_satoshisecondsdestroyed_sum});
                        callback(null, vin_satoshisecondsdestroyed_sum);
                    }
                );
            }
        }
    },
    function(transactionsignature) {
        return transactionsignature;
    });
};
module.exports.rawTransactionToTransactionSignature = rawTransactionToTransactionSignature;

/**
 * accepts start and stop block.time (unixtime) returns transaction signatures
 * @function
 * @param {number} startdate - block.time
 * @param {number} enddate - block.time
 * @param {dateRangeToTransactionSignature~callback} callback - array of transaction signatures
 */
var dateRangeToTransactionSignature = function (startdate, enddate) {
    logger.silly({functionname: 'dateRangeToTransactionSignature', startdate: startdate, enddate: enddate});
    var transactionSignatureArr = [];
    
    var q_rawTransactionToTransactionSignature = async.queue(function (task) {
        logger.debug({functionname:'q_rawTransactionToTransactionSignature', blocks_in_queue: q_blockHashToTxid.length(), txid_in_queue: q_txidToRawTransaction.length(), rawtransaction_in_queue: q_rawTransactionToTransactionSignature.length()});
        rawTransactionToTransactionSignature(task.rawtransaction, function (transactionSignature) {
            if(transactionSignature) {
                transactionSignatureArr.push(transactionSignature);
            }
            else {
                q_rawTransactionToTransactionSignature.push({rawtransaction: task.rawtransaction}, function () {
                });
            }
         });
    }, 1);

    var q_txidToRawTransaction = async.queue(function (task, callback) {
        if(q_rawTransactionToTransactionSignature.length() > 1) {
            q_txidToRawTransaction.pause();
        }
        logger.silly({
            functionname: 'q_txidToRawTransaction',
            txid: task.txid,
            blocks_in_queue: q_blockHashToTxid.length(),
            txid_in_queue: q_txidToRawTransaction.length(),
            rawtransaction_in_queue: q_rawTransactionToTransactionSignature.length()
        });
        txidToRawTransaction(task.txid, function (err, rawtransaction) {
            if(rawtransaction) {
                q_rawTransactionToTransactionSignature.push({rawtransaction: rawtransaction});
            }
            else {
                q_txidToRawTransaction.unshift({txid: task.txid}, function () {});
            }
            callback();
        });
    }, 1);
    
    var q_blockHashToTxid = async.queue(function (task, callback) {
        if(q_txidToRawTransaction.length() > 0) {
            q_blockHashToTxid.pause();
        }
        logger.silly({functionname: 'q_blockHashToTxid', blockhash: task.blockhash});
        blockHashToTxid(task.blockhash, function cb_blockHashToTxid(err, txidArr) {
            if(txidArr) {
                async.map(txidArr, function(txid) {
                    logger.silly({functionname:'cb_blockHashToTxid', txid: txid});
                    q_txidToRawTransaction.push({txid: txid});
                });
            }
            else {
                q_blockHashToTxid.unshift({blockhash: task.blockhash}, function () {});
            }
            callback();
        });
    }, 1 );
    
    q_txidToRawTransaction.drain = function() {
        blockHashToTxid.clear();
        txidToOutputArr.clear();
        blockCountToBlockHash.clear();
        blockCountToTime.clear();
        rawTransactionToInputDetail.clear();
        q_blockHashToTxid.resume();
    };
    
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

    dateRangeToBlockHash( startdate, enddate, function (blockhasharr) {
        logger.silly(JSON.stringify(blockhasharr));
        async.map(blockhasharr, function(blockhash) {
            q_blockHashToTxid.push({blockhash: blockhash});
        });
    });
};
module.exports.dateRangeToTransactionSignature = dateRangeToTransactionSignature;
