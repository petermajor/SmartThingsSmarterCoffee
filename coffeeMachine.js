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

    setStrength(coffeeStrength, callback) {

        var code = -1;
        switch (coffeeStrength) {
            case 'weak':
                code = 0;
                break;
            case 'medium':
                code = 1;
                break;
            case 'strong':
                code = 2;
                break;
            default:
                return postErrorToCallback('Strength must be "weak", "medium", or "strong"', callback);
        }

        console.log(`Setting coffee strength to ${coffeeStrength}`);
        var command = new Buffer([Smarter.strengthRequestByte, code, Smarter.messageTerminator]);
        sendCommand(this.ip, command, callback);
    }

    setCups(cups, callback) {
        if (cups < 1 || cups > 12) {
            return postErrorToCallback('Cups must be a number between 1 to 12 inclusive', callback);
        }

        console.log(`Setting number of cups to ${cups}`);
        var command = new Buffer([Smarter.cupsRequestByte, cups, Smarter.messageTerminator]);
        sendCommand(this.ip, command, callback);
    }

    brewDefault(callback) {
        console.log('Brewing coffee with default settings');
        var command = new Buffer([Smarter.brewDefaultRequestByte, Smarter.messageTerminator]);
        sendCommand(this.ip, command, callback);
    }

    static idFromMac(mac) {
        return mac.replace(/:/g, '').toLowerCase();
    }
}

module.exports = CoffeeMachine;
