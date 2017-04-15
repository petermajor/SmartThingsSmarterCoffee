'use strict';

const ssdp = require('@achingbrain/ssdp');

const ServerUsn = 'urn:schemas-upnp-org:device:SmartThingsSmarterCoffee:1';

class Upnp
{
    constructor() {
        this.started = false;
        this.bus = ssdp();
        this.bus.on('error', console.error);
    }

    start() {
        if (this.started) return;

        this.bus.advertise({
            usn: ServerUsn,
            details: {
                device: {
                    friendlyName: 'SmartThingsSmarterCoffee server',
                    manufacturer: 'Peter Major',
                    manufacturerURL: 'https://github.com/petermajor/SmartThingsSmarterCoffee',
                    modelDescription: '',
                    modelName: 'SmartThingsSmarterCoffee',
                    modelURL: 'https://github.com/petermajor/SmartThingsSmarterCoffee',
                    serialNumber: '1'
                }
            }
        });

        this.started = true;
        console.log(`Started SSDP server for ${ServerUsn}`);
    }

    stop() {
        if (!this.started) return;

        this.bus.stop();

        this.started = false;
        console.log("Stopped SSDP server");
    }
}

module.exports = new Upnp();
