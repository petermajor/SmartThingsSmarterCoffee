'use strict';

const net = require('net');
const Smarter = require('./smarter.js');

class CoffeeMachine
{
    constructor(mac, ip) {
        this.id = CoffeeMachine.idFromMac(mac);
        this.mac = mac;
        this.ip = ip;
        this.name = "Coffee Machine";
        this.cups = null;
        this.strength = null;
        this.grind = null;
        this.isCarafeDetected = null;
        this.isHotplateOn = null;
        this.isBrewing = null;
        this.waterLevel = null;
        this.isConnected = false;
    }

    updateIp(ip) {
        if (ip === this.ip) return;
        this.ip = ip;
        // TODO disconnect and reconnect
    }

    connect() {
        if (this.isConnected) return;

        console.log(`Connecting to machine ${this.ip}`);
        this.client = net.createConnection({ port:Smarter.port, host:this.ip });

        this.client.on('connect', () => {
            console.log(`Connected to machine ${this.ip}`);
            this.isConnected = true;
        });

        // this.client.on('error', (error) => {
        //     console.log(`Error ${error}`);
        //     // TODO
        // });

        this.client.on('end', () => {
            this.isConnected = false;
            console.log(`Disconnected from machine ${this.ip}`);
         });

        this.client.on('data', (data) => {

            if (!data || data.length === 0 || data[0] !== Smarter.statusReplyByte)
                return;
            console.log(`Received status message from machine ${this.ip} - ${data.join(',')}`);

            // not sure what isReady is... don't think it's "machine is ready to brew"
            // it might be "you're coffee is ready" as it doesn't stay set that long
            //this.isReady = (data[1] & 4) >= 1;
            // not useful
            //this.isCycleComplete = (data[1] & 32) >= 1;

            // combine these two properties into something more useful
            let isGrindInProgress = (data[1] & 8) >= 1;
            let isWaterPumpInProgress = (data[1] & 16) >= 1;
            this.isBrewing = isGrindInProgress || isWaterPumpInProgress;

            this.isCarafeDetected = (data[1] & 1) >= 1;
            this.isGrind = (data[1] & 2) >= 1;
            this.isHotplateOn = (data[1] & 64) >= 1;
            this.isBrewing = isGrindInProgress || isWaterPumpInProgress;
            this.waterLevel = (data[2] & 15);
            this.strength = (data[4] & 3);
            this.cups = (data[5] & 15);
        });
    }

    disconnect() {
        if (!this.isConnected) return;

        console.log(`Disconnecting from machine ${this.ip}`);
        this.client.end();
    }

    setStrength(strength, callback) {

        var strengthAsInt = parseInt(strength);
        if (isNaN(strengthAsInt) || strengthAsInt < 0 || strengthAsInt > 2) {
            return callback("'strength' must be 0 (weak), 1 (medium), or 2 (strong)");
        }

        console.log(`Setting strength to ${strengthAsInt}`);
        var command = new Buffer([Smarter.strengthRequestByte, strengthAsInt, Smarter.messageTerminator]);
        this.sendCommand(command, callback);
    }

    setCups(cups, callback) {

        var cupsAsInt = parseInt(cups);
        if (isNaN(cupsAsInt) || cupsAsInt < 1 || cupsAsInt > 12) {
            return callback("'cups' must be a number between 1 to 12 inclusive");
        }

        console.log(`Setting cups to ${cupsAsInt}`);
        var command = new Buffer([Smarter.cupsRequestByte, cupsAsInt, Smarter.messageTerminator]);
        this.sendCommand(command, callback);
    }

    setGrind(isGrind, callback) {

        if (isGrind !== true && isGrind !== false) {
            return callback("'isGrind' must be true (on) or false (off)");
        }

        if (this.isGrind === isGrind) {
             return callback();
        }

        console.log(`Setting grind to ${isGrind}`);

        var command = new Buffer([Smarter.toggleGrindRequestByte, Smarter.messageTerminator]);
        this.sendCommand(command, callback);
    }

    brewOn(isGrind, cups, strength, callback) {

        if (isGrind !== true && isGrind !== false) {
            return callback("'isGrind' must be true (on) or false (off)");
        }
        var isGrindAsInt = isGrind ? 1 : 0;

        var cupsAsInt = parseInt(cups);
        if (isNaN(cupsAsInt) || cupsAsInt < 1 || cupsAsInt > 12) {
            return callback("'cups' must be a number between 1 to 12 inclusive");
        }

        var strengthAsInt = parseInt(strength);
        if (isNaN(strengthAsInt) || strengthAsInt < 0 || strengthAsInt > 2) {
            return callback("'strength' must be 0 (weak), 1 (medium), or 2 (strong)");
        }

        console.log(`Brewing coffee with grind ${isGrindAsInt}, cups ${cupsAsInt}, strength ${strengthAsInt}`);
        var command = new Buffer([Smarter.brewOnRequestByte, cupsAsInt, strengthAsInt, 0x5 /*unknown*/, isGrindAsInt, Smarter.messageTerminator]);
        this.sendCommand(command, callback);
    }

    brewOnDefault(callback) {

        console.log('Brewing coffee with default settings');
        var command = new Buffer([Smarter.brewOnDefaultRequestByte, Smarter.messageTerminator]);
        this.sendCommand(command, callback);
    }

    brewOff(callback) {

        console.log('Stopping coffee brew');
        var command = new Buffer([Smarter.brewOffRequestByte, 0, Smarter.messageTerminator]);
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
        console.log(`Turning on hotplate for ${minsAsInt} mins`);
        var command = new Buffer([Smarter.hotplateOnRequestByte, minsAsInt, Smarter.messageTerminator]);
        this.sendCommand(command, callback);
    }

    hotplateOff(callback) {

        console.log('Turning off hotplate');
        var command = new Buffer([Smarter.hotplateOffRequestByte, Smarter.messageTerminator]);
        this.sendCommand(command, callback);
    }

    sendCommand(command, callback) {
        if (!this.isConnected) {
            return callback("Not connected");
        }

        this.client.write(command);

        callback();
    }

    toStatus() {
        return {
            id : this.id,
            mac : this.mac,
            ip : this.ip,
            name : this.name,
            cups : this.cups,
            strength : this.strength,
            isGrind : this.isGrind,
            isCarafeDetected : this.isCarafeDetected,
            isHotplateOn : this.isHotplateOn,
            isBrewing : this.isBrewing,
            waterLevel : this.waterLevel,
            isConnected : this.isConnected
        };
    }

    static idFromMac(mac) {
        return mac.replace(/:/g, '').toLowerCase();
    }
}

module.exports = CoffeeMachine;
