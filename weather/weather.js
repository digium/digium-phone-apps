// TODO: find out why app.init() is required for a forground app but not a
// widget
var app = require('app');
app.init();

var util = require('util');

// get our config and set defaults
var app_config = app.getConfig();
app_config = util.defaults(app_config.settings, {
    api_key : 'xxxxxxxxxxxxxx',
    zipcode : '35758',
    temp_scale : 1, // 1=f or 2=c
    wind_units : 1, // 1=mph or 2=kph
    //server : 'http://api.wunderground.com/api/'
    server : 'http://192.168.0.1:8125/'
});

var local_config = {}; // cache our local config so that we can use util.defaults()
var timer; // keep track of our timer so that we never have more than one

var form = require('genericForm');
digium.handlers.onbackground = function() {};

var current_weather = {
    location : "",
    temp : "",
    description : "",
    relative_humidity : "",
    wind_speed : "",
    wind_dir : "",
    icon : "unknown.gif"
};

function refresh_display(win) {
    win[0] = new Image("app", current_weather['icon'], 0, 0, 50, 50);
    win[1].label = current_weather['location'];
    win[2].label = current_weather['temp'];
    win[3].label = current_weather['description'];
    win[4].label = 'Humidity: ' + current_weather['relative_humidity'];
    if (1 == app_config.wind_units) {
        win[5].label = 'Wind: ' + current_weather['wind_speed'] + ' mph ' + current_weather['wind_dir'];
    } else {
        win[5].label = 'Wind: ' + current_weather['wind_speed'] + ' kph ' + current_weather['wind_dir'];
    }
}

function get_weather(win) {
    print ("get_weather() start\n");

    // any local_config settings take priority
    local_config = util.defaults(local_config, app_config);

    var request = new NetRequest();
    request.open("GET", local_config.server + local_config.api_key + "/conditions/q/" + local_config.zipcode + ".json", true);

    request.onreadystatechange = function () {
            if (4 == request.readyState) {
                if (200 == request.status) {
                    var weather_response = eval('(' + request.responseText + ')');
                    print("got weather for: " + weather_response.current_observation['display_location']['full'] + "\n");
                    current_weather['location'] = weather_response.current_observation['display_location']['full'];
                    if (1 == local_config.temp_scale) {
                        current_weather['temp'] = weather_response.current_observation['temp_f'] + " F";
                    } else {
                        current_weather['temp'] = weather_response.current_observation['temp_c'] + " C";
                    }
                    current_weather['description'] = weather_response.current_observation['weather'];
                    current_weather['relative_humidity'] = weather_response.current_observation['relative_humidity'];
                    if (1 == local_config.wind_units) {
                        current_weather['wind_speed'] = weather_response.current_observation['wind_mph'];
                    } else {
                        current_weather['wind_speed'] = weather_response.current_observation['wind_kph'];
                    }
                    current_weather['wind_dir'] = weather_response.current_observation['wind_dir'];

                    // get our icon and make it short
                    var icon = weather_response.current_observation['icon_url'];
                    icon = icon.replace(/.*\//, '');
                    current_weather['icon'] = icon;

                    refresh_display(win);

                } else {
                    print("request error: " + request.status + " : " + request.statusText + "\n");
                }
            } else {
                print ("readyState = " + request.readyState + "\n");
            }
    };

    request.send(null);

    // TODO: make timeout configurable
    // every 1 hours
    clearInterval(timer); // reset if we have one running
    timer = setTimeout(function() { get_weather(win) ;}, 3600000) ;
    print ("get_weather() end\n");
}

function setup(win) {
    var cursor = 0;

    print("setup() start\n");

    print("window width = " + win.w + "\n");

    var img = new Image("app", "unknown.gif", 0, 0, 50, 50);
    win.add(img);

    for (var i=0; i<5; i++) {
        var label = new Text(50, cursor * Text.LINE_HEIGHT, win.w - 50, Text.LINE_HEIGHT);
        cursor++;
        label.align(Widget.CENTER);
        win.add(label);
    }

    get_weather(win);

    print("setup() end\n");
}

function go(win, visiblePredicate) {
    // don't update widgets when we're in the background.
    if (!visiblePredicate())
        return ;

    print("go()\n");

    refresh_display(win);

}

var form_items = [
{
    text       : 'zip code',
    setting    : 'zipcode',
    inputType  : 'numeric',
    validate   : '[0-9]+',
    errorMsg   : 'zip code must be exactly 5 numerical digits',
    inputParams   : {maxLength : 5 }
},
{
    text      : 'Temperature Scale',
    setting   : 'temp_scale',
    inputType   : 'selectInput',
    inputParams  : {
        title : 'Temperature Scale',
        options : [
            {display: 'Fahrenheit', value : 1},
            {display: 'Celcius', value : 2}
        ]
    }
},
{
    text      : 'Wind Units',
    setting   : 'wind_units',
    inputType   : 'selectInput',
    inputParams  : {
        title : 'Wind Units',
        options : [
            {display: 'MPH', value : 1},
            {display: 'KPH', value : 2}
        ]
    }
}
];

function save_prefs() {
    var settings = ['zipcode', 'temp_scale', 'wind_units'];

    // save to local storage
    for (var i=0; i<settings.length; i++) {
        var setting = settings[i];
        // cache local settings so that we can use util.defaults()
        local_config[setting] = form.getValue({setting: setting});
        //localStorage.setItem(setting, local_config[setting]);
        print(setting + " is " + local_config[setting] + "\n");
    }
}

form.processSubmit = function() {
    save_prefs();
    get_weather(digium.app.idleWindow);
    digium.background();
};

// use the main window for preferences
digium.handlers.onforeground = function() {
    // any local_config settings take priority
    local_config = util.defaults(local_config, app_config);

    form.show({
        id    : 'preferencesForm',
        labelWidth    : ('D70' == digium.phoneModel) ? 140 : 125,
        values : {
            zipcode    : local_config['zipcode'],
            temp_scale : local_config['temp_scale'],
            wind_units : local_config['wind_units']
        },
        inputs : form_items,
        object : form,
        title : 'Weather Preferences',
        onkeyline : save_prefs,
        onkeycancel : digium.background,
        forceRedraw : true
    });
};

// set up the idlescreen window.
digium.app.idleWindow.hideBottomBar = true;
setup(digium.app.idleWindow) ;
digium.handlers.onshowidlescreen =
    function() {
        go(digium.app.idleWindow,
           function() { return digium.app.idleWindowShown ; } ) ;
    } ;


print('done loading weather\n');
