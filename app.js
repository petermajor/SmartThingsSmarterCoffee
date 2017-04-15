'use strict';

const deviceManager = require('./deviceManager.js');
const api = require('./api.js');
const upnp = require('./upnp.js');

deviceManager.start();
deviceManager.on('discovered', device => device.connect());
api.start();
upnp.start();