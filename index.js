
const yargs = require('yargs');
const mqtt = require('mqtt');
const { exec } = require('child_process');

const devices = require('./config/config.js');

const argv = yargs
	.option('mqttHost', {
		description: 'Hostname of MQTT broker',
		alias: 'mqtt',
		type: 'string'
	})
	.option('iqDirectory', {
		description: 'Path to codesend binary',
		alias: 'iq',
		type: 'string'
	})
	.option('execDirectory', {
		description: 'Path to codesend binary',
		alias: 'exec',
		type: 'string'
	})
	.help()
	.alias('help', 'h')
	.argv;


const iqDirectory = (argv.iqDirectory) ? argv.iqDirectory : '/usr/src/app/fan-recordings/';
const execDirectory = (argv.execDirectory) ? argv.execDirectory : '/usr/src/app/rpitx/';
const mqttHost = (argv.mqttHost) ? argv.mqttHost : 'localhost';

// delay between executing commands
const commandDelay = 100;

// fan status speeds
const fanStatus = {
	off: 0,
	low: 25,
	medium: 50,
	high: 100
};


// maintain a current state of the fans
// this gets setup in the initSetup function
var currentState = {};


// maintain a queue of commands
var commandQueue = [];

const initSetup = () => {
	Object.keys(devices).forEach(element => {
		currentState[element] = {};
		currentState[element].fan = 'off';
		currentState[element].light = 'off';
		queueCommand(element, 'off');
	});
};


const sendCommand = ({device, command}) => {
	exec(`${execDirectory}sendiq -s 250000 -f 434.00e6 -t u8 -i ${iqDirectory}${devices[device][command]}`, (err, stdout, stderr) => {
		console.log(stderr);
	});
};

const queueCommand = (device, command) => {
	commandQueue.push({device: device, command: command});
};


// constantly try to send commands after certain delays
const processCommands = () => {
	if (commandQueue.length > 0) {
		sendCommand(commandQueue.shift());
	}
	setTimeout(processCommands, commandDelay);
};

setTimeout(processCommands, commandDelay);


const convertSpeedToMode = (speed) => {
	for (var element in fanStatus) {
		if (speed <= fanStatus[element]) {
			return element;
		}
	}
	return 'off';
};



initSetup();

console.log(`connecting to mqtt broker: ${mqttHost}`);
const client = mqtt.connect(`mqtt://${mqttHost}`);

client.on('connect', () => {
	console.log('mqtt connected');
	Object.keys(devices).forEach((item) => {
		console.log(`subscribing to ${item} statuses`);
		client.publish(`${item}/connected`, 'true');
		client.subscribe(`${item}/setFanOn`);
		client.subscribe(`${item}/setRotationSpeed`);
		if (devices[item]['light']) {
			client.subscribe(`${item}/setLightOn`);
		}
	});
});


client.on('message', (topic, message) => {
	topic = topic.toString();
	message = message.toString();

	console.log(`new message\ntopic: ${topic}\nmessage: ${message}`);

	if (topic.split('/').length != 2) {
		return;
	}

	let [device, action] = topic.split('/');

	switch (action) {
		case 'setLightOn':
			if (message === 'true') {
				if (currentState[device].light === 'off') {
					console.log(`turning ${device} light on`);
					currentState[device].light = 'on';
					queueCommand(device, 'light');
					client.publish(`${device}/getLightOn`, 'true');
				}
			} else {
				if (currentState[device].light !== 'off') {
					console.log(`turning ${device} light off`);
					currentState[device].light = 'off';
					queueCommand(device, 'light');
					client.publish(`${device}/getLightOn`, 'false');
				}
			}
			break;
		case 'setFanOn':
			if (message === 'true') {
				if (currentState[device].fan === 'off') {
					console.log(`turning ${device} fan on`);
					// by default, set fan speed to medium
					currentState[device].fan = 'medium';
					queueCommand(device, 'medium');
					client.publish(`${device}/getFanOn`, 'true');
					client.publish(`${device}/getRotationSpeed`, fanStatus['medium'].toString());
				}
			} else {
				console.log(`turning ${device} fan off`);
				queueCommand(device, 'off');
				client.publish(`${device}/getFanOn`, 'false');
			}
			break;
		case 'setRotationSpeed':
			const fanSpeed = convertSpeedToMode(message);
			currentState[device].fan = fanSpeed;
			console.log(`turning ${device} fan to ${message} / ${fanSpeed}`);
			queueCommand(device, fanSpeed);
			client.publish(`${device}/getFanOn`, 'true');
			client.publish(`${device}/getRotationSpeed`, fanStatus[fanSpeed].toString());
			break;

		default:
			console.log('invalid message');
	}
});





