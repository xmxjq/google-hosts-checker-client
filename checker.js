let Promise = require('bluebird');
let co = require('co');
let _ = require('lodash');
let fs = require('mz/fs');
let path = require('path');
let yargs = require('yargs');
let util = require('util');
let later = require('later');
var config = require('config');

let clientId = config.get("clientConfig.clientId");

console.log(clientId);

let argv = yargs.argv;

let GoogleIdentifier = require('./libs/google_identifier');

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

let newIdentifier = new GoogleIdentifier();

var sched = {};

later.date.localTime();

var refreshSched = later.parse.text('every 1 minutes');
sched.timeoutScanTimer = later.setInterval(function () {
    return newIdentifier.writeAvailableIpsToFile("temp_result.output")
}, refreshSched);

co(function *() {
    yield newIdentifier.loadIpRanges('./ip_range.conf');
    yield newIdentifier.checkAllIpRanges();
})
.catch(function (e) {
    console.log(util.inspect(e));
});
