'use strict';

const dgram = require('dgram');
const os = require('os');
const macfromip = require('macfromip');
const CoffeeMachine = require('./coffeeMachine.js');
const Smarter = require('./smarter.js');
const winston = require('winston');

const fourSeconds = 4 * 1000;
const fiveMinutes = 5 * 60 * 1000;
const broadcastAddress = '255.255.255.255';

function getLocalAddresses() {

    var interfaces = os.networkInterfaces();
    var addresses = [];
    for (let k in interfaces) {
        for (let k2 in interfaces[k]) {
            let address = interfaces[k][k2];
            if (address.family === 'IPv4' && !address.internal) {
                addresses.push(address.address);
            }
        }
    }
    return addresses;
}

const localAddresses = getLocalAddresses();

class DeviceManager
{
    constructor() {
        this.devices = new Map();
    }

    start() {
        if (this.intervalId) return;

        this.discover();
        this.intervalId = setInterval(() => this.discover(), fiveMinutes);
        winston.info('Started discovery manager');
    }

    stop() {
        if (!this.intervalId) return;

        clearInterval(this.intervalId);
        this.intervalId = null;
        winston.info('Stopped discovery manager');

        for (let device of this.devices.values()) {
            device.disconnect();
        }
    }

    discover() {

        winston.info('Starting coffee machine discovery');
        var udpsocket = dgram.createSocket('udp4');

        udpsocket.on('listening', () => {
            var address = udpsocket.address();
            winston.info('Started listening for UDP message on %s:%s', address.address, address.port);

            udpsocket.setBroadcast(true);
            var message = new Buffer ([Smarter.discoverRequestByte, Smarter.messageTerminator]);

            udpsocket.send(message, 0, message.length, Smarter.port, broadcastAddress);
            winston.info('Broadcasted UDP message to  %s:%s', broadcastAddress, Smarter.port);

            setTimeout(() => {
                udpsocket.close();
                winston.info('Stopped listening for UDP messages');
            }, fourSeconds);
        });

        udpsocket.on('message', (message, remote) => {
            if (localAddresses.includes(remote.address)) return;

            if (message.length >= 4 && message[0] == Smarter.discoverReplyByte && message[1] == Smarter.coffeeDeviceType && message[3] == Smarter.messageTerminator) {
                    
                let ip = remote.address;
                winston.info('Response received from %s', ip);
                
                macfromip.getMac(ip, (err, mac) => {
                    if(err){
                        winston.info('Error getting mac address for address %s', ip);
                        return;
                    }
                    
                    winston.info('Resolved %s to %s', ip, mac);

                    var id = CoffeeMachine.idFromMac(mac);
                    if (this.devices.has(id)) {
                        winston.info('Device %s already known', mac);
                        let device = this.devices.get(id);
                        device.updateIp(ip);
                    } else {
                        winston.info('Device %s is new', mac);
                        let device = new CoffeeMachine(mac, ip);
                        this.devices.set(device.id, device);
                        // connect on next cycle
                        setTimeout(() => device.connect(), 0);
                    }
                });
            }
        });

        udpsocket.bind(Smarter.port);
    }
}

module.exports = new DeviceManager();