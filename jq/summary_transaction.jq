group_by(.txid)
| map({
    "txid": .[0].txid ,
    "blockhash": .[0].blockhash,
    "vout_value": [ .[].vout[].value ] | add,
    "vin_value": select( .[].inputDetail ) | [.[].inputDetail[].value] | add
}

)
# , "value": [vout[].value]})
# [
# vout_value: .vout[].value | add
# ]
# {
#     "txid": .txid
#     "vout_value": .vout[].value | add
# }
# {
#     "bitcoin_vin": {
#         value: .inputDetail[].value,
#         n: .inputDetail[].n,
#         vin_txid: .inputDetail[].vin_txid,
#         destroy_start: .inputDetail[].destroy_start,
#     }
# }
# |
# | map({
#        key: .[0].vin_txid,
#        value: map(.value) | add
#    })
# | from_entries


    #"txid": .txid,
    # "blockhash": .blockhash,
    # "vout": [{value: .vout[].value}],
    # "bitcoin_vin": {
    #     value: .inputDetail[].value,
    #     n: .inputDetail[].n,
    #     vin_txid: .inputDetail[].vin_txid,
    #     destroy_start: .inputDetail[].destroy_start,

        # "scriptPubKey": {
        #   "asm": "OP_DUP OP_HASH160 39413369ebcd814d6ee113322be7062ee1fa2048 OP_EQUALVERIFY OP_CHECKSIG",
        #   "hex": "76a91439413369ebcd814d6ee113322be7062ee1fa204888ac",
        #   "reqSigs": 1,
        #   "type": "pubkeyhash",
        #   "addresses": [
        #     "16DjdAjNebZ1YUW337wDSFrDvNotxnDqGY"]
        # }],
       # } ,

# #     # , "block_count": map(.blockhash) | unique | length,
# #     # , "transaction_count": map(.txid) | unique | length
# #     # , "inputtransaction_count": map(.vin_txid) | unique | length
# #     # , "input_count": . | length
# #     # , "min_time": min .time
# #     # ,
# #     # "max_time": max .time
# #     # , "days_destroyed": map(.days_destroyed / 100000000 ) | add
# 
# |
# {
#     "vin": map(.vin) | add
# }

# {
#     "blockhash": map(.blockhash) | unique
#     # , "time": .time
#     # , "blocktime": .blocktime
#     # , "txid": .txid
#     # , "vout_count": .vout[] | length
#     #,
#     # "vinDetail": .vinDetail[].value
# }
# |
# {
#     "blockhash": .blockhash
#     , "time": .time
#     , "blocktime": .blocktime
#     , "txid": .txid
#     , "vout_count": .vout_count
#     , "coinbase": .vin.coinbase
#     , "vin_txid": .vin.txid
#     , "vin_vout": .vin.vout
#     , "sequence": .vin.sequence
#     , "hex": .vin.scriptSig.hex
# }

