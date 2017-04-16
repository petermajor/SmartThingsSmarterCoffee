'use strict';

const deviceManager = require('./deviceManager.js');
const api = require('./api.js');
const upnp = require('./upnp.js');
const winston = require('winston');

winston.add(winston.transports.File, { filename: 'SmartThingsSmarterCoffee.log' });

deviceManager.start();
api.start();
upnp.start();

process.on('SIGTERM', function () {
    upnp.stop();
    api.stop();
    deviceManager.stop();
 });
