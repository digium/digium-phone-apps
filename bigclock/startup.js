
// Allows this application to run in the background.
digium.app.exitAfterBackground = false;

// Set up widgets for the window (a big, centered clock).  After this is
// done, the only thing that changes is the text content of the label.
function setup(win) {
    var label = new Text(0,0,win.w, win.h) ;
    label.labelSize = win.h/ 3 ;
    label.align(Widget.CENTER) ;
    win.add(label) ;

}

// Display the clock.  Called periodically in a timer, which stops getting
// rescheduled when the window is no longer visible.  visiblePredicate is
// a function that is called to determine if the window is visible (it's 
// different for a fullscreen window vs. an idlescreen window).
function go(win, visiblePredicate) {
    // don't update widgets when we're in the background.
    if (!visiblePredicate())
        return ;

    var now = new Date() ;

    var h = now.getHours() ;
    var ampm = "am" ;
    if (h>12) {
        ampm = "pm" ;
        h -=12 ;
    }

    var m = now.getMinutes() ;
    if (m < 10) m = "0" + m ;

    var s = now.getSeconds() ;
    if (s < 10) s = "0" + s ;

    win[0].label = h + ":" + m +":" + s + " " + ampm ;

    setTimeout(function() { go(win, visiblePredicate) ;}, 1001-now.getMilliseconds()) ;
}

// set up the fullscreen window, which is displayed when you run the app
// from the app screen.  Whenever the fullscreen window is displayed, 
// go() is called to start drawing the window.
setup(window) ;
digium.event.observe({
    'eventName'     : 'digium.app.foreground',
    'callback'      : function () { go(window, function() { return digium.app.inForeground ; }) ; }
});

// set up the idlescreen window.
digium.app.idleWindow.hideBottomBar = true ;
setup(digium.app.idleWindow) ;
digium.event.observe({
    'eventName'     : 'digium.app.idle_screen_show',
    'callback'      : function() {
        go(digium.app.idleWindow, 
           function() { return digium.app.idleWindowShown ; } ) ; 
    }
});
