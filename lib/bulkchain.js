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
  timeout: 30000
})
/** get earliest blockcount after a given date
 * @function getBlockCount
 * @type {number}
 * @param {number} time - block.time
 * @param {getBlockCount~cbBlockTime} cbBlockTime - block.time
*/

/** eponymous passthrough to node-bitcoin
 * @function getBlockHash
 * @type {string}
 * @param {number} blockcount - block.height
 * @param {getBlockHash~cbBlockHash} cbBlockHash - block.hash
*/
module.exports.getBlockHash = function (blockcount, callback) {
    client.getBlockHash (blockcount, cbBlockHash)
    function cbBlockHash(err, blockhash) {
        if(err){
            logger.error(err)
        }
        else {
            logger.debug("getBlockHash - blockhash: ", blockhash)
            callback(blockhash)
        }
    }
}
/**
 * This callback is displayed as part of the getBlockHash class.
 * @callback getBlockHash~cbBlockHash
 * @param {string} blockhash
 */

/** eponymous passthrough to node-bitcoin
 * @function getBlock
 * @type {json}
 * @param {string} blockhash - block.hash
 * @param {getBlock~cbBlock} cbBlock - block
*/
module.exports.getBlock = function ( blockhash, callback) {
    client.getBlock( blockhash, cbBlock )
    function cbBlock(err, block) {
        if(err){
            logger.error(err)
        }
        else {
            logger.debug("getBlock - blockhash: ", block.hash)
            callback(block)
        }
    }
}
/**
 * This callback is displayed as part of the getBlock class.
 * @callback getBlock~cbBlock
 * @param {string} blockhash
*/

/** get block time from blockhash
 * @function getBlockTime
 * @type {number}
 * @param {string} blockhash - hash of block at given index
 * @param {getBlockTime~cbBlockTime} cbBlockTime - block.time
*/
module.exports.getBlockTime = function (blockhash, callback) {
    logger.debug("getBlockTime - blockhash: ", blockhash)
    this.getBlock(blockhash, cbBlockTime)
    function cbBlockTime(block){
        logger.debug("getBlockTime - block.time: ", block.time)
        callback(block.time)
    }
}
/**
 * This callback is displayed as part of the getBlockTime class.
 * @callback getBlockTime~cbBlockTime
 * @param {json} block
 */

/** eponymous passthrough to node-bitcoin
 * @function getBlockCount
 * @type {number}
 * @param {getBlockCount~cbBlockCount} cbBlockCount - block.height
*/
module.exports.getBlockCount = function (callback) {
    client.getBlockCount( cbBlockCount )
    function cbBlockCount(err, blockcount) {
        if(err){
            logger.error(err)
        }
        else {
            logger.debug("getBlockCount - blockcount: ", blockcount)
            callback(blockcount)
        }
    }
}
/**
 * This callback is displayed as part of the getBlockCount class.
 * @callback getBlockCount~cbBlockCount
 * @param {number} blockcount
 */

/** for a given unix time, return very next blockcount
 * @function dateToBlockCount
 * @type {number}
 * @param {number} time - block.time
 * @param {getBlockCount~cbBlockCount} cbBlockCount - block.height
*/
module.exports.dateToBlockCount = function ( time, callback) {
    async.series(
        {
            latestblockcount: function ( callback ) {
                client.getBlockCount( function (err, blockcount) {
                    setTimeout(callback(null, blockcount), 0)
                })
            },
            latestblocktime: function ( callback ) {
                client.getBlockCount( function (err, blockcount) {
                    if (err) {logger.error(err)}
                    else {
                        logger.log('dateToBlockCount - blockcount', blockcount)
                        client.getBlockHash(blockcount, function (err, blockhash) {
                            if(err) {logger.error(err)}
                            else {
                                logger.log('dateToBlockCount - blockhash', blockhash)
                                client.getBlock(blockhash, function (err, block) {
                                    if(err) {logger.error(err)}
                                    else {
                                        logger.log('dateToBlockCount - block.time', block.time)
                                        setTimeout(callback(null, block.time), 0)
                                    }
                                })
                            }
                        })
                    }
                })
            }
        }
        , function search_for_blockcount(err, startingpoint) {
            logger.debug('dateToBlockCount - startingpoint: ', startingpoint)
            var guess = {}
            if (time >= startingpoint.latestblocktime) {
                guess.blockcount = startingpoint.latestblockcount
                guess.date = startingpoint.latestblocktime
                logger.debug(guess)
                callback(guess)
            }
            else
            {
                var low = 1
                var high = startingpoint.latestblockcount
                async.whilst(
                    function check_if_done() {
                        logger.debug({low: low, high: high})
                        return low < high -1
                    },
                    function bifurcate(callback) {
                        var halfdistance = parseInt(( high - low ) / 2)
                        var midpoint = halfdistance + low
                        client.getBlockHash((parseInt(( high - low ) / 2) + low), function (err, blockhash) {
                            if(err) {logger.error(err)}
                            else {
                                logger.debug('dateToBlockCount', {high: high, low: low, blockhash: blockhash})
                                client.getBlock(blockhash, function (err, block) {
                                    if(err) {logger.error(err)}
                                    else {
                                        logger.debug('dateToBlockCount', {target: time, blocktime: block.time, blockheight: block.height})
                                        if (block.time > time) {
                                            high = parseInt(low + ((high - low) / 2))
                                            setTimeout(callback, 0)
                                        }
                                        else{
                                            low = parseInt(low + ((high - low) / 2))
                                            setTimeout(callback, 0)
                                        }
                                    }
                                })
                            }
                        })
                    },
                    function bullseye_blockcount(guess) {
                        logger.debug(guess)
                        client.getBlockHash(parseInt(low), function (err, blockhash) {
                            if(err) {logger.error(err)}
                            else {
                                logger.debug('dateToBlockCount bullseye - blockhash', blockhash)
                                client.getBlock(blockhash, function (err, block) {
                                    if(err) {logger.error(err)}
                                    else {
                                        logger.debug('dateToBlockCount bullseye - block.time', {low: low, high: high, difference: block.time - time, target: time, blocktime: block.time, blockheight: block.height})
                                        if (block.time < low) {
                                            setTimeout(callback(null, low), 0)
                                        }
                                        else{
                                            setTimeout(callback(null, high), 0)
                                        }
                                    }
                                })
                            }
                        })
                    }
                )
            }
       }
    )
}