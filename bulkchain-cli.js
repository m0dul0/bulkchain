#!/usr/bin/env node

'use strict';

var yargs = require('yargs');
var bulkchain = require(process.cwd() + '/lib/bulkchain.js')

var argv = yargs
    .usage('\nUsage: $0 <command> [options]')
    .command('datetoblockcount', 'get blockcount immediately after given date', function (yargs) {
        argv = yargs.options({
        targetdate: {
            description: "date in unixtime (+%s)\nexamples:\n`date +%s`\n`date -j -f %Y%m%d%H%M%S 20150701000000 +%s`", 
            requiresArg: true,
            }
        })
        .demand('targetdate')
        .example('$0 datetoblockcount --targetdate `date -j -f %Y%m%d%H%M%S 20150701000000 +%s`', 'get blockcount on July 1 local timezone')
        .help('help')
        .argv
      })
      .command('datetoblockhash', 'get block hashes between startdate and enddate', function (yargs) {
          argv = yargs.options({
          startdate: {
              description: "date in unixtime (+%s)\nexamples:\n`date +%s`\n`date -j -f %Y%m%d%H%M%S 20150701000000 +%s`", 
              requiresArg: true,
              }
          ,enddate: {
              description: "date in unixtime (+%s)\nexamples:\n`date +%s`\n`date -j -f %Y%m%d%H%M%S 20150702000000 +%s`", 
              requiresArg: true,
              }
          })
          .demand('startdate', 'enddate')
          .example('$0 datetoblockhash --startdate `date -j -f %Y%m%d%H%M%S 20150701000000 +%s` --enddate `date -j -f %Y%m%d%H%M%S 20150702000000 +%s`', 'get all blockhashes on July 1 local timezone')
          .help('help')
          .argv
        })
      
      .command('datetotransactionsignature', 'get transaction level signatures between startdate and enddate', function (yargs) {
          argv = yargs.options({
              startdate: {
                  description: "date in unixtime (+%s)\nexamples:\n`date +%s`\n`date -j -f %Y%m%d%H%M%S 20150701000000 +%s`", 
                               requiresArg: true,
              }
              ,enddate: {
                  description: "date in unixtime (+%s)\nexamples:\n`date +%s`\n`date -j -f %Y%m%d%H%M%S 20150702000000 +%s`", 
                               requiresArg: true,
              }
          })
          .demand('startdate', 'enddate')
          .example('$0 dateRangeToTransactionSignature --startdate `date -j -f %Y%m%d%H%M%S 20150701000000 +%s` --enddate `date -j -f %Y%m%d%H%M%S 20150702000000 +%s`', 'get all blockhashes on July 1 local timezone')
          .help('help')
          .argv
      })
      
    .demand(1)
    .help('help').alias('help', 'h')
    .version('1.0.0', 'version').alias('version', 'V')
    .epilog('Help on commands:\nm0dul0: ./bulkchain-cli.js --help <command>')
    .argv;
var config = require(__dirname + '/config/options.js');

//console.dir(argv._)

var shipOutput = function logToConsole (err, console_output) {
    console.log(JSON.stringify(console_output))
}

if (argv._[0] === 'datetoblockcount') {
    bulkchain.dateToBlockCount(argv.targetdate, shipOutput)
}

if (argv._[0] === 'datetoblockhash') {
    bulkchain.dateRangeToBlockHash(argv.startdate, argv.enddate, function (blockhashlist) {
        console.log(JSON.stringify(blockhashlist))
    })
}

if (argv._[0] === 'datetotransactionsignature') {
    bulkchain.dateRangeToTransactionSignature(argv.startdate, argv.enddate, function (transactionSignatureArr) {
        console.log(JSON.stringify(transactionSignatureArr))
    })
}