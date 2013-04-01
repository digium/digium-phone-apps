var app = require('app');
app.init();
var screen = require('screen'); screen.clear();
var hello = new Text(0, 0, window.w, Text.LINE_HEIGHT, 'Hello World');
window.add(hello)
