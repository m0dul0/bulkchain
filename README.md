# bulkchain
node based utilities for systems integration

## installation
####start your bitcoind
    bitcoind --daemon [--txindex]  
####install bulkchain
    git clone https://github.com/m0dul0/bulkchain.git  
    cd bulkchain  
    npm install  
####configure options.js
    cp ./config/options.js.example ./config/options.js  
####test
    npm test  
## usage
###library
    var bulkchain = require(process.cwd() + '/lib/bulkchain.js')  
(plenty of library examples in the test suite [bulkchain-test.js](https://github.com/m0dul0/bulkchain/blob/master/test/bulkchain-test.js))  
###bulkchain-cli
####OSX
    ./bulkchain-cli.js datetoblockcount --targetdate `date -j -f %Y%m%d%H%M%S 20150701000000 +%s`  
    ./bulkchain-cli.js datetoblockhash --startdate `date -j -f %Y%m%d%H%M%S 20150701000000 +%s` --enddate `date -j -f %Y%m%d%H%M%S 20150702000000 +%s`
    ./bulkchain-cli.js datetotransactionsignature --startdate `date -j -f %Y%m%d%H%M%S 20150701000000 +%s` --enddate `date -j -f %Y%m%d%H%M%S 20150702000000 +%s`
####linux
    ./bulkchain-cli.js datetoblockcount --targetdate `date --date "2015-07-02 00:00:00" +%s`
    ./bulkchain-cli.js datetoblockhash --startdate `date --date "2015-07-01 00:00:00" +%s` --enddate `date --date "2015-07-02 00:00:00" +%s`
    ./bulkchain-cli.js datetotransactionsignature --startdate `date --date "2015-07-01 00:00:00" +%s` --enddate `date --date "2015-07-02 00:00:00" +%s`
