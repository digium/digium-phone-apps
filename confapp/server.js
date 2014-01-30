/********************************************************************************
 * Copyright (C) 2013 Digium, Inc.
 * Licensed under MIT license
 * You are free to share, remix and make commercial use of the work
 *
 * @description : 
 * Example Digium Phone App Engine - AMI - DPMA Code
 * Server-side code uses Node.js http://nodejs.org/
 * and Asterisk-ami library  https://github.com/holidayextras/node-asterisk-ami
 * Download Client-code and configs at http://github.com/digium
 * 
 * Phone App uses pbx.request object to send secure messages via SIP to DPMA
 * Server App registers with DPMA with DPMAMessageRegister AMI action
 * DPMA sends AMI events from phone app to server app
 * server app parses events from phones and sends AMI events to Asterisk
 * [Digium_phone] <-> SIP <-> [DPMA][Asterisk] <-> AMI <-> [Node_App]
 * ConfApp uses AMI to control Confbridge room and display room info on phones
 *
 * Versions:
 * Asterisk 11.6.0
 * Digium Phone Module for Asterisk 1.7.0
 * Digium IP Phone Firmware 1.4.0
 * node.js 0.10.22
 * asterisk-ami 0.1.0
 * 
 * @authors : Mark Spencer & Billy Chia
 */

// import AMI Node.js library
var AsteriskAmi = require('asterisk-ami');

// log into manager
var ami = new AsteriskAmi({
	host: 'localhost',
	username: 'mark',
	password: 'mysecret'
});

// create objects to store state
var conferences = {}
var phones = {}

// ami.on is the listener for AMI events
// place callbacks to act on events from Asterisk
ami.on('ami_data', function(data) {
	var room = data.conference, 
		cid = data.calleridnum;
	//console.log('AMI DATA', data);
	if (data.event == 'ConfbridgeListRooms') {
		console.log('AMI DATA', data);
		sendConfbridgeList(room);
	} else if (data.event == 'ConfbridgeJoin') {
		console.log('AMI DATA', data);
		sendConfbridgeList(room);
	} else if (data.event == 'ConfbridgeList') {
		console.log('AMI DATA', data);
		addConfUser(room, cid, data);
	} else if (data.event == 'ConfbridgeLeave') {
		console.log('AMI DATA', data);
		removeConfUser(room, cid);
	} else if (data.event == 'ConfbridgeEnd') {
		console.log('AMI DATA', data);
		removeConfRoom(room);
    } else if (data.event == 'DPMAMessage' && data.method == 'digium.confapp') {
		console.log('AMI DATA', data);
        parseFromConfApp(data);
    };
});

// functions to exectue on connect 
ami.connect(function(response) {
	console.log('connected to the AMI');
	// Register server app with DPMA method
	ami.send({
		action: 'DPMAMessageRegister',
		method: 'digium.confapp'
	});
	// Query Asterisk to see if any calls are in a conference
	ami.send({
		action: 'ConfbridgeListRooms',
	});
});

// Phone Apps register with server app to be notified when conference room changes
// This function updates the registered phones
var updateConfApp = function(room) {
	console.log("updating ConfApp on registered IP phones");
	var message = conferences[room] || false;
	message = JSON.stringify(message);
	for (var phone in phones[room]) {
		ami.send({
			Action: 'DPMAMessageSend',
			Method: 'digium.confapp.update',
			//Method: 'digium.confapp',
			Message: message,
			PhoneName: phone 
		});
	};
};


// Query Asterisk for Conference room participants
var sendConfbridgeList = function(room) {
	ami.send({
		action: 'ConfbridgeList',
		conference: room
	});
};

/* 
 * Expected AMI event to pass as data to addConfUser()
 *
 * AMI DATA { event: 'ConfbridgeList',
 *   actionid: '74460375658236450',
 *   conference: '1234',
 *   calleridnum: '100',
 *   calleridname: 'Bob',
 *   channel: 'Local/null@default-00000025;1',
 *   admin: 'Yes',
 *   markeduser: 'No' }
 */
var addConfUser = function(room, cid, data) {
    if (!conferences[room]) { 
        conferences[room] = {}; 
        conferences[room][cid] = data;
    } else { 
        conferences[room][cid] = data;
    };
	updateConfApp(room);
};

var removeConfUser = function(room, cid) {
	delete conferences[room][cid];
	updateConfApp(room);
};

var removeConfRoom = function(room) {
	delete conferences[room];
};

/*

// Example code for client-side app
// https://wiki.asterisk.org/wiki/display/DIGIUM/Custom+Phone+Applications+with+Asterisk#CustomPhoneApplicationswithAsterisk-InteractingwithAsterisk
 
pbx.request({
        'method' : 'digium.confapp',
        'parameters' : {
            'action' : 'register',
			'phonename' : app_config['settings']['user'],
			'cid' : app_config['settings']['exten'];
        },
        'onSuccess' : function (p) {
            util.debug(JSON.stringify(p));
            win[0][1].label = p.result.foo.bar;
 
            var now = new Date();
 
            setTimeout(function() {request(win, visiblePredicate);}, 5001 - now.getMilliseconds());
        }.bind(this)
    });

// parameters to send for other actions

Parameters: {"action":"register","phonename":"alan","cid":"600"}
Parameters: {"action":"unregister","phonename":"alan"}
Parameters: {"action":"mute","cid":"100"}
Parameters: {"action":"unmute","cid":"100"}
Parameters: {"action":"kick","cid":"100"}

*/

/*
AMI DATA { event: 'DPMAMessage',
  privilege: 'agent,all',
  requestid: 'aeprox152239181',
  method: 'digium.confapp',
  format: 'JSON',
  parameters: '{"action":"register","phonename":"ryan","cid":"601"}' }
{"action":"register","phonename":"ryan","cid":"601"}
*/

// parse actions sent from phones
// then send respective action to Asterisk over AMI
var parseFromConfApp = function(data) {
    var params = JSON.parse(data.parameters),
		action = params.action,
	    cid = params.cid,
	    phonename = params.phonename,
	    reqid = data.requestid,
		room = getRoom(cid),
		channel = getChannel(room, cid);
    switch (action) {
	case 'register':
		register(room, cid, phonename, reqid);
		break;
	case 'unregister':
		unregister(room, phonename);
		break;
    case 'mute':
        mute(room, channel);
        break;
    case 'unmute':
        unmute(room, channel);
        break;
    case 'kick':
        kick(room, channel);
        break;
    default:
        console.log(params);
        break;
    };
};

var getRoom = function(cid) {
	var room = ''; 
	for (var roomName in conferences) {
        if (conferences[roomName].hasOwnProperty(cid)) {
			var room = roomName;
		break;
		};
	};
	return room;
};

var getChannel = function(room, cid) {
	var channel = '';
	for (var roomName in conferences) {
        if (conferences[roomName].hasOwnProperty(cid)) {
			var channel = conferences[roomName][cid].channel;
		break;
		};
	};
	return channel;
};

var register = function(room, cid, phonename, reqid) {
	var response = false;
	if (room && conferences[room]) {
		response = conferences[room];
		if (!phones[room]) { 
			phones[room] = {}; 
			phones[room][phonename] = cid;
		} else { 
			phones[room][phonename] = cid;
		};
	};
	response = JSON.stringify(response);
	ami.send({
		Action: 'DPMAMessageResponse',
        Response: response,
		Format: 'JSON',
		RequestID: reqid
	});
};

var unregister = function(room, phonename) {
	delete phones[room][phonename];
};

var mute = function(room, channel) {
	ami.send({
		Action: 'ConfbridgeMute',
		Conference: room,
		Channel: channel
	});
};

var unmute = function(room, channel) {
	ami.send({
		Action: 'ConfbridgeUnmute',
		Conference: room,
		Channel: channel
	});
};

var kick = function(room, channel) {
	ami.send({
		Action: 'ConfbridgeKick',
		Conference: room,
		Channel: channel
	});
};

process.on('SIGINT', function () {
	ami.disconnect();
	process.exit(0);
});

