let Promise = require('bluebird');
let co = require('co');
let _ = require('lodash');
let fs = require('mz/fs');
let path = require('path');
let yargs = require('yargs');
let util = require('util');
let request = require('request');
let rp = require('request-promise');
let later = require('later');
let config = require('config');

let clientId = config.get("clientConfig.clientId");

console.log(clientId);

let argv = yargs.argv;

let GoogleIdentifier = require('./libs/google_identifier');

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

let newIdentifier = new GoogleIdentifier();

let sched = {};
later.date.localTime();

let outputSched = later.parse.text(config.get("clientConfig.outputCron"));
sched.timeoutScanTimer = later.setInterval(function () {
    return newIdentifier.writeAvailableIpsToFile("temp_result.output")
}, outputSched);

let submitSched = later.parse.text(config.get("clientConfig.submitCron"));
sched.submitTimer = later.setInterval(function () {
    let availableIpArray = _.keys(newIdentifier.availableIps);
    let serverBaseUrl = config.get("serverConfig.serverBaseUrl");
    let submitUrl = util.format("%s/submit_ip_array", serverBaseUrl);
    let options = {
        url: submitUrl,
        method: 'POST',
        json: {
            "id": clientId,
            "ip_array": availableIpArray
        }
    };
    rp(options);
}, submitSched);

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

function exitHandler(options, err) {
    return co(function *() {
        console.log("Entering exitHandler");
        let serverBaseUrl = config.get("serverConfig.serverBaseUrl");
        let submitUrl = util.format("%s/delete_ip_array", serverBaseUrl);
        let rpOptions = {
            url: submitUrl,
            method: 'POST',
            json: {
                "id": clientId
            }
        };
        yield rp(rpOptions);

        if (options.cleanup) {
            console.log('clean');
        }
        if (err) {
            console.log(err.stack);
        }
        if (options.exit) {
            process.exit();
        }
    })
    .catch(function (err) {
        console.log(err.message);
        console.log(err.stack);
        process.exit();
    })
}

//do something when app is closing
process.on('exit', exitHandler.bind(null,{cleanup:true}));

//catches ctrl+c event
process.on('SIGINT', exitHandler.bind(null, {exit:true}));

//catches uncaught exceptions
process.on('uncaughtException', exitHandler.bind(null, {exit:true}));
