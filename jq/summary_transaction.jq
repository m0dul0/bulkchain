group_by(.txid)
| map({
    "txid": .[0].txid ,
    "blockhash": .[0].blockhash,
    "vout_value": [ .[].vout[].value ] | add,
    "vin_value": select( .[].inputDetail ) | [.[].inputDetail[].value] | add
})
