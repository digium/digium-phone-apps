var app = require('app');
app.init();
var util = require('util');
var form = require('genericForm');
var genericConfirm = require('genericConfirm');


var app_config,
	timer,
	current_weather,
	form_items,
	local_config;

function init() {
	// get our config and set defaults
	var config = app.getConfig();
	app_config = util.defaults(config.settings, {
		'api_key' : '', //YOUR API KEY HERE
		'zipcode' : '90210',
		'temp_scale' : 1, // 1=f or 2=c
		'wind_units' : 1 // 1=mph or 2=kph
	});

	try {
		var configFile = digium.readFile('nv', 'settings.json');
		local_config = JSON.parse(configFile);
	} catch (e) {
		local_config = {};
	}

	current_weather = {
		"location" : "",
		"temp" : "",
		"description" : "",
		"relative_humidity" : "",
		"wind_speed" : "",
		"wind_dir" : "",
		"icon" : "unknown.gif"
	};
	form_items = get_form_items();
	digium.app.exitAfterBackground = false;
	setup(digium.app.idleWindow) ;
}


//Add the new weather data to the on-screen widgets
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

//Handle API request errors. Displays the error to the user and exits
function apiResponseError(params) {
		var error = params.error;
		digium.app.exitAfterBackground = true;
		var obj = {
			'processConfirm' : function () {
				digium.background();
			}
		};
		var msg = 'Error with request';
		msg += '\nType: ' + error.type;
		msg += '\nDescription: ' + error.description;
		genericConfirm.show({
			'confirmBtnText'	: 'OK',
			'message'			: msg,
			'title'				: 'Error Retrieving Weather',
			'object'			: obj,
			'hideCancelButton'	: true
		});
}

//Issue the API request to retrieve the weather.
function get_weather(win) {
	// any local_config settings take priority
	local_config = util.defaults(local_config, app_config);

	var request = new NetRequest();
    // No need to hit wunderground when developing.
	// request.open("GET", "http://api.wunderground.com/api/" + local_config.api_key + "/conditions/q/" + local_config.zipcode + ".json", true);
	request.open("GET", "http://10.19.135.2:8125/" + local_config.api_key + "/conditions/q/" + local_config.zipcode + ".json", true);

	request.onreadystatechange = function () {
			if (4 == request.readyState) {
				if (200 == request.status) {
					util.debug(JSON.stringify(request.responseText));
					var weather_response = JSON.parse(request.responseText);
					if (weather_response.response.error) {
						apiResponseError({'error' : weather_response.response.error});
						return;
					}
					current_weather.location = weather_response.current_observation['display_location']['full'];
					if (1 == local_config.temp_scale) {
						current_weather.temp = weather_response.current_observation['temp_f'] + " F";
					} else {
						current_weather.temp = weather_response.current_observation['temp_c'] + " C";
					}
					current_weather.description = weather_response.current_observation['weather'];
					current_weather.relative_humidity = weather_response.current_observation['relative_humidity'];
					if (1 == local_config.wind_units) {
						current_weather.wind_speed = weather_response.current_observation['wind_mph'];
					} else {
						current_weather.wind_speed = weather_response.current_observation['wind_kph'];
					}
					current_weather.wind_dir = weather_response.current_observation['wind_dir'];

					// get our icon and make it short
					var icon = weather_response.current_observation['icon_url'];
					icon = icon.replace(/.*\//, '');
					current_weather.icon = icon;

					refresh_display(win);

				} else {
					apiResponseError({
						'error' : {
							'type'			: 'HTTP Error',
							'description'	: 'Server returned status ' + request.status
						}
					});
					util.debug("request error: " + request.status + " : " + request.statusText + "\n");
				}
			}
	};

	request.send(null);

	clearInterval(timer); // reset if we have one running
	timer = setTimeout(function() { get_weather(win) ;}, 3600000) ;
}

//Create all the necessary widgets and add them to the screen
function setup(win) {
	var cursor = 0;

	var img = new Image("app", "unknown.gif", 0, 0, 50, 50);
	win.add(img);

	for (var i=0; i<5; i++) {
		var label = new Text(50, cursor * Text.LINE_HEIGHT, win.w - 50, Text.LINE_HEIGHT);
		cursor++;
		label.align(Widget.CENTER);
		win.add(label);
	}

	get_weather(win);
}

//Check if the app is visible and update the widgets
function go(win, visiblePredicate) {
	if (!visiblePredicate())
		return ;

	refresh_display(win);
}


//Write the user settings to a temp file
function save_prefs() {
	var settings = ['zipcode', 'temp_scale', 'wind_units'];

	local_config = {};
	for (var i = 0; i < settings.length; i++) {
		var setting = settings[i];
		local_config[setting] = form.getValue({'setting': setting});
	}
	digium.writeFile('nv', 'settings.json', JSON.stringify(local_config));
}

form.processSubmit = function() {
	save_prefs();
	get_weather(digium.app.idleWindow);
	digium.background();
};

form.processBack = function() {
    digium.background();
};

//return the data structure for the genericForm instance used to get 
//zip code, etc.
function get_form_items() {
	return [{
		'text'	  : 'zip code',
		'setting'   : 'zipcode',
		'inputType'   : 'numeric',
		'validate'   : '[0-9]+',
		'errorMsg'   : 'zip code must be exactly 5 numerical digits',
		'inputParams'   : {'maxLength' : 5 }
	},
	{
		'text'	  : 'Temperature Scale',
		'setting'   : 'temp_scale',
		'inputType'   : 'selectInput',
		'inputParams'  : {
			'title' : 'Temperature Scale',
			'options' : [
				{'display': 'Fahrenheit', 'value' : 1},
				{'display': 'Celcius', 'value' : 2}
			]
		}
	},
	{
		'text'	  : 'Wind Units',
		'setting'   : 'wind_units',
		'inputType'   : 'selectInput',
		'inputParams'  : {
			'title' : 'Wind Units',
			'options' : [
				{'display': 'MPH', 'value' : 1},
				{'display': 'KPH', 'value' : 2}
			]
		}
	}];
}

// use the main window for preferences, display the form when the
// app is foregrounded
digium.event.observe({
	'eventName'	: 'digium.app.foreground',
	'callback'	: function () {
		// any local_config settings take priority
		local_config = util.defaults(local_config, app_config);

		form.show({
			'id'	: 'preferencesForm',
			'labelWidth'	: 130,
			'values' : {
				'zipcode' : local_config['zipcode'],
				'temp_scale' : local_config['temp_scale'],
				'wind_units' : local_config['wind_units']
			},
			'inputs' : form_items,
			'object' : form,
			'title' : 'Weather Preferences',
			'onkeyline1' : save_prefs,
			'onkeycancel' : digium.background,
			'forceRedraw' : true
		});
	}
});

// set up the idlescreen window.
digium.app.idleWindow.hideBottomBar = true;
digium.event.observe({
	'eventName'	: 'digium.app.idle_screen_show',
	'callback'	: function () {
		go(
			digium.app.idleWindow,
			function() {
				return digium.app.idleWindowShown;
			}
		);
	} 
});

init();
util.debug('done loading weather\n');
