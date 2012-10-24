var app = require('app');
app.init();

digium.handlers.onstart = function() {
    var message = new Text(0,0,window.w, window.h);
    message.labelSize = window.h/ 3;
    message.align(Widget.CENTER);
    message.label = "Hello World!";
    window.add(message);
    print("Hello World! on the debug console\n");
};
