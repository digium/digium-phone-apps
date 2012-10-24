Customer Relationship Management Example
========================================

This application demonstrates hooking call events to display a screen pop on the
phone on an incomming call.

Requirements:
curl, node.js, bash, JavaScript Lint


$ # this is the IP address of your development phone.
$ export IP_ADDRESS=192.168.0.10
$ # edit startup.js and set your default server in local config.
$ ./update install install
$ # Edit server.js and add names, numbers that will match the callerid of your inbound calls.
$ node server.js &
$ Start the application on the phone. Menu -> Applications -> CRM

Call the phone with the callerid you set in server.js and the phone will fetch
and display the note you added in server.js
