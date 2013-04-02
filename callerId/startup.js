//require all the necessary library files
var app = require('app');
app.init();
var screen = require('screen');
var util = require('util');
var genericConfirm = require('genericConfirm');

var callerId = {};

//create the callGroup widgets - these are the widgets that are displayed when
//an incoming call is detected and display the caller's caller id info and a notes
//field that may be populated with info requested from an external server
callerId.renderCallGroup = function () {
	var widgets = this.widgets.callGroup;
	var group = widgets.group;
    var label_width = 65;

	//add a title bar to the top of the screen
    group.add(screen.setTitleText({ title: digium.app.name }));

    // First Row
    var label = new Text(0,Text.LINE_HEIGHT, label_width, Text.LINE_HEIGHT);
    label.label = "  Name : ";
    label.align(Widget.RIGHT);
    group.add(label);
    var field = new Text(label_width, Text.LINE_HEIGHT, group.w - label_width, Text.LINE_HEIGHT);
    field.align(Widget.LEFT);
    group.add(field);
	widgets.name = field;

    // Second Row
    label = new Text(0,Text.LINE_HEIGHT * 2, label_width, Text.LINE_HEIGHT);
    label.label = "Number : ";
    label.align(Widget.RIGHT);
    group.add(label);
    field = new Text(label_width, Text.LINE_HEIGHT * 2, group.w - label_width, Text.LINE_HEIGHT);
    field.align(Widget.LEFT);
    group.add(field);
	widgets.number = field;

    // Third Row
    label = new Text(0,Text.LINE_HEIGHT * 3, label_width, Text.LINE_HEIGHT);
    label.label = "Notes : ";
    label.align(Widget.RIGHT);
    group.add(label);
    field = new Text(label_width, Text.LINE_HEIGHT * 3, group.w - label_width,  group.h - (Text.LINE_HEIGHT * 3));
    field.align(Widget.LEFT | Widget.WRAP | Widget.TOP);
    group.add(field);
	widgets.notes = field;
}

//create the userGroup widgets - these are the widgets that are displayed when
//there is no incoming call and the app is in an idle state
callerId.renderUserGroup = function () {
	var widgets = this.widgets.userGroup;
	var group = widgets.group;

    var message  = new Text(0,0,group.w, group.h);
    message.align(Widget.CENTER);
    group.add(screen.setTitleText({ title: digium.app.name }));
    group.add(message);
	widgets.message = message;
};

//set up the event listeners for the app
callerId.bindListeners = function () {
	//executed when the app is foregrounded (or when digium.foreground() is called when the app is already in the foreground)
	digium.event.observe({
		'eventName'		: 'digium.app.foreground',
		'callback'		: this.show.bind(this)
	});

	//executed when the app is backgrounded.
	digium.event.observe({
		'eventName'		: 'digium.app.background',
		'callback'		: function () { 
			//if the app is backgrounded during a call, do not foreground the app after the call ends (unless the app has been foregrounded again)
			if (this.currentCall) {
				this.afterCall = function () {
					if (digium.app.inForeground) {
						this.show();
					}
				};
			}
			print("onbackground() called\n");
		}.bind(this)
	});

	//executed when the app is shut down - any cleanup operations required when a user quits can be executed here
	digium.event.observe({
		'eventName'		: 'digium.app.exit',
		'callback'		: function () {
			print("onexit() called\n");
		}
	});

	//executed when the phone receives an incoming call
	//foregrounds the app and requests call info from the server
	digium.event.observe({
		'eventName'		: 'digium.phone.incoming_call',
		'callback'		: this.handleNewCall.bind(this)
	});
};

//set the window's softkeys during an incoming call
callerId.setIncomingCallSoftkeys = function () {
	//clear any softkeys that are already set
	window.clearSoftkeys();

	//set the first softkey to allow the user to answer the call
	window.setSoftkey(1, app.t('ANSWER_KEY'), function() {
		digium.phone.answer(this.currentCall);
	}.bind(this));

	//set the second softkey to allow the user to ignore the call and return to the app's user screen
	window.setSoftkey(2, app.t('REJECT_KEY'), function() {
		digium.phone.reject(this.currentCall);
	}.bind(this));
};

//set the window's softkeys for an answered call
callerId.setOnCallSoftkeys = function () {
	window.clearSoftkeys();
	window.setSoftkey(1, app.t('END_KEY'), function() {
		digium.phone.hangup(this.currentCall);
	}.bind(this));
};

//issue a NetRequest to an external server to retrieve any information about the incoming caller
callerId.fetchNotes = function(params) {
	var callerId = params.callerId;

	//create the NetRequest object (similar to a standard XMLHttpRequest object in a web browser)
	var request = new NetRequest();
	//assign the caller id name as the 'name' url parameter
	request.open("GET", this.config.server + "?name=" + encodeURI(callerId.name), true);

	//register a callback for any changes in the connection state
	//if the server responds with any info about the caller this function
	//will update the 'notes' field in the callGroup
	request.onreadystatechange = function() {
		// The call could have been disconnected before the lookup completed.
		if ( !this.currentCall ) {
			return;
		}

		//(readyState === 4) indicates a completed request
		var callGroup = this.widgets.callGroup;
		if (4 == request.readyState) {
			if (200 == request.status) {
				try {
					//the server should return a valid JSON response
					var callerId_obj = JSON.parse(request.responseText);

					//set the text of the 'notes' field to the value of the response's 'notes' property
					callGroup.notes.label = callerId_obj.notes;

					//add the caller's title to the incoming call name if any
					if (callerId_obj.title) {
						callGroup.name.label = callGroup.name.label + ", " + callerId_obj.title;
					}
				} catch (e) {
					callGroup.label = '';
					util.debug('request error: ' + JSON.stringify(e));
				}
			} else {
				callGroup.notes.label = '';
				util.debug('request error: ' + request.status);
			}
		}
	}.bind(this);

	//abort the NetRequest after 3 seconds
	request.setTimeout(3000);
	request.send();
};

//callerId.show will be bound to the 'digium.app.foreground' event
//this function is called whenever the app is foregrounded, or digium.foreground() is called
callerId.show = function () {
	print("onforeground() called\n");
	if (!this.currentCall) {
		//if there is no current call, the main screen is displayed with a button to shut down the app
		window.clear();
		window.clearSoftkeys();
		window.setSoftkey(4, app.t('SHUTDOWN_KEY'), function() {
			// If the user presses the SHUTDOWN softkey, display a dialog
			// box to confirm that they really want the callerId application
			// to be shutdown.
			var obj = {
				'processConfirm'	: function (params) {
					if (params.confirm) {
						digium.app.exitAfterBackground = true;
						digium.background();
					} else {
						this.show();
					}
				}.bind(this)
			};

			//the genericConfirm library gives a simple interface to display message prompts to the user
			genericConfirm.show({
				'id'				: 'confirm_shutdown',
				'message'			: app.t('CONFIRM_EXIT_MSG'),
				'title'				: app.t('CONFIRM_EXIT_TITLE'),
				'object'			: obj,
				'confirmBtnText'	: app.t('SHUTDOWN_KEY'),
				'hideCancelButton'	: false,
				'cancelBtnText'		: app.t('CANCEL')
			});
		}.bind(this));

		//add the userGroup widgets to the screen
		window.add(this.widgets.userGroup.group);
		return;
	} else {
		//if there is a current call different widgets are displayed
		window.clear();

		//set the correct softkeys for either an ongoing call or an incoming call
		if ("CONFIRMED" == this.currentCall.state) {
			this.setOnCallSoftkeys();
		} else {
			this.setIncomingCallSoftkeys();
		}

		//set the incoming call screen name and number fields to the caller id information
		var callerid = this.getCallerId({'remoteInfo' : this.currentCall.remoteInfo});
		this.widgets.callGroup.name.label = callerid.name;
		this.widgets.callGroup.number.label = callerid.number;
		this.widgets.callGroup.notes.label = app.t('RETRIEVING');

		//retrieve and display any notes for this caller - this function issues an api request to an external server
		//information retrieved from the server is added to the 'notes' field on the screen
		this.fetchNotes({'callerId' : callerid});

		//add the callGroup widgets to the screen, displaying the caller's info
		window.add(this.widgets.callGroup.group);
	}
};

//parse the incoming call object for caller id information
callerId.getCallerId = function(params) {
	var remoteInfo = params.remoteInfo;
	var obj = {};
	var parts = remoteInfo.split('"');
	obj.name = parts[1];
	//extract the number from the sip url that is listed in remoteInfo
	obj.number = parts[2].split(':')[1].split('@')[0];
	return obj;
};

//callerId.handleNewCall will be bound to the incomingCall event
//this function will be called whenever the app detects an incoming call
//it displays the incoming call's caller id info and attaches a handler to the call status
callerId.handleNewCall = function (params) {
	var msg = params.eventData;
	//if the app is already in the foreground end the call by returning to the main screen
	//otherwise, the app is foregrounding itself to handle the call, and should background after
	//the call ends
	this.afterCall = (digium.app.inForeground) ? this.show : digium.background;

	if ( "CALLING" == msg.state) {
		if ( null === this.currentCall) {
			this.currentCall = msg;
			digium.foreground();
		}
	}

	//listen for changes in the current call's state
	//this function will show the 'on call' screen when the user picks up
	//and hide the incoming/on call screen when the current call ends
	digium.phone.observeCallEvents({
		'callHandle'	: msg.callHandle,
		'handler'		: function(obj) {
			if ( "EARLY" == obj.state) {
				if ( null === this.currentCall) {
					this.currentCall = obj;
					digium.foreground();
				}
			} else if ( "CONFIRMED" == obj.state) {
				print("CONFIRMED\n");
				this.currentCall = obj;
				//add a softkey to end the call
				this.setOnCallSoftkeys();
			} else if ( "DISCONNCTD" == obj.state) {
				this.currentCall = null;
				this.setOnCallSoftkeys();
				//either background the app or return to the main screen after the call
				this.afterCall();
			}
		}.bind(this)
	});
};

//initialize variables and set up display widgets
callerId.init = function () {
	//cache the app's config settings with default values
	var config = app.getConfig().settings;
	this.config = util.defaults(config, {
		'server'	: 'http://10.10.7.130/callerId_phone_app.php'  //CHANGE THIS TO YOUR SERVER ADDRESS
	});
	this.currentCall = null;
	digium.app.exitAfterBackground = false;

	//create group widgets to contain the various UI elements
	var callGroup = new Group(0, 0, window.w, window.h);
	var userGroup = new Group(0, 0, window.w, window.h);
	this.widgets = {
		'callGroup'		: {'group' : callGroup},
		'userGroup'		: {'group' : userGroup}
	};

	//render the various UI components (widgets placed into the groups defined above)
	this.renderCallGroup();
	this.renderUserGroup();
	//set the status message for the main screen
	this.widgets.userGroup.message.label = digium.app.name + " is running.";
	//set up the event listeners to react to incoming calls, app foregrounding, etc.
	this.bindListeners();
};

//execute the init function immediately when this app is started
callerId.init();
