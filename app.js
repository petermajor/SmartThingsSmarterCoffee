'use strict';

const deviceManager = require('./deviceManager.js');

deviceManager.start();

deviceManager.on('discovered', device => {
    console.log(`Device discovered: ${device}`);
});
