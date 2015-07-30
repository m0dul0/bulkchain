var async = require('async')
var bitcoin = require('bitcoin')
var config = require(__dirname + '/../config/options.js');

var client = new bitcoin.Client({
  host: config.bitcoind_host,
  user: config.bitcoind_rpc_user,
  pass: config.bitcoind_rpc_pass,
  timeout: 30000
});

var blockhash_to_block = function blockhash_to_block( blockhash, callback) {
    client.getBlock( blockhash, function client_getblock(err, block) {
        callback(null, block)
    })
}

var blockcount_to_blockhash = function blockcount_to_blockhash( blockcount, callback) {
    client.getBlockHash( blockcount, function client_blockcount_to_blockhash(err, blockhash) {
        callback(null, blockhash)
    })
}

var getblockcount = function getblockcount( callback ) {
    client.getBlockCount( function client_getblockcount (err, blockcount) {
        setTimeout(callback(null, blockcount), 0)
    })
}

var blockcount_to_blocktime = function blockcount_to_blocktime( blockcount, callback) {
    blockcount_to_blockhash(blockcount, function blockcount_to_blockhash(err, blockhash) {
        blockhash_to_block(blockhash, function blockhash_to_block(err, block) {
            setTimeout(callback(err, block.time), 0)
        })
    })
}

var latestblocktime = async.compose(blockcount_to_blocktime, getblockcount)

module.exports = date_to_blockcount = function date_to_blockcount( unixtime, callback) {
    async.series(
        {
            latestblocktime: latestblocktime,
            latestblockcount: getblockcount
        }
        , function search_for_blockcount(err, startingpoint) {
            guess = {}
            if (unixtime >= startingpoint.latestblocktime) {
                guess.blockcount = startingpoint.latestblockcount
                guess.date = startingpoint.latestblocktime
                //console.log(guess)
                callback(guess)
            }
            else
            {
                var low = 1
                var high = startingpoint.latestblockcount
                async.whilst(
                    function check_if_done() {
                        return low < high - 1
                    },
                    function bifurcate(callback) {
                        halfdistance = parseInt(( high - low ) / 2)
                        midpoint = halfdistance + low
                        blockcount_to_blocktime( parseInt(low + ((high - low) / 2)),
                            function drop_half(err, blocktime) {
                                if (blocktime > unixtime) {
                                    high = parseInt(low + ((high - low) / 2))
                                    setTimeout(callback, 0)
                                }
                                else{
                                    low = parseInt(low + ((high - low) / 2))
                                    setTimeout(callback, 0)
                                }
                            }
                        )
                    },
                    function bullseye_blockcount(err, guess) {
                        blockcount_to_blocktime( parseInt(low) ,
                            function ship_guarded_result(err, blocktime) {
                            if (blocktime <= unixtime) {
                            //console.log({blockcount: low, date: blocktime })
                                callback({blockcount: low, date: blocktime })
                            }
                        })
                    }
                )
            }
        }
    )
}