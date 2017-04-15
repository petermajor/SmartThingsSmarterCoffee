'use strict';

const ssdp = require('@achingbrain/ssdp');

const RootUsn = 'upnp:rootdevice';
const ServerUsn = 'urn:schemas-upnp-org:device:SmartThingsSmarterCoffee:1';

class Upnp
{
    constructor() {
        this.bus = ssdp();
        this.bus.on('error', console.error);
    }

    start() {

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

        // stop the server(s) from running - this will also send ssdp:byebye messages for all
        // advertised services however they'll only have been sent once the callback is
        // invoked so it won't work with process.on('exit') as you can only perform synchronous
        // operations there
        process.on('SIGINT',() => {
            this.bus.stop(error => {
                process.exit(error ? 1 : 0);
            });
        });
    }
}

module.exports = new Upnp();
