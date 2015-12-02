group_by(.txid)
| map({
    "txid": .[0].txid ,
    "blockhash": .[0].blockhash,
    "vout_value": [ .[].vout[].value ] | add,
    "vin_value": select( .[].inputDetail ) | [.[].inputDetail[].value] | add
})
| group_by(.blockhash)
| map({
    "blockhash": .[0].blockhash,
    "vout_value": [ .[].vout_value ] | add,
    "vin_value": [ .[].vin_value ] | add,
})
| map({
    "blockhash": .blockhash,
    "vout_value": .vout_value,
    "vin_value": .vin_value,
    "mining_fee": (.vin_value - .vout_value)
})