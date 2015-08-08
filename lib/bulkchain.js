
'use strict'

/**
 * bulkchain
 * @module bulkchain
 */

var config = require(__dirname + '/../config/options.js')
var bitcoin = require('bitcoin')
var logger = require('winston')
var async = require('async')
var ss = require('simple-statistics');

logger.level = config.winston_log_level

var client = new bitcoin.Client({
    host: config.bitcoind_host,
    user: config.bitcoind_rpc_user,
    pass: config.bitcoind_rpc_pass,
    timeout: 5000
})

/**
  * returns current block height behaves like bitcoin-cli getblockcount
  * @function
  * @param {getBlockCount~callback} callback - block.height
  */
var getBlockCount = function getBlockCount( callback ){
    logger.silly({functionname: 'getBlockCount'})
    client.getBlockCount( cb_clientGetBlockCount )
    function cb_clientGetBlockCount(err, blockcount) {
        handleError
        logger.silly({functionname: 'cb_clientGetBlockCount', 'blockcount':blockcount})
        callback(err, blockcount)
    }
}
module.exports.getBlockCount = getBlockCount

/**
 * accepts block.height returns block.hash behaves like bitcoin-cli getblockhash
 * @function
 * @param {number} blockcount - block.height
 * @param {blockCountToBlockHash~callback} callback - block.hash
 */
var blockCountToBlockHash = function blockCountToBlockHash( blockcount, callback) {
    logger.silly({functionname: 'blockCountToBlockHash', blockcount:blockcount})
    client.getBlockHash( blockcount, cb_blockCountToBlockHash )
    function cb_blockCountToBlockHash(err, blockhash) {
        handleError
        logger.silly({functionname: 'cb_blockCountToBlockHash', blockhash:blockhash})
        callback(err, blockhash)
    }
}
module.exports.blockCountToBlockHash = blockCountToBlockHash

/**
 * accepts block.hash returns block header content behaves like bitcoin-cli getblock
 * @function
 * @param {string} blockhash - block.hash
 * @param {blockHashToBlockHeader~callback} callback - block
 */
var blockHashToBlockHeader = function blockHashToBlockHeader(blockhash, callback) {
    logger.silly({functionname: 'blockHashToBlockHeader', 'blockhash': blockhash})
    client.getBlock( blockhash, cb_blockHeader )
    function cb_blockHeader (err, blockheader) {
        handleError
        logger.silly({functionname: 'cbBlockHeader', 'blockheader': blockheader.hash})
        callback(err, blockheader)
    }
}
module.exports.blockHashToBlockHeader = blockHashToBlockHeader

var handleError = function handleError(err) {
    if(err) { 
        logger.error(err)
    }
}

/**
 * accepts block.height returns block.time
 * @function
 * @param {number} blockcount - block.height
 * @param {blockCountToTime~callback} callback - block.time
 */
var blockCountToTime = function blockCountToTime( blockcount, callback ) {
    logger.silly({functionname:'blockCountToTime'})
    blockCountToBlockHash(blockcount, cb_blockCountToBlockHash)
    function cb_blockCountToBlockHash(err, blockhash) {
        handleError
        logger.silly({functionname: 'cb_blockCountToBlockHash', blockhash: blockhash})
        blockHashToBlockHeader(blockhash, cb_blockHashToBlockHeader)
        function cb_blockHashToBlockHeader(err, blockheader) {
            handleError
            logger.silly({functionname: 'cb_blockHashToBlockHeader', blockheader: blockheader.hash})
            callback(err, blockheader.time)
        }
    }
}
module.exports.blockCountToTime = blockCountToTime

/**
 * returns latest block.time
 * @function
 * @param {latestBlockTime~callback} callback - block.time
 */
var latestBlockTime = function latestBlockTime( callback ) {
    logger.silly({functionname:'latestBlockTime'})
    getBlockCount(cb_getBlockCount)
    function cb_getBlockCount(err, blockcount) {
        handleError
        logger.silly({functionname: 'cb_getBlockCount', blockcount: blockcount})
        blockCountToTime(blockcount, cb_blockCountToTime)
        /**
         * @callback latestBlockTime~callback
         * @param {number} time
         */
        function cb_blockCountToTime(err, time) {
            callback(time)
        }
    }
}
module.exports.latestBlockTime = latestBlockTime

/**
 * accepts block.time (unixtime) returns very next block.height
 * @function
 * @param {number} targettime - block.time
 * @param {dateToBlockCount~callback} callback - block.height
 */
var dateToBlockCount = function dateToBlockCount( targettime, callback) {
    logger.silly({functionname:'dateToBlockCount', targettime: targettime})
    async.series(
        {
            latestblockcount: getBlockCount,
            latestblocktime: latestBlockTime
        }
        , function search_for_blockcount(err, startingpoint) {
            logger.silly({functionname: 'search_for_blockcount', startingpoint: startingpoint})
            var low = 1
            var high = startingpoint.latestblockcount
            async.whilst(
                function check_if_done() {
                    logger.silly({low: low, high: high})
                    return low < high -1
                },
                function bifurcate(callback) {
                    logger.silly('bifurcate', {high: high, low: low, targettime: targettime})
                    var midpoint = parseInt(( high - low ) / 2) + low
                    blockCountToTime(midpoint, cb_blockCountToTime)
                    function cb_blockCountToTime ( err, time ) {
                        handleError
                        logger.silly('cb_blockCountToTime', {target: targettime, time: time})
                        if (time > targettime) {
                            high = midpoint
                        }
                        else{
                            low = midpoint
                        }
                        setTimeout(callback, 0)
                    }
                },
                function bullseye() {
                    logger.silly( { functionname: 'bullseye_blockcount', low: low, high: high } )
                    blockCountToTime(low, cb_blockcountToTime)
                    function cb_blockcountToTime (err, time) {
                        handleError
                        logger.silly({functionname: 'cb_blockcountToTime', time: time})
                        
                        // below "targettime" is from the user input, 
                        // "time" is the block.time we found from block
                        if (targettime <= time) {
                            setTimeout(callback(null, low), 0)
                        }
                        else {
                            if( targettime > latestBlockTime) 
                                { setTimeout( callback(null, null), 0)}
                            else { 
                                setTimeout(callback(null, high), 0)
                            }
                        }
                    }
                }
            )
        }
    )
}
module.exports.dateToBlockCount = dateToBlockCount

/**
 * accepts start and stop block.time (unixtime) returns block hashes between
 * @function
 * @param {number} startdate - block.time
 * @param {number} enddate - block.time
 * @param {dateRangeToBlockHash~callback} callback - array of block.hash values
 */
var dateRangeToBlockHash = function dateRangeToBlockHash( startdate, enddate, callback) {
    logger.silly({functionname: 'dateRangeToBlockHash', startdate: startdate, enddate: enddate})
    var blockhasharr = []
    async.series({
        blockcountstart: function(callback) {
            dateToBlockCount(startdate, cb_dateToBlockCount)
            function cb_dateToBlockCount(err, blockcount) {
                callback(null, blockcount)
            }
        },
        blockcountend: function(callback) {
            dateToBlockCount(enddate, cb_dateToBlockCount)
            function cb_dateToBlockCount(err, blockcount) {
                callback(null, blockcount)
            }
        }
    },
    function(err, blockcountrange) {
        logger.silly({functionname: 'dateRangeToBlockHash', blockcountstart: blockcountrange.blockcountstart, blockcountend: blockcountrange.blockcountend})
            var blockcount = blockcountrange.blockcountstart
            async.whilst(
                function check_if_done () {
                    logger.silly({functionname: 'check_if_done', blockcount: blockcount, blockcountend: blockcountrange.blockcountend})
                    return blockcount <= blockcountrange.blockcountend
                },
                function blockcount_to_blockhash(callback) {
                    logger.silly({functionname: 'blockcount_to_blockhash', blockcount: blockcount})
                    blockCountToBlockHash( blockcount , cb_blockCountToBlockHash)
                    function cb_blockCountToBlockHash (err, blockhash) {
                        logger.silly({functionname: 'cb_blockCountToBlockHash', blockhash: blockhash})
                        blockhasharr.push(blockhash)
                        setTimeout(callback, 0)
                    }
                    blockcount++
                }
                ,
                function ship_hash() {
                    logger.silly({blockcount: blockcount, blockcountrange: blockcountrange})
                    callback(blockhasharr)
                }
            )
        }
    )
}
module.exports.dateRangeToBlockHash = dateRangeToBlockHash

/**
 * accepts block.hash returns array of txid
 * @function
 * @param {number} blockhash - block.hash
 * @param {blockHashToTxid~callback} callback - array of block.hash values
 */
var blockHashToTxid = function blockHashToTxid( blockhash, callback) {
    logger.silly({functionname:'blockHashToTxid', blockhash: blockhash})
    blockHashToBlockHeader( blockhash, cb_blockHashToBlockHeader )
        function cb_blockHashToBlockHeader(err, blockheader) {
        logger.silly({functionname:'cb_blockHashToBlockHeader', blockheader: blockheader.tx})
        callback(null, blockheader.tx)
    }
}
module.exports.blockHashToTxid = blockHashToTxid

/**
 * accepts txid returns rawtransaction (like bitcoin-cli getrawtransaction)
 * @function
 * @param {string} tx - block.tx
 * @param {cb_txidToRawTransaction~callback} callback - rawtransaction
 */
var txidToRawTransaction = function txidToRawTransaction( txid, callback) {
    logger.silly({functionname: 'txidToRawTransaction', txid: txid})
    var verbose = 1
    client.getRawTransaction( txid, verbose, cb_txidToRawTransaction )
    function cb_txidToRawTransaction(err, rawtransaction) {
        handleError
        logger.silly({functionname: 'cb_txidToRawTransaction', rawtransaction:rawtransaction.txid})
        callback(err, rawtransaction)
    }
}
module.exports.txidToRawTransaction = txidToRawTransaction


/**
 * accepts a rawtransaction returns input details
 * @function
 * @param {string} rawtransaction - block.tx[n]
 * @param {cb_txidToRawTransaction~callback} callback - block.tx[txid].vout[n] 
 */
var rawTransactionToInputDetail = function rawTransactionToInputDetail( rawtransaction, callback ) {
    logger.silly({functionname: 'rawTransactionToInputDetail', rawtransaction:rawtransaction.txid})
    async.concat(
        rawtransaction.vin
        , function getOutput(input, callback) {
            logger.silly({functionname: 'getOutput', inputtx: input.txid, vout: input.vout}) 
            txidToRawTransaction(input.txid, cb_txidToRawOutputTransaction)
            function cb_txidToRawOutputTransaction(err, outputtransaction) {
                handleError
                logger.silly({functionname:'cb_txidToRawOutputTransaction', outputtransaction: outputtransaction})
                async.filter(
                    outputtransaction.vout
                    , function matchInputOutput(inputdetail, callback) {
                        callback(inputdetail.n === input.vout)
                    }
                    ,function shipMatchedInOut(inputdetail) {
                        logger.silly({functionname:'shipMatchedInOut', inputdetail: inputdetail})
                        callback(err, inputdetail)
                    }
                )
            }
        }
        , function shipInputDetail(err, inputdetail) {
            handleError
            logger.silly({functionname: 'shipInputDetail', inputdetail: inputdetail})
            callback(err, inputdetail)
        }
    )
}
module.exports.rawTransactionToInputDetail = rawTransactionToInputDetail

/**
 * accepts raw transaction returns a transaction signature
 * @function
 * @param {string} txid - txid
 * @param {cb_txidToTransactionSignature~callback} callback - transactionSignature
 */
var rawTransactionToTransactionSignature = function rawTransactionToTransactionSignature(rawtransaction, callback) {
    logger.silly({functionname: 'rawTransactionToTransactionSignature', rawtransaction: rawtransaction})
    async.parallel({
        version: function(callback) {
            logger.silly({version: rawtransaction.version})
            callback(null, rawtransaction.version)
        },
        txid: function(callback) {
            logger.silly({txid: rawtransaction.txid})
            callback(null, rawtransaction.txid)
        },
        locktime: function(callback) {
            logger.silly({locktime: rawtransaction.locktime})
            callback(null, rawtransaction.locktime)
        },
        blockhash: function(callback) {
            logger.silly({blockhash: rawtransaction.blockhash})
            callback(null, rawtransaction.blockhash)
        },
        confirmations: function(callback) {
            logger.silly({locktime: rawtransaction.confirmations})
            callback(null, rawtransaction.confirmations)
        },
        time: function(callback) {
            logger.silly({time: rawtransaction.time})
            callback(null, rawtransaction.time)
        },
        blocktime: function(callback) {
            logger.silly({blocktime: rawtransaction.blocktime})
            callback(null, rawtransaction.blocktime)
        },
        vout_satoshi_sum: function vout_satoshi_sum (callback) {
            logger.silly({functionname:'vout_value_sum', rawtransaction: rawtransaction})
            async.reduce(
                rawtransaction.vout
                ,0.0
                ,function add_vout_val(vout_value_sum, vout_item, callback) {
                    logger.silly({functionname: 'add_vout_val', vout_value_sum: vout_value_sum, vout_item_value: vout_item.value})
                    callback(null, vout_value_sum + parseInt((vout_item.value * 100000000) + .5))
                }
                , function ship_output_value_sum (err, vout_value_sum) {
                    logger.silly({functionname: 'ship_output_value_sum', vout_value_sum: vout_value_sum})
                    callback(null, vout_value_sum)
                }
            )
        },
        vout_value_concat: function vout_value_concat (callback) {
            logger.silly({functionname:'vout_value_concat', rawtransaction: rawtransaction})
            async.reduce(
                rawtransaction.vout
                ,[]
                ,function concat_vout_val(vout_value_arr, vout_item, callback) {
                    logger.silly({functionname: 'concat_vout_val', vout_value_concat: vout_value_arr, vout_item_value: vout_item.value})
                    callback(null, vout_value_arr.concat(vout_item.value))
                }
                , function ship_vout_value_concat (err, vout_value_concat) {
                    logger.silly({functionname: 'ship_output_value_concat', vout_value_concat: vout_value_concat})
                    callback(null, vout_value_concat)
                }
            )
        },
        vout_count: function vout_count (callback) {
            logger.silly({functionname:'vout_count', rawtransaction: rawtransaction})
            callback(null, rawtransaction.vout.length)
        },
        vin_value_concat: function vin_value_concat (callback) {
            logger.silly({functionname:'vin_value_concat', rawtransaction: rawtransaction})
            rawTransactionToInputDetail(rawtransaction, cb_rawTransactionToInputDetail)
            function cb_rawTransactionToInputDetail (err, inputdetail) {
                logger.silly({functionname: 'cb_rawTransactionToInputDetail', inputdetail: inputdetail })
                async.reduce(
                    inputdetail
                    ,[]
                    ,function concat_vin_val(vin_value_arr, vin_item, callback) {
                        logger.silly({functionname: 'concat_vin_val', vin_value_concat: vin_value_arr, vin_item_value: vin_item.value})
                        callback(null, vin_value_arr.concat(vin_item.value))
                    }
                    , function ship_vin_value_concat (err, vin_value_concat) {
                        logger.silly({functionname: 'ship_input_value_concat', vin_value_concat: vin_value_concat})
                        callback(null, vin_value_concat)
                    }
                )
            }
        },
        vin_satoshi_sum: function vin_satoshi_sum (callback) {
            rawTransactionToInputDetail(rawtransaction, cb_rawTransactionToInputDetail)
            function cb_rawTransactionToInputDetail (err, inputdetail) {
                logger.silly({functionname: 'cb_rawTransactionToInputDetail', inputdetail: inputdetail })
                async.reduce(
                    inputdetail
                    ,0.0
                    ,function add_vin_val(vin_value_sum, vin_item, callback) {
                        logger.silly({functionname: 'add_vin_val', vin_value_sum: vin_value_sum, vin_item_value: vin_item.value})
                        callback(null, vin_value_sum + parseInt((vin_item.value * 100000000) + .5))
                    }
                    , function ship_input_value_sum (err, vin_value_sum) {
                        logger.silly({functionname: 'ship_input_value_sum', vin_value_sum: vin_value_sum})
                        callback(null, vin_value_sum)
                    }
                )
            }
        },
        vin_count: function vin_count (callback) {
            logger.silly({functionname:'vin_count', rawtransaction: rawtransaction})
            callback(null, rawtransaction.vin.length)
        },
    },
    function(err, results){
        handleError
        logger.silly({functionname: 'ship_signature', results: results})
        callback(results)
    })
}
module.exports.rawTransactionToTransactionSignature = rawTransactionToTransactionSignature

