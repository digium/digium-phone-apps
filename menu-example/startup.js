var app = require('app');
app.init({langFiles : ['strings-en_us']});
var util = require('util');
var genericMenu = require('genericMenu');

function selectCallback(selection) {
    util.debug("Selected " + selection);
}

function helpCallback(selection) {
   util.debug("Getting help for " + selection);
}

function getInfo(selection) {
    util.debug("Getting info for " + selection);
}

digium.event.observe({
    'eventName' : 'digium.app.foreground',
    'callback'  : function() {
        var handler = {};
        //This handler is called when any assigned softkeys/hardkeys are pressed
        //It receives the id of the selected item and the action as parameters
        handler.processMenuAction = function (params) {
            switch (params.actionId) {
            case 'select':
                selectCallback(params.selectionId);
                break;
            case 'help':
                helpCallback(params.selectionId);
                break;
            case 'getInfo':
                getInfo(params.selectionId);
                break;
            case 'exit':
            default:
                digium.background();
                break;
            }
        };
        //the menu items are defined in an array
        var items = [
            {
                text  : 'Menu Entry 1',
                id    : 'item_1'
            },
            {
                text  : 'Menu Entry 2',   
                id    : 'item_2'
            },
            {
                text  : 'Menu Entry 3',
                id    : 'item_3'
            },
            {
                text  : 'Menu Entry 4',
                id    : 'item_4'
            }
        ];
        //the softkeys are defined in an array
        var softkeys = [
            {
                label     : 'Select',
                actionId  : 'select',
                icon      : app.images.softKeys.select
            },
            {
                label     : 'Help',
                actionId  : 'help'
            },
            {
                label     : 'Info',
                actionId  : 'getInfo'
            },
            {
                label     : 'Cancel',
                actionId  : 'exit'
            }
        ];
        //show the menu
        genericMenu.show({
            id            : 'menu_1',
            menu          : items,
            object        : handler,
            title         : 'Menu Title',
            softkeys      : softkeys,
            onkeyselect   : selectCallback,
            onkeycancel   : digium.background
        });
    }
});
