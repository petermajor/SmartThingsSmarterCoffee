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

function setStrength(req, res) {
    var id = req.params.id;
    var strength = req.params.strength;

    var device = deviceManager.devices.get(id);
    if (!device) {
        res.status(404).send();
        return;
    }

    device.setStrength(strength, err => {
        if (err) {
            res.status(500).send();
        } else {
            res.status(200).send();
        }
    });
}

function setCups(req, res) {
    var id = req.params.id;
    var cups = req.params.cups;

    var device = deviceManager.devices.get(id);
    if (!device) {
        res.status(404).send();
        return;
    }

    device.setCups(cups, err => {
        if (err) {
            res.status(500).send();
        } else {
            res.status(200).send();
        }
    });
}

function brewDefault(req, res) {
    var id = req.params.id;

    var device = deviceManager.devices.get(id);
    if (!device) {
        res.status(404).send();
        return;
    }

    device.brewDefault(err => {
        if (err) {
            res.status(500).send();
        } else {
            res.status(200).send();
        }
    });
}

class Server 
{
    start() {
        app.use(bodyParser.urlencoded({ extended: true }));
        app.use(bodyParser.json());

        var router = express.Router();

        router.get('/devices', getDevices);
        router.post('/:id/strength/:strength', setStrength);
        router.post('/:id/cups/:cups', setCups);
        router.post('/:id/brew', brewDefault);

        app.use('/api', router);

        app.listen(port);
        
        console.log('Started API on port ' + port);
    }
}

module.exports = new Server();