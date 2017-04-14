'use strict';

const Server = require('node-ssdp').Server;

const RootUsn = 'upnp:rootdevice';
const ServerUsn = 'urn:schemas-upnp-org:device:SmartThingsSmarterCoffee:1';

class Upnp
{
    constructor() {
        this.server = new Server();
    }

    start() {

        this.server.addUSN(RootUsn);
        this.server.addUSN(ServerUsn);

        this.server.on('advertise-alive', (heads) => {
            console.log('advertise-alive', heads);
        });

        this.server.on('advertise-bye', (heads)  => {
            console.log('advertise-bye', heads);
        });

        this.server.start();

        console.log(`Server is discoverable as ${ServerUsn}`);

        process.on('exit', () => {
            this.server.stop(); // advertise shutting down and stop listening 
        });
    }
}
module.exports = new Upnp();
