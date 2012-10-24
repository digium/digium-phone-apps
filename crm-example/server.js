var port = 8126;

var fs = require('fs');
var http = require('http');

var sruffell_record = {
    name  : "Shaun Ruffell",
    title : "Linux Kernel Developer",
    notes : "Likes Pina Coladas and getting caught in the rain.",
    phone : ["256-428-6000", "256-428-6001"]
};

var mspiceland_record = {
    name  : "Michael Spiceland",
    title : "Engineering Manager",
    notes : "Is not into health food but is into champagne.",
    phone : ["256-428-6002"]
};

var db = {};
db['/' + sruffell_record.name.replace(/\ /, '%20')] = sruffell_record;
db['/' + mspiceland_record.name.replace(/\ /, '%20')] = mspiceland_record;

var server = http.createServer(function (req, res) {
    res.writeHead(200, {'Content-Type': 'application/json'});
    console.log('Starting request for: ' + req.url);
    req.on('close', function() {console.log("Connection closed early");});

    for (var id in db) {
        if (id == req.url) {
            res.end(JSON.stringify(db[id]));
            return;
        }
    }

    res.end(JSON.stringify({notes: "Not Found"}));
});

server.clientError = function(exception) {console.log(exception);};
server.listen(port);
console.log('Server running on port ' + port);
