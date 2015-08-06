# bulkchain
node based utilities for systems integration

### installation:
####start your bitcoind:
```
    bitcoind --daemon [--txindex]  
```

####install bulkchain:
```
    git clone https://github.com/m0dul0/bulkchain.git  
    cd bulkchain  
    npm install  
```  
####configure options.js:
```
    cp ./config/options.js.example ./config/options.js
```  
####behold your bounty:
```  
    npm test  
```
### usage:
####library:
```
    var bulkchain = require(process.cwd() + '/lib/bulkchain.js')
```  
appeal to bulkchain-test.js for examples.  

