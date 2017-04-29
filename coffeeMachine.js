'use strict';

const net = require('net');
const http = require('http');
const url = require('url');
const Smarter = require('./smarter.js');
const winston = require('winston');

function scheduleCallback(subscriptions, payload) {

    const now = Date.now();
    const schedule = sub => setTimeout(() => doCallback(sub, payload), 0);
    for (let subscription of subscriptions.values()) {
        if (subscription.expiry >= now) {
            winston.info('Scheduling callback for subscription %s', subscription.subscriptionId);
            schedule(subscription);
        }
    }
}

function doCallback(subscription, payload) {
    winston.info('Executing callback for subscription %s', subscription.subscriptionId);

    const uri = url.parse(subscription.callbackUrl);

    const options = {
        "host": uri.hostname,
        "port": uri.port,
        "path": uri.path,
        "method": "POST",
        "headers": { 
            "SID" : subscription.subscriptionId,
            "Content-Type" : "application/json",
        }
    };

    const body = JSON.stringify(payload);
    const request = http.request(options, res => {
        winston.info('Callback to subscription %s status code %s', subscription.subscriptionId, res.statusCode);
    });

    request.on('error', (e) => {
        winston.info('Callback to subscription %s failed with error %s', subscription.subscriptionId, e);
    });

    request.end(body);        
}


class CoffeeMachine
{
    constructor(mac, ip) {
        this.id = CoffeeMachine.idFromMac(mac);
        this.mac = mac;
        this.ip = ip;
        this.name = "Coffee Machine";
        this.status = null;
        this.isConnected = false;
        this.subscriptions = new Map();
    }

    updateIp(ip) {
        if (this.ip === ip) return;

        winston.info('IP address has changed for machine %s to %s', this.id, this.ip, ip);
        
        this.ip = ip;
        this.disconnect();
        setTimeout(() => this.connect(), 5000);
    }

    connect() {
        if (this.isConnected) return;

        winston.info('Connecting to machine %s', this.ip);
        this.client = net.createConnection({ port:Smarter.port, host:this.ip });

        this.client.on('lookup', (err, address, family, host) => {
            winston.warning('Lookup %s %s %s %s', err, address, family, host);
            // TODO
        });

        this.client.on('connect', () => {
            winston.info('Connected to machine %s', this.ip);
            this.isConnected = true;
        });

        this.client.on('error', (error) => {
            winston.error('Error in stream from machine %s, %s', this.ip, error);
            // TODO
        });

        this.client.on('timeout', () => {
            winston.warning('Timeout');
            // TODO
        });

        this.client.on('end', () => {
            this.isConnected = false;
            winston.info('Disconnected from machine %s', this.ip);
         });

        this.client.on('data', (data) => {

            if (!data || data.length === 0)
                return;

            if (data[0] === Smarter.acknowledgementReplyByte)
            {
                winston.info('Received acknowledgement message from machine %s - %s', this.ip, data.join(','));

                if (data[1] === Smarter.acknowledgementSuccessByte) {
                    // do nothing
                }
                if (data[1] === Smarter.acknowledgementNoCarafeByte) {
 
                    winston.info('Preparing error subscription callbacks');
                    const payload = { id: this.id, error: 'No carafe' };
                    scheduleCallback(this.subscriptions, payload);
                }
            }
            
            else if (data[0] === Smarter.statusReplyByte)
            {
                winston.info('Received status message from machine %s - %s', this.ip, data.join(','));

                // not sure what isReady is... don't think it's "machine is ready to brew"
                // it might be "your coffee is ready" as it doesn't stay set that long
                // this.isReady = (data[1] & 4) >= 1;
                // not useful
                // this.isCycleComplete = (data[1] & 32) >= 1;

                // combine these two properties into something more useful
                const isGrindInProgress = (data[1] & 8) >= 1;
                const isWaterPumpInProgress = (data[1] & 16) >= 1;

                const oldstatus = this.status;

                this.status = {
                    isBrewing : isGrindInProgress || isWaterPumpInProgress,
                    isCarafeDetected : (data[1] & 1) >= 1,
                    isGrind : (data[1] & 2) >= 1,
                    isHotplateOn : (data[1] & 64) >= 1,
                    waterLevel : (data[2] & 15),
                    strength : (data[4] & 3),
                    cups : (data[5] & 15)
                 };

                if (oldstatus !== null &&
                    oldstatus.isBrewing === this.status.isBrewing &&
                    oldstatus.isCarafeDetected === this.status.isCarafeDetected &&
                    oldstatus.isGrind === this.status.isGrind &&
                    oldstatus.isHotplateOn === this.status.isHotplateOn &&
                    oldstatus.waterLevel === this.status.waterLevel &&
                    oldstatus.strength === this.status.strength &&
                    oldstatus.cups === this.status.cups)
                    return;

                winston.info('Status has changed, preparing status subscription callbacks');

                const payload = { id: this.id, status: this.status };

                scheduleCallback(this.subscriptions, payload);
            }
        });
    }

    disconnect() {
        if (!this.isConnected) return;

        winston.info('Disconnecting from machine %s', this.ip);
        this.client.end();
        this.isConnected = false;
    }

    setStrength(strength, callback) {

        const strengthAsInt = parseInt(strength);
        if (isNaN(strengthAsInt) || strengthAsInt < 0 || strengthAsInt > 2) {
            return callback("'strength' must be 0 (weak), 1 (medium), or 2 (strong)");
        }

        winston.info('Setting strength to %s', strengthAsInt);
        const command = new Buffer([Smarter.strengthRequestByte, strengthAsInt, Smarter.messageTerminator]);
        this.sendCommand(command, callback);
    }

    setCups(cups, callback) {

        const cupsAsInt = parseInt(cups);
        if (isNaN(cupsAsInt) || cupsAsInt < 1 || cupsAsInt > 12) {
            return callback("'cups' must be a number between 1 to 12 inclusive");
        }

        winston.info('Setting cups to %s', cupsAsInt);
        const command = new Buffer([Smarter.cupsRequestByte, cupsAsInt, Smarter.messageTerminator]);
        this.sendCommand(command, callback);
    }

    setGrind(isGrind, callback) {

        if (isGrind !== true && isGrind !== false) {
            return callback("'isGrind' must be true (on) or false (off)");
        }

        if (this.status.isGrind === isGrind) {
             return callback();
        }

        winston.info('Setting grind to %s', isGrind);

        const command = new Buffer([Smarter.toggleGrindRequestByte, Smarter.messageTerminator]);
        this.sendCommand(command, callback);
    }

    brewOn(isGrind, cups, strength, callback) {

        if (isGrind !== true && isGrind !== false) {
            return callback("'isGrind' must be true (on) or false (off)");
        }
        const isGrindAsInt = isGrind ? 1 : 0;

        const cupsAsInt = parseInt(cups);
        if (isNaN(cupsAsInt) || cupsAsInt < 1 || cupsAsInt > 12) {
            return callback("'cups' must be a number between 1 to 12 inclusive");
        }

        const strengthAsInt = parseInt(strength);
        if (isNaN(strengthAsInt) || strengthAsInt < 0 || strengthAsInt > 2) {
            return callback("'strength' must be 0 (weak), 1 (medium), or 2 (strong)");
        }

        winston.info('Brewing coffee with grind %s, cups %s, strength %s', isGrindAsInt, cupsAsInt, strengthAsInt);
        const command = new Buffer([Smarter.brewOnRequestByte, cupsAsInt, strengthAsInt, 0x5 /*unknown*/, isGrindAsInt, Smarter.messageTerminator]);
        this.sendCommand(command, callback);
    }

    brewOnDefault(callback) {

        winston.info('Brewing coffee with default settings');
        const command = new Buffer([Smarter.brewOnDefaultRequestByte, Smarter.messageTerminator]);
        this.sendCommand(command, callback);
    }

    brewOff(callback) {

        winston.info('Stopping coffee brew');
        const command = new Buffer([Smarter.brewOffRequestByte, 0, Smarter.messageTerminator]);
        this.sendCommand(command, callback);
    }

    hotplateOn(mins, callback) {

        var minsAsInt = 5;
        if (mins !== undefined) {
            minsAsInt = parseInt(mins);
            if (isNaN(minsAsInt) || minsAsInt < 1 || minsAsInt > 30) {
                return callback("'mins' must be a number between 1 to 30 inclusive");
            }
        }
        winston.info('Turning on hotplate for %s mins', minsAsInt);
        const command = new Buffer([Smarter.hotplateOnRequestByte, minsAsInt, Smarter.messageTerminator]);
        this.sendCommand(command, callback);
    }

    hotplateOff(callback) {

        winston.info('Turning off hotplate');
        const command = new Buffer([Smarter.hotplateOffRequestByte, Smarter.messageTerminator]);
        this.sendCommand(command, callback);
    }

    sendCommand(command, callback) {
        if (!this.isConnected) {
            return callback("Not connected");
        }

        this.client.write(command);

        callback();
    }

    addSubscription(subscriptionId, timeoutInMs, callbackUrl) {

        const expiry = Date.now() + timeoutInMs;

        const obj = { subscriptionId, expiry, callbackUrl };

        this.subscriptions.set(subscriptionId, obj);
    }

    toApiDevice() {
        return {
            id : this.id,
            mac : this.mac,
            ip : this.ip,
            name : this.name,
            status : this.status
        };
    }

    static idFromMac(mac) {
        return mac.replace(/:/g, '').toLowerCase();
    }
}

module.exports = CoffeeMachine;
