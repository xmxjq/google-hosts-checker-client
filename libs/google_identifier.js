let Promise = require('bluebird');
let co = require('co');
let _ = require('lodash');
let fs = require('mz/fs');
let path = require('path');
let yargs = require('yargs');
let util = require('util');
let request = require('request');
let rp = require('request-promise');
let ip = require('ip');
let cidrRange = require('cidr-range');

let argv = yargs.argv;

class GoogleIdentifier {
    constructor() {
        this.availableIps = {};
        this.ipRanges = [];
    }

    loadIpRanges(filePath) {
        let self = this;
        return co(function *() {
            let ipRangeContent = yield fs.readFile(filePath, 'utf8');
            self.ipRanges = ipRangeContent.split("\n");
            console.log(self.ipRanges);
        });
    }

    checkAllIpRanges() {
        let self = this;
        return co(function *() {
            for (let ipRange of self.ipRanges) {
                console.log(ipRange);
                let allIps = [];
                try {
                    allIps = cidrRange(ipRange);
                }
                catch (err) {
                    allIps = [ipRange];
                }
                for (let singleIp of allIps) {
                    let checkResult = yield self.checkGoogleIpAvailability(singleIp);
                    if (checkResult) {
                        self.availableIps[singleIp] = true;
                    }
                    else {
                        if (_.has(self.availableIps, singleIp)) {
                            delete self.availableIps[singleIp];
                        }
                    }
                }
            }
        });
    }

    checkGoogleIpAvailability(ip) {
        return co(function *() {
            console.log("Checking " + ip);         
            let url = "https://" + ip + "/search?hl=en&num=100&start=0&q=china&nord=1";           

            let options = {
                url: url,
                followRedirect: false,
                headers: {
                    'Host': 'www.google.com.hk',
                    'User-agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/47.0.2526.80 Safari/537.36'
                },
                timeout: 5000
            };

            yield rp(options)
            .then(function (htmlResponse) {
                if (htmlResponse.indexOf("Google Search") >= 0) {
                    console.log(util.format("%s Google Search Found", ip));
                    return true;
                }
                else if (htmlResponse.indexOf("/sorry/") >= 0) {
                    console.log(util.format("%s /sorry/ Found", ip));
                    return true;
                }
                else {
                    console.log(util.format("Ip %s is blocked", ip));
                    return false;
                }
            })
            .catch(function (err) {
                let message = err.message;
                if (message.indexOf("/sorry/") >= 0) {
                    console.log(util.format("%s /sorry/ Found", ip));
                    return true;
                }
                else {
                    console.log(util.format("Ip %s meet error %s", ip, err.message));
                    return false;
                }
            });
        })
        .catch(function (err) {
            console.log(util.format("Ip %s meet error %s", ip, err.message));
            return false;
        });
    }

    writeAvailableIpsToFile(filePath) {
        var self = this;
        return co(function *() {
            let writeResult = yield fs.writeFile(filePath, JSON.stringify(self.availableIps), 'utf8');
        });
    }
}

exports = module.exports = GoogleIdentifier;