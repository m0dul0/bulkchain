
'use strict'

/**
 * bulkchain
 * @module bulkchain
 */

var config = require(__dirname + '/../config/options.js')
var bitcoin = require('bitcoin')
var logger = require('winston')
var async = require('async')

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
    logger.debug({functionname: 'getBlockCount'})
    client.getBlockCount( cb_clientGetBlockCount )
    function cb_clientGetBlockCount(err, blockcount) {
        handleError
        logger.debug({functionname: 'cb_clientGetBlockCount', 'blockcount':blockcount})
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
    logger.debug({functionname: 'blockCountToBlockHash', blockcount:blockcount})
    client.getBlockHash( blockcount, cb_blockCountToBlockHash )
    function cb_blockCountToBlockHash(err, blockhash) {
        handleError
        logger.debug({functionname: 'cb_blockCountToBlockHash', blockhash:blockhash})
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
    logger.debug({functionname: 'blockHashToBlockHeader', 'blockhash': blockhash})
    client.getBlock( blockhash, cb_blockHeader )
    function cb_blockHeader (err, blockheader) {
        handleError
        logger.debug({functionname: 'cbBlockHeader', 'blockheader': blockheader.hash})
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
    logger.debug({functionname:'blockCountToTime'})
    blockCountToBlockHash(blockcount, cb_blockCountToBlockHash)
    function cb_blockCountToBlockHash(err, blockhash) {
        handleError
        logger.debug({functionname: 'cb_blockCountToBlockHash', blockhash: blockhash})
        blockHashToBlockHeader(blockhash, cb_blockHashToBlockHeader)
        function cb_blockHashToBlockHeader(err, blockheader) {
            handleError
            logger.debug({functionname: 'cb_blockHashToBlockHeader', blockheader: blockheader.hash})
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
    logger.debug({functionname:'latestBlockTime'})
    getBlockCount(cb_getBlockCount)
    function cb_getBlockCount(err, blockcount) {
        handleError
        logger.debug({functionname: 'cb_getBlockCount', blockcount: blockcount})
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
    logger.debug({functionname:'dateToBlockCount'})
    async.series(
        {
            latestblockcount: getBlockCount,
            latestblocktime: latestBlockTime
        }
        , function search_for_blockcount(err, startingpoint) {
        logger.debug({functionname: 'search_for_blockcount', startingpoint: startingpoint})
            var low = 1
            var high = startingpoint.latestblockcount
            async.whilst(
                function check_if_done() {
                    logger.debug({low: low, high: high})
                    return low < high -1
                },
                function bifurcate(callback) {
                    logger.debug('bifurcate', {high: high, low: low, targettime: targettime})
                    var midpoint = parseInt(( high - low ) / 2) + low
                    blockCountToTime(midpoint, cb_blockCountToTime)
                    function cb_blockCountToTime ( err, time ) {
                        handleError
                        logger.debug('cb_blockCountToTime', {target: targettime, time: time})
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
                    logger.debug( { functionname: 'bullseye_blockcount' } )
                    blockCountToTime(low, cb_blockcountToTime)
                    function cb_blockcountToTime (err, time) {
                        handleError
                        logger.debug({functionname: 'cb_blockcountToTime', time: time})
                        
                        // below target time is from the user,  time is the block.time we found
                        if (targettime < time) {
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