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

// require all the necessary libary files
var app = require('app');
app.init();
var screen = require('screen');
var util = require('util');
var genericMenu = require('genericMenu');
var pbx = require('pbx');

confApp = {}

// setup program inside of init
confApp.init = function () {
    util.debug("starting up");

    // cache the app's config settings with default values
    var config = app.getConfig();
    this.exten = config.settings.exten;
    this.user = config.account.username;

    // create handler object
    // expects processMenuAction method
    var handler = {};

    // selectCallbak for onkeyselect in globalMenu
    // debug to log key selections
    var selectCallback = function (selection) {
	util.debug("Selected " + selection);
    }

    // take the parameters from the AMI event
    // add users to the user list
    // update the onscreen menu
    var processParams = function (p) {
	users = [];
	info = p.result;
	if (!info)
	    info = p.eventData;
	if (info) {
	    for (var k in info) {
		if (info.hasOwnProperty(k)) {
		    users.push({ text: info[k].calleridname + " (" + info[k].calleridnum + ")", id: info[k].calleridnum });
		}
	    }
	    util.debug("Userlist: " + JSON.stringify(users));
	    globalMenu.menu = users; // add users to menu
	    genericMenu.show(globalMenu); // update the onscreen menu
	}
    };

    // take key press events and 
    // send action to the server 
    handler.processMenuAction = function(params) {
	if (undefined == params.actionId)
	    return;
	util.debug(params.actionId + " applied to " + params.selectionId);
	switch(params.actionId) {
	    case 'kick':
	    case 'mute':
	    case 'unmute':
		pbx.request( {
		    'method' : 'digium.confapp',
		    'parameters' : { 'action' : params.actionId, 'cid' : params.selectionId },
		    'onSuccess' : function (p) {
			util.debug("Success applying " + params.actionId + " to " + params.selectionId + ": " + JSON.stringify(p));
			processParams(p);
		    },
		    'onError' : function(p) {
			util.debug("Failure applying " + params.actionId + " to " + params.selectionId + ": " + JSON.stringify(p));
		    },
		});
		break;
	    case 'exit':
		digium.background();
		break;
	}
    };

    // create softkeys to use in globalMenu
    var softkeys = [
	{ label: "Kick", actionId: "kick" },
	{ label: "Mute", actionId: "mute" },
	{ label: "Unmute", actionId: "unmute" },
	{ label: "Exit", actionId: "exit" },
    ]; 

    // array of objects to represent items in the menu
    // gets passed to genericMenu.show()	
    var globalMenu = {
	'id'          : 'confApp_list',
	'menu'        : [],
	'softkeys'    : softkeys,
	'object'      : handler, // pass object with processMenuAction() method
	'title'       : "Current Conference",
	'onkeyselect' : selectCallback,
	'onkeycancel' : digium.background,
	'forceRedraw' : true // TODO get Malcolm to document this
    };

    // show the menu when the app starts
    genericMenu.show(globalMenu);

    // register to the server when app is started
    pbx.request( {
        'method' : 'digium.confapp',
        'parameters' : {
	    'action' : 'register',
	    'phonename' : confApp.user,
	    'cid' : confApp.exten,
	},
        'onSuccess' : function(p) {
	    util.debug("Got request result: " + JSON.stringify(p));
	    processParams(p);
	},
	'onError' : function(p) {
	    util.debug('We got an Error houston - this is p:');
	    util.debug(JSON.stringify(p));
	}
    });

    // use built-in listener to recieve updates from server-app
    digium.event.observe({
	'eventName' : 'digium.confapp.update',
	'callback' : function (params) {
	    util.debug("Event: " + JSON.stringify(params));
	    processParams(params);
	}
    });
};

//execute the init function immediately when this app is started
confApp.init();
