var express = require('express');
var app = express();
var ws = require('../core/transport/WebSocketServer.js');

var config = require('../serverConfig.json');
var router = require('./server/lib/router.js');
var tracker = require(config.trackerPath);
var server;

var allowCrossDomain = function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header('Access-Control-Allow-Headers', 'Range');
    next();
}

app.use(express.json());
app.use(express.compress());
app.use(allowCrossDomain);
app.use(express.static(__dirname + '/public'));

var server;
var wsPort;

app.configure('development', function () {
    app.use(express.errorHandler({ dumpExceptions:true, showStack:true }));
    console.log('listening to port 13337');
    server = app.listen(13337);
    ws.instance.start(tracker.instance, server, null, config.clientTimeout);
//    signaling.start(server);
    console.log('here I am');
});

app.configure('production', function () {
    app.use(express.errorHandler({ dumpExceptions:true, showStack:true }));
    console.log('listening to port 80');
    wsPort = process.env.WS_PORT || 443;
    server = app.listen(80); //nodejitsu will map this to 80
    ws.instance.start(tracker.instance,server,wsPort, config.clientTimeout);
//    signaling.start(server);
});

router.configure(app, __dirname);