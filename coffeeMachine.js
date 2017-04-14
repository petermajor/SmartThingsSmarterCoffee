'use strict';

const net = require('net');
const Smarter = require('./smarter.js');

function sendCommand(ip, command, callback) {

    console.log(`Connecting to machine ${ip}`);
    var client = net.createConnection({ port:Smarter.port, host:ip });

    client.once('connect', () => {
        console.log(`Connected to machine ${ip}`);
        console.log(`Sending command`);
        client.write(command, () => {
        });
    });

    client.once('error', (error) => {
        console.log(`Error ${error}`);
        callback(error);
    });

    client.once('data', (data) => {
        client.end(); 

        if (!data || data.length === 0 || data[0] !== Smarter.successReplyByte) {
            console.log("Unexpected result");
            return callback("unexpected result");
        }

        console.log("Success");
        callback();
    });
}

function postErrorToCallback(message, callback) {
    process.nextTick(() => callback(message));
}

class CoffeeMachine
{
    constructor(mac, ip) {
        this.id = CoffeeMachine.idFromMac(mac);
        this.mac = mac;
        this.ip = ip;
        this.name = "Smarter Coffee Machine";
    }

    updateIp(ip) {
        if (ip === this.ip) return;
        this.ip = ip;
    }

    setStrength(strength, callback) {

        var strengthAsInt = parseInt(strength);
        if (isNaN(strengthAsInt) || strengthAsInt < 0 || strengthAsInt > 2) {
            return postErrorToCallback("'strength' must be 0 (weak), 1 (medium), or 2 (strong)", callback);
        }

        console.log(`Setting strength to ${strengthAsInt}`);
        var command = new Buffer([Smarter.strengthRequestByte, strengthAsInt, Smarter.messageTerminator]);
        sendCommand(this.ip, command, callback);
    }

    setCups(cups, callback) {

        var cupsAsInt = parseInt(cups);
        if (isNaN(cupsAsInt) || cupsAsInt < 1 || cupsAsInt > 12) {
            return postErrorToCallback("'cups' must be a number between 1 to 12 inclusive", callback);
        }

        console.log(`Setting cups to ${cupsAsInt}`);
        var command = new Buffer([Smarter.cupsRequestByte, cupsAsInt, Smarter.messageTerminator]);
        sendCommand(this.ip, command, callback);
    }

    brewOn(grind, cups, strength, callback) {

        var grindAsInt = parseInt(grind);
        if (isNaN(grindAsInt) || grindAsInt < 0 || grindAsInt > 1) {
            return postErrorToCallback("'grind' must be 0 (off) or 1 (on)", callback);
        }

        var cupsAsInt = parseInt(cups);
        if (isNaN(cupsAsInt) || cupsAsInt < 1 || cupsAsInt > 12) {
            return postErrorToCallback("'cups' must be a number between 1 to 12 inclusive", callback);
        }

        var strengthAsInt = parseInt(strength);
        if (isNaN(strengthAsInt) || strengthAsInt < 0 || strengthAsInt > 2) {
            return postErrorToCallback("'strength' must be 0 (weak), 1 (medium), or 2 (strong)", callback);
        }

        console.log(`Brewing coffee with grind ${grindAsInt}, cups ${cupsAsInt}, strength ${strengthAsInt}`);
        var command = new Buffer([Smarter.brewOnRequestByte, cupsAsInt, strengthAsInt, 0x5 /*unknown*/, grindAsInt, Smarter.messageTerminator]);
        sendCommand(this.ip, command, callback);
    }

    brewOnDefault(callback) {
        console.log('Brewing coffee with default settings');
        var command = new Buffer([Smarter.brewOnDefaultRequestByte, Smarter.messageTerminator]);
        sendCommand(this.ip, command, callback);
    }

    brewOff(callback) {
        console.log('Stopping coffee brew');
        var command = new Buffer([Smarter.brewOffRequestByte, 0, Smarter.messageTerminator]);
        sendCommand(this.ip, command, callback);
    }

    hotplateOn(mins, callback) {
        var minsAsInt = 5;
        if (mins !== undefined) {
            minsAsInt = parseInt(mins);
            if (isNaN(minsAsInt) || minsAsInt < 1 || minsAsInt > 30) {
                return postErrorToCallback("'mins' must be a number between 1 to 30 inclusive", callback);
            }
        }
        console.log(`Turning on hotplate for ${minsAsInt} mins`);
        var command = new Buffer([Smarter.hotplateOnRequestByte, minsAsInt, Smarter.messageTerminator]);
        sendCommand(this.ip, command, callback);
    }

    hotplateOff(callback) {
        console.log('Turning off hotplate');
        var command = new Buffer([Smarter.hotplateOffRequestByte, Smarter.messageTerminator]);
        sendCommand(this.ip, command, callback);
    }

    static idFromMac(mac) {
        return mac.replace(/:/g, '').toLowerCase();
    }
}

module.exports = CoffeeMachine;
