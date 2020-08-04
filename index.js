

let devices = {
	family: {
		off: 	'fan0.iq',
		low:	'fan1.iq',
		medium:	'fan2.iq',
		high:	'fan3.iq',
		light:	'light.iq'
	}
};

const iqDirectory = '/usr/src/app/fan-recordings/';
const execDirectory = '/usr/src/app/rpitx/';

// delay between executing commands
const commandDelay = 100;

// fan status speeds
const fanStatus = {
	off: 0,
	low: 25,
	medium: 50,
	high: 100
};


var http = require('http');
var url = require('url');
const { exec } = require('child_process');


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

console.log('starting up webserver');

http.createServer((req, res) => {
	res.writeHead(200, {'Content-Type': 'text/html'});
	let q = url.parse(req.url, true).query;

	if (!q.device || !(q.device in devices)) {
		res.end('error');
	}

	switch (q.mode) {
		case 'fan-status':
			res.end((currentState[q.device].fan !== 'off') ? '1' : '0');
			break;
		case 'light-status':
			res.end((currentState[q.device].light !== 'off') ? '1' : '0');
			break;
		case 'fan-speed':
			res.end(fanStatus[currentState[q.device].fan]);
			break;
		case 'light-on':
			if (currentState[q.device].light === 'off') {
				console.log(`turning ${q.device} light on`);
				currentState[q.device].light = 'on';
				queueCommand(q.device, 'light');
			}
			res.end('1');
			break;
		case 'light-off':
			if (currentState[q.device].light !== 'off') {
				console.log(`turning ${q.device} light off`);
				currentState[q.device].light = 'off';
				queueCommand(q.device, 'light');
			}
			res.end('1');
			break;
		case 'fan-on':
			if (currentState[q.device].fan === 'off') {
				console.log(`turning ${q.device} fan on`);
				// by default, set fan speed to medium
				currentState[q.device].fan = 'medium';
				queueCommand(q.device, 'medium');
			}
			res.end(1);
			break;
		case 'fan-off':
			console.log(`turning ${q.device} fan off`);
			queueCommand(q.device, 'off');
			res.end('1');
			break;
		case 'fan-set':
			const fanSpeed = convertSpeedToMode(q.level);
			currentState[q.device].fan = fanSpeed;
			console.log(`turning ${q.device} fan to ${q.level} / ${fanSpeed}`);
			queueCommand(q.device, fanSpeed);
			res.end('1');
			break;

		default:
			res.end('no mode specified');
	}
}).listen(80);





