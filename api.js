'use strict';

const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const deviceManager = require('./deviceManager.js');
const winston = require('winston');
const uuid = require('uuid');

const port = 2080;

function getDevice(req, res) {

    var id = req.params.id;

    var device = deviceManager.devices.get(id);
    if (!device) {
        res.setStatus(404);
        return;
    }

    res.json(device.toApiDevice());
}

function subscribeDevice(req, res) {

    const id = req.params.id;

    const device = deviceManager.devices.get(id);
    if (!device) {
        res.setStatus(404);
        return;
    }

    const subscriptionIdWithPrefix = req.get('SID');
    const subscriptionId = subscriptionIdWithPrefix !== undefined ? subscriptionIdWithPrefix : uuid();

    const timeoutWithPrefix = req.get('TIMEOUT');
    if (timeoutWithPrefix === undefined || !timeoutWithPrefix.startsWith('Second-')) {
        res.status(400).send("TIMEOUT must be specified and in format 'Second-{val}'");
        return;
    }
    const timeout = parseInt(timeoutWithPrefix.replace('Second-', '').trim());
    const timeoutInMs = timeout * 1000;

    const callbackWithPrefix = req.get('CALLBACK');
    if (callbackWithPrefix === undefined || !callbackWithPrefix.startsWith('<') || !callbackWithPrefix.endsWith('>')) {
        res.status(400).send("CALLBACK must be specified and in format '<{url}>'");
        return;
    }
    const callback = callbackWithPrefix.substring(1, callbackWithPrefix.length-1).trim();

    winston.info('Adding subscription %s with timeout %s for %s', subscriptionId, timeoutInMs, callback);
    device.addSubscription(subscriptionId, timeoutInMs, callback);

    res.set({'SID': subscriptionId}).status(200).send();
}

function getDevices(req, res) {
    var obj = {};
    for (const entry of deviceManager.devices) {
        obj[entry[0]] = entry[1].toApiDevice();
    }
    res.json(obj);
}

function setStrength(req, res) {
    var id = req.params.id;

    var device = deviceManager.devices.get(id);
    if (!device) {
        res.setStatus(404);
        return;
    }

    device.setStrength(req.body.strength, err => sendResult(res, err));
}

function setCups(req, res) {
    var id = req.params.id;

    var device = deviceManager.devices.get(id);
    if (!device) {
        res.setStatus(404);
        return;
    }

    device.setCups(req.body.cups, err => sendResult(res, err));
}

function setGrind(req, res) {
    var id = req.params.id;

    var device = deviceManager.devices.get(id);
    if (!device) {
        res.setStatus(404);
        return;
    }

    device.setGrind(req.body.isGrind, err => sendResult(res, err));
}

function setBrewOn(req, res) {
    var id = req.params.id;

    var device = deviceManager.devices.get(id);
    if (!device) {
        res.setStatus(404);
        return;
    }

    if (Object.keys(req.body).length === 0) {
        device.brewOnDefault(err => sendResult(res, err));
    } else {
        device.brewOn(req.body.isGrind, req.body.cups, req.body.strength, err => sendResult(res, err));
    }
}

function setBrewOff(req, res) {
    var id = req.params.id;

    var device = deviceManager.devices.get(id);
    if (!device) {
        res.setStatus(404);
        return;
    }

    device.brewOff(err => sendResult(res, err));
}

function setHotplateOn(req, res) {
    var id = req.params.id;

    var device = deviceManager.devices.get(id);
    if (!device) {
        res.setStatus(404);
        return;
    }

    device.hotplateOn(req.body.mins, err => sendResult(res, err));
}

function setHotplateOff(req, res) {
    var id = req.params.id;

    var device = deviceManager.devices.get(id);
    if (!device) {
        res.setStatus(404);
        return;
    }

    device.hotplateOff(err => sendResult(res, err));
}

// send 202 (Accepted) for non-error result
// indicates that the binary packets were sent to the machine
// but we don't wait for a response from the machine
// we'll call subscription callbacks on error
function sendResult(res, err) {
    if (err) {
        res.status(400).send(err);
    } else {
        res.status(202).send();
    }
}

class Api 
{
    constructor() {
    }

    start() {
        if (this.server) return;

        app.use(bodyParser.urlencoded({ extended: true }));
        app.use(bodyParser.json());

        var router = express.Router();

        router.get('/device', getDevices);
        router.get('/device/:id', getDevice);
        router.subscribe('/device/:id', subscribeDevice);
        router.post('/device/:id/strength', setStrength);
        router.post('/device/:id/cups', setCups);
        router.post('/device/:id/grind', setGrind);
        router.post('/device/:id/brew/on', setBrewOn);
        router.post('/device/:id/brew/off', setBrewOff);
        router.post('/device/:id/hotplate/on', setHotplateOn);
        router.post('/device/:id/hotplate/off', setHotplateOff);

        app.use('/api', router);

        this.server = app.listen(port);

        winston.info('Started API on port %s', port);
    }

    stop() {
        if (!this.server) return;

        this.server.close();
        this.server = null;
        
        winston.info('Stopped API');
    }
}

module.exports = new Api();