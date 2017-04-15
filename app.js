'use strict';

const deviceManager = require('./deviceManager.js');
const api = require('./api.js');
const upnp = require('./upnp.js');

deviceManager.start();
api.start();
upnp.start();

process.on('SIGTERM', function () {
    upnp.stop();
    api.stop();
    deviceManager.stop();
 });
