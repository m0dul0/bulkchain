#!/usr/bin/env node

'use strict';

var yargs = require('yargs');
var bulkchain = require(process.cwd() + '/lib/bulkchain.js');
var Promise = require('bluebird'); // jshint ignore:line

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
        .argv;
      })
      .command('datetoblockhash', 'get block hashes between startdate and enddate', function (yargs) {
          argv = yargs.options({
          startdate: {
              description: "date in unixtime (+%s)\nexamples:\n`date +%s`\n`date -j -f %Y%m%d%H%M%S 20150701000000 +%s`", 
              requiresArg: true,
              },
          enddate: {
              description: "date in unixtime (+%s)\nexamples:\n`date +%s`\n`date -j -f %Y%m%d%H%M%S 20150702000000 +%s`", 
              requiresArg: true,
              }
          })
          .demand('startdate', 'enddate')
          .example('$0 datetoblockhash --startdate `date -j -f %Y%m%d%H%M%S 20150701000000 +%s` --enddate `date -j -f %Y%m%d%H%M%S 20150702000000 +%s`', 'get all blockhashes on July 1 local timezone')
          .help('help')
          .argv;
        })
      
      .command('datetotransactionsignature', 'get transaction level signatures between startdate and enddate', function (yargs) {
          argv = yargs.options({
              startdate: {
                  description: "date in unixtime (+%s)\nexamples:\n`date +%s`\n`date -j -f %Y%m%d%H%M%S 20150701000000 +%s`", 
                               requiresArg: true,
              },
              enddate: {
                  description: "date in unixtime (+%s)\nexamples:\n`date +%s`\n`date -j -f %Y%m%d%H%M%S 20150702000000 +%s`", 
                               requiresArg: true,
              }
          })
          .demand('startdate', 'enddate')
          .example('$0 datetotransactionsignature --startdate `date -j -f %Y%m%d%H%M%S 20150701000000 +%s` --enddate `date -j -f %Y%m%d%H%M%S 20150702000000 +%s`', 'get all blockhashes on July 1 local timezone')
          .help('help')
          .argv;
      })
      
    .demand(1)
    .help('help').alias('help', 'h')
    .version('1.0.0', 'version').alias('version', 'V')
    .epilog('Help on commands:\nm0dul0: ./bulkchain-cli.js --help <command>')
    .argv;

var shipOutput = function logToConsole (err, console_output) {
    console.log(JSON.stringify(console_output));
};

if (argv._[0] === 'datetoblockcount') {
    bulkchain.dateToBlockCount(argv.targetdate, shipOutput);
}

if (argv._[0] === 'datetoblockhash') {
    bulkchain.dateRangeToBlockHash(argv.startdate, argv.enddate, function (blockhashlist) {
        console.log(JSON.stringify(blockhashlist));
    });
}

if (argv._[0] === 'datetotransactionsignature') {
    let starttime = argv.startdate; // 368590 Wed Aug  5 18:49:13 PDT 2015
    let endtime =   argv.enddate;  //368596 Wed Aug  5 20:16:32 PDT 2015
    var consolelogger = function(textoutput) { console.log(textoutput) };
    Promise.join(starttime, endtime, consolelogger, bulkchain.dateRangeToTransactionSignature( starttime, endtime, consolelogger));
}
