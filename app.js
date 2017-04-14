'use strict';

const deviceManager = require('./deviceManager.js');
const server = require('./server.js');

server.start();

deviceManager.start();

deviceManager.on('discovered', device => {
    console.log(`Device discovered: ${device}`);
});
