var util = require('util');
var app = require('app');
app.init();

var genericForm = require('genericForm');
var form_items = [
    {
        'text'        : 'Extension number',
        'setting'     : 'extension',
        'inputType'   : 'numeric',
        'validate'    : '[0-9][0-9][0-9]', 
        'errorMsg'    : 'Extension must be 3 digits in length',
        'inputParams' : {}
    },
    {
        'text'        : 'Password',
        'setting'     : 'password',
        'inputType'   : 'numeric',
        'validate'    : '[0-9]+',
        'errorMsg'    : 'Password must contain only digits',
        'inputParams' : {}
    }
];

digium.event.observe({
	'eventName'	: 'digium.app.foreground',
	'callback'	: function () {
        genericForm.show({
            'id'          : 'exampleForm',
            'labelWidth'  : (digium.phoneModel === 'D70') ? 140 : 125,
            'values' : {
                'extension' : '123',
                'password'  : ''
            },
            'inputs'      : form_items,
            'object'      : {
                processBack : function() {
                    util.debug("Back pressed.");
                    digium.background();
                },
                processSubmit : function() {
                    util.debug("Submitted presssed.");
                    for (var i = 0; i < form_items.length; i++) {
                        var setting = form_items[i].setting;
                        util.debug(setting + " : " + genericForm.getValue({'setting' : setting}));
                    }
                    digium.background();
                }
            },
            'title'       : 'Extension Login',
            'onkeyline1'  : digium.background,
            'onkeycancel' : digium.background,
            'forceRedraw' : true
        });
	}
});
