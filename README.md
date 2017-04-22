# SmartThingsSmarterCoffee

* __SmartThings__ - home automation system that communicates with devices over ZigBee, Z-Wave, or HTTP
* __Smarter Coffee__ - A WiFi coffee machine that can be controlled with binary commands over TCP sockets and UDP broadcasts
* __SmartThingsSmarterCoffee__ - A Node.js server that converts REST calls from SmartThings to Smarter Coffee binary packets

### Notes
* Tested on Node.js 7.9.0. It may work on other versions.
* Tested on Mac OS and Raspberry Pi Raspian. Should work on Windows, but I haven't tried it.
* When the server starts, it will discover coffee machine(s) via UDP broadcast. Coffee machine(s) must already be on the same network.
* I'm not sure what will happen if you try to control the machine with the Smarter official app and SmartThings integration at the same time. I never use the official app, it doesn't work on my Android phone.

### SmartThings

The Smarter Coffee machine communicates by sending bits over sockets. The makes it impossible to control directly with SmartThings, as SmartThings device handlers can only communicate with LAN devices via HTTP with XML / JSON.

SmartThingsSmarterCoffee converts HTTP calls from SmartThings into binary commands and sends them to the coffee machine.

To contol your coffee machine with SmartThings you'll need:
* this Node.js app, running on a computer. I recommend a Raspberry Pi. 
* the companion SmartThings [Device Handler](https://github.com/petermajor/SmartThings/blob/master/devices/SmarterCoffee.groovy). This device handler provides the "on/off" button for your coffee machine in SmartThings
* the companion SmartThings [SmartApp](https://github.com/petermajor/SmartThings/blob/master/apps/SmarterManager.groovy). The smart app locates the SmartThingsSmarterCoffee server via UPnP and creates the actual coffee machine device. It also updates the device settings in the case of either SmartThingsSmarterCoffee or the coffee machine IP address changes.

| Component                 | Ver   | Link                                                                               |
|---------------------------|-------|------------------------------------------------------------------------------------|
| SmartThingsSmarterCoffee  | 1.1.0 | https://github.com/petermajor/SmartThingsSmarterCoffee                             |
| Smarter Manager           | 1.1.0 | https://github.com/petermajor/SmartThings/blob/master/apps/SmarterManager.groovy   |
| Smarter Coffee            | 1.1.0 | https://github.com/petermajor/SmartThings/blob/master/devices/SmarterCoffee.groovy |

### Usage
1. Clone the SmartThingsSmarterCoffee repository into a folder on your server.
2. Run `npm install` from the top folder of the clone to install module dependencies.
3. Run `node app.js` from the top folder of the install to start the app.
4. Use the SmartThings graph IDE to install the _Device Handler_ (see above).
5. Use the SmartThings graph IDE to install the _SmartApp_ (see above).
6. Use the SmartThings mobile app to create an instance of the Smarter Manager SmartApp:
    1. Tap _Automation_ > _SmartApps_
    2. Scroll to the bottom and select _Add a SmartApp_
    3. Scroll to the bottom and select _My Apps_
    4. Find _Smarter Manager_ in list and tap on it
    5. Wait a min for the SmartApp to discover your Node.js server and the Coffee Machine via UPnP
    6. Select _Coffee Machine_ and tap the _Done_ button at the top

If the installation completed without errors, you will have a device called _Coffee Machine_ added to your device list.

You can now use that like any other on/off switch in SmartThings, including control with Amazon Echo or Google Home.

NOTE: Do not remote the Smarter Manager app after setup. Doing so will also remove the associated Coffee Machine device.

### Raspberry Pi

#### Node.js on Raspberry Pi
If you're using a Raspberry Pi, the standard Raspian install has a really, really, really old version of Node installed. I haven't tested SmartThingsSmarterCoffee on that version of Node.js. I would recommend that you follow [these instructions](http://thisdavej.com/beginners-guide-to-installing-node-js-on-a-raspberry-pi/) to install the latest version Node.js.

#### Running as a Service 

You can configure SmartThingsSmarterCoffee to run as a service and start after the Pi boots.

First, create the service definition:
```
sudo nano /lib/systemd/system/SmartThingsSmarterCoffee.service
```

Copy and paste this text and save with ctrl-x:

```
[Unit]
Description=SmartThingsSmarterCoffee
After=multi-user.target

[Service]
Type=simple
ExecStart=/usr/bin/node <path to git repo>/app.js
WorkingDirectory=<path to git repo>
Restart=always
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

Then run the additional commands:

```
sudo systemctl daemon-reload
sudo systemctl enable SmartThingsSmarterCoffee.service
sudo systemctl start SmartThingsSmarterCoffee.service
sudo systemctl status SmartThingsSmarterCoffee.service
```

If you want to stop the service (until next reboot):
```
sudo systemctl stop SmartThingsSmarterCoffee.service
```

### API

You don't need to know this for the SmartThings integration. But if you're using this API to integration your coffee machine with something else it might be useful...

#### GET /api/device

Map of known coffee machines.

Example response:
```
{
  "18fe34f86975": {
    "id": "18fe34f86975",
    "mac": "18:fe:34:f8:69:75",
    "ip": "192.168.1.15",
    "name": "Coffee Machine",
    "status": {
      "isBrewing": false,
      "isCarafeDetected": false,
      "isGrind": true,
      "isHotplateOn": false,
      "waterLevel": 2,
      "strength": 0,
      "cups": 5
    }
  }
}
```

Note `status` can be null if the the device endpoint is called before the device status can be queried.

The server supports more than one machine on the network.
Use the `id` property to identify which machine you would like to preform operation for.

#### GET /api/device/{id}

Gets the status of the specified machine.

Example response:
```
{
  "id": "18fe34f86975",
  "mac": "18:fe:34:f8:69:75",
  "ip": "192.168.1.15",
  "name": "Coffee Machine",
  "status": {
    "isBrewing": false,
    "isCarafeDetected": false,
    "isGrind": true,
    "isHotplateOn": false,
    "waterLevel": 2,
    "strength": 0,
    "cups": 5
  }
}
```

Note `status` can be null if the the device endpoint is called before the device status can be queried.

#### POST /api/device/{id}/cups

Overrides the default setting for the number of cups to brew.

Payload:
```
{ "cups": 3 }
```

`cups` must be a value between 1 and 12 inclusive.

#### POST /api/device/{id}/strength

Overrides the default setting for the strength of coffee to brew.

Payload:
```
{ "strength": 1 }
```

`strength` must be 0 (weak), 1 (medium) or 2 (strong).

#### POST /api/device/{id}/brew/on

Starts brewing coffee. 

If the payload is empty then coffee with default settings is brewed.

If the payload is not empty then the settings in the payload are used.

Payload:
```
{
    "cups": 3,
    "isGrind": true,
    "strength": 2
}
```

`cups` must be a value between 1 and 12 inclusive.
`isGrind` must be true (grind) or false (filter).
`strength` must be 0 (weak), 1 (medium) or 2 (strong).

#### POST /api/device/{id}/brew/off

Stops brewing if one was in progress. 

Payload:
none

#### POST /api/device/{id}/grind

Sets the machine to 'grind' or 'filter' mode. 

Payload:
```
{ "isGrind": true }
```

`isGrind` must be true (grind) or false (filter).

#### POST /api/device/{id}/hotplate/on

Turns on the hotplate only. 

If the payload is empty then hotplate will be turned on for five minutes.

If the payload is not empty then the hotplate will be turned on for the number of mins specified in the payload.

Payload:
```
{ "mins": 10 }
```

`mins` must be a value between 1 and 30 inclusive.

#### POST /api/device/{id}/hotplate/off

Turns off the hotplate. 

Payload:
none
