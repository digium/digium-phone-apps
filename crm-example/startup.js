var app = require('app');
app.init({langFiles : ['strings-en_us']});
var screen = require('screen');
var util = require('util');
var genericConfirm = require('genericConfirm');

var local_config = util.defaults(app.getConfig().settings, {
    server: "http://10.19.135.2:8126"
});

var current_call = null;
var callGroup = new Group(0, 0, window.w, window.h);
var userGroup = new Group(0, 0, window.w, window.h);
var first_foreground = false;

function setup_call_group(group) {
    var label_width = 65;

    group.add(screen.setTitleText({ title: digium.app.name }));

    // First Row
    var label = new Text(0,Text.LINE_HEIGHT, label_width, Text.LINE_HEIGHT);
    label.label = "  Name : ";
    label.align(Widget.RIGHT);
    group.add(label);
    var field = new Text(label_width, Text.LINE_HEIGHT, group.w - label_width, Text.LINE_HEIGHT);
    field.align(Widget.LEFT);
    group.add(field);
    group.name = field;

    // Second Row
    label = new Text(0,Text.LINE_HEIGHT * 2, label_width, Text.LINE_HEIGHT);
    label.label = "Number : ";
    label.align(Widget.RIGHT);
    group.add(label);
    field = new Text(label_width, Text.LINE_HEIGHT * 2, group.w - label_width, Text.LINE_HEIGHT);
    field.label = "";
    field.align(Widget.LEFT);
    group.add(field);
    group.number = field;

    // Third Row
    label = new Text(0,Text.LINE_HEIGHT * 3, label_width, Text.LINE_HEIGHT);
    label.label = "Notes : ";
    label.align(Widget.RIGHT);
    group.add(label);

    // Fourth Row
    field = new Text(label_width, Text.LINE_HEIGHT * 3, group.w - label_width,  group.h - (Text.LINE_HEIGHT * 3));
    field.align(Widget.LEFT | Widget.WRAP | Widget.TOP);
    field.label = "";
    group.add(field);
    group.notes = field;
}

function setup_user_group(group) {
    var message  = new Text(0,0,group.w, group.h);
    message.align(Widget.CENTER);
    message.label = app.t("HELLO");
    group.add(screen.setTitleText({ title: digium.app.name }));
    group.add(message);
    group.message = message;
}

var onstart = function() {
    print("onstart() called\n");
    setup_call_group(callGroup);
    setup_user_group(userGroup);
    userGroup[1].label = digium.app.name + " is running.";
};
digium.event.observe({
    'eventName' : 'digium.app.start',
    'callback'  : onstart
});

digium.app.exitAfterBackground = false;
var onbackground = function() {
    print("onbackground() called\n");
};
digium.event.observe({
    'eventName' : 'digium.app.background',
    'callback'  : onbackground
});

function set_incoming_call_softkeys(win) {
    win.clearSoftkeys();
    win.setSoftkey(1, app.t('ANSWER_KEY'), function() {
        digium.phone.answer(current_call);
    });
    win.setSoftkey(2, app.t('REJECT_KEY'), function() {
        digium.phone.reject(current_call);
    });
}

function set_oncall_softkeys(win) {
    win.clearSoftkeys();
    win.setSoftkey(1, app.t('END_KEY'), function() {
        digium.phone.hangup(current_call);
    });
}

function fetch_notes(callerid) {
    var request = new NetRequest();
    request.open("GET", local_config.server + "/" + callerid.name.replace(/\ /, '%20'), true);
    request.onreadystatechange = function() {
        // The call could have been disconnected before the lookup completed.
        if ( !current_call ) {
            return;
        }

        if (4 == request.readyState) {
            if (200 == request.status) {
                var crm_obj = JSON.parse(request.responseText);
                callGroup.notes.label = crm_obj.notes;
                if (crm_obj.title) {
                    callGroup.name.label = callGroup.name.label + ", " + crm_obj.title;
                }
            } else {
                print("request error: " + request.status + " : " + request.statusText + "\n");
            }
        }
    };
    request.setTimeout(3000);
    request.send();
}

var onforeground = function() {
    print("onforeground() called\n");
    if (!current_call) {
        window.clear();
        window.clearSoftkeys();
        window.setSoftkey(4, app.t('SHUTDOWN_KEY'), function() {
            // If the user presses the SHUTDOWN softkey, throw up a confirmation
            // dialog box to confirm that they really want the CRM application
            // to be shutdown.
            genericConfirm.show({
                id : 'confirm_shutdown',
                message : 'Would you like to shutdown the CRM app?',
                title   : 'Confirm Shutdown',
                object  : { processConfirm: function(params) {
                        if (params.confirm === true) {
                            // Removing the onbackground handler will cause the
                            // application to shutdown when trying to background
                            // the application.
                            digium.app.exitAfterBackground = true;
                            digium.background();
                        } else {
                            digium.foreground();
                        }
                    }
                },
                confirmBtnText : 'Shutdown',
                hideCancelButton : false,
                cancelBtnText : 'Cancel'
            });
        });
        window.add(userGroup);
        return;
    } else {
        window.clear();
        if ("CONFIRMED" == current_call.state) {
            set_oncall_softkeys(window);
        } else {
            set_incoming_call_softkeys(window);
        }
        var callerid = get_callerid(current_call.remoteInfo);
        callGroup.name.label = callerid.name;
        callGroup.number.label = callerid.number;
        callGroup.notes.label = "retrieving...";
        fetch_notes(callerid);
        window.add(callGroup);
    }
};
digium.event.observe({
    'eventName' : 'digium.app.foreground',
    'callback'  : onforeground
});

var onexit = function() {
    print("onexit() called\n");
};
digium.event.observe({
    'eventName' : 'digium.app.exit',
    'callback'  : onexit
});

function get_callerid(remoteInfo) {
    var obj = {};
    var parts = remoteInfo.split('"');
    obj.name = parts[1];
    obj.number = parts[2].split(':')[1].split('@')[0];
    return obj;
}

function handle_new_call(params) {
    var msg = params.eventData;
    print("on new called:\n");
    print("  state: " + msg.state +"\n");
    print("  accountSlot: " + msg.accountSlot + "\n");
    print("  callHandle: " + msg.callHandle + "\n");
    print("  remoteInfo: " + msg.remoteInfo + "\n");
    print("  remoteContact: " + msg.remoteContact + "\n");
    print("  lastStatus: " + msg.lastStatus + "\n");
    print("  lastStatusText: " + msg.lastStatusText + "\n");
    print("  mediaStatus: " + msg.mediaStatus + "\n");

    if ( "CALLING" == msg.state) {
        if ( null === current_call) {
            current_call = msg;
            digium.foreground();
        }
    }

    digium.phone.observeCallEvents({
        callHandle : msg.callHandle,
        handler : function (obj) {
            println(obj.callHandle + " now " + obj.state);
            if ( "EARLY" == obj.state) {
                if ( null === current_call) {
                    current_call = obj;
                    digium.foreground();
                }
            } else if ( "CONFIRMED" == obj.state) {
                print("CONFIRMED\n");
                current_call = obj;
                set_oncall_softkeys(window);
            } else if ( "DISCONNCTD" == obj.state) {
                current_call = null;
                digium.background();
            }
        }
    });
}

digium.event.observe({
    'eventName' : 'digium.phone.incoming_call',
    'callback'  : handle_new_call 
});
