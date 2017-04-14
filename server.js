'use strict';

const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const deviceManager = require('./deviceManager.js');

const port = process.env.PORT || 8080;

function getDevices(req, res) {
    var obj = {};
    for (const entry of deviceManager.devices) {
        obj[entry[0]] = entry[1];
    }
    res.json(obj);
}


class Server 
{
    start() {
        app.use(bodyParser.urlencoded({ extended: true }));
        app.use(bodyParser.json());

        var router = express.Router();

        router.get('/devices', getDevices);

        app.use('/api', router);

        app.listen(port);
        
        console.log('Started API on port ' + port);
    }
}

module.exports = new Server();