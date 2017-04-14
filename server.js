'use strict';

const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const deviceManager = require('./deviceManager.js');

const port = process.env.PORT || 8080;

function getDevice(req, res) {

    var id = req.params.id;

    var device = deviceManager.devices.get(id);
    if (!device) {
        res.status(404).send();
        return;
    }

    res.json(device);
}

function getDevices(req, res) {
    var obj = {};
    for (const entry of deviceManager.devices) {
        obj[entry[0]] = entry[1];
    }
    res.json(obj);
}

function setStrength(req, res) {
    var id = req.params.id;

    var device = deviceManager.devices.get(id);
    if (!device) {
        res.status(404).send();
        return;
    }

    device.setStrength(req.body.strength, err => sendResult(res, err));
}

function setCups(req, res) {
    var id = req.params.id;

    var device = deviceManager.devices.get(id);
    if (!device) {
        res.status(404).send();
        return;
    }

    device.setCups(req.body.cups, err => sendResult(res, err));
}

function setBrewOn(req, res) {
    var id = req.params.id;

    var device = deviceManager.devices.get(id);
    if (!device) {
        res.status(404).send();
        return;
    }

    if (Object.keys(req.body).length === 0) {
        device.brewOnDefault(err => sendResult(res, err));
    } else {
        device.brewOn(req.body.grind, req.body.cups, req.body.strength, err => sendResult(res, err));
    }
}

function setBrewOff(req, res) {
    var id = req.params.id;

    var device = deviceManager.devices.get(id);
    if (!device) {
        res.status(404).send();
        return;
    }

    device.brewOff(err => sendResult(res, err));
}

function setHotplateOn(req, res) {
    var id = req.params.id;

    var device = deviceManager.devices.get(id);
    if (!device) {
        res.status(404).send();
        return;
    }

    device.hotplateOn(req.body.mins, err => sendResult(res, err));
}

function setHotplateOff(req, res) {
    var id = req.params.id;

    var device = deviceManager.devices.get(id);
    if (!device) {
        res.status(404).send();
        return;
    }

    device.hotplateOff(err => sendResult(res, err));
}

function sendResult(res, err) {
    if (err) {
        res.status(400).send(err);
    } else {
        res.status(200).send();
    }
}

class Server 
{
    start() {
        app.use(bodyParser.urlencoded({ extended: true }));
        app.use(bodyParser.json());

        var router = express.Router();

        router.get('/device', getDevices);
        router.get('/device/:id', getDevice);
        router.post('/device/:id/strength', setStrength);
        router.post('/device/:id/cups', setCups);
        router.post('/device/:id/brew/on', setBrewOn);
        router.post('/device/:id/brew/off', setBrewOff);
        router.post('/device/:id/hotplate/on', setHotplateOn);
        router.post('/device/:id/hotplate/off', setHotplateOff);

        app.use('/api', router);

        app.listen(port);
        
        console.log('Started API on port ' + port);
    }
}

module.exports = new Server();