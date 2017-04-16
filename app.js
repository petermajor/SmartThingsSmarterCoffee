'use strict';

const deviceManager = require('./deviceManager.js');
const api = require('./api.js');
const upnp = require('./upnp.js');
const winston = require('winston');

/* maxsize 10MB */
winston.add(winston.transports.File, { filename: 'SmartThingsSmarterCoffee.log', maxsize: 10000000, maxFiles: 2 });

deviceManager.start();
api.start();
upnp.start();

process.on('SIGTERM', function () {
    upnp.stop();
    api.stop();
    deviceManager.stop();
 });
