let Promise = require('bluebird');
let co = require('co');
let _ = require('lodash');
let fs = require('mz/fs');
let path = require('path');
let yargs = require('yargs');
let util = require('util');
let later = require('later');
let config = require('config');

let clientId = config.get("clientConfig.clientId");

console.log(clientId);

let argv = yargs.argv;

let GoogleIdentifier = require('./libs/google_identifier');

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

let newIdentifier = new GoogleIdentifier();

var sched = {};
later.date.localTime();

var outputSched = later.parse.text(config.get("clientConfig.outputCron"));
sched.timeoutScanTimer = later.setInterval(function () {
    return newIdentifier.writeAvailableIpsToFile("temp_result.output")
}, outputSched);

co(function *() {
    yield newIdentifier.loadIpRanges('./ip_range.conf');
    while (true) {
        console.log("Start a new round of scan");
        yield newIdentifier.checkAllIpRanges();
    }
})
.catch(function (e) {
    console.log(util.inspect(e));
});
