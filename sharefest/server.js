var express = require('express');
var app = express();
var ws = require('../core/transport/WebSocketServer.js');
var https = require('https');
var fs = require('fs');

var config = require('../serverConfig.json');
var router = require('./server/lib/router.js');
var tracker = require(config.trackerPath);

var allowCrossDomain = function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header('Access-Control-Allow-Headers', 'Range');
    next();
};

process.chdir(__dirname);

if (!process.env.REQUIRE_HTTPS) {
    app.use(function (req, res, next) {
        if (!req.secure) {
            res.redirect('https://' + req.get('Host') + req.url);
        } else next();
    });
}

app.use(express.json());
app.use(express.compress());
app.use(allowCrossDomain);
app.use(express.static(__dirname + '/public'));

var server;

app.configure('development', function () {
//    app.use(express.errorHandler({ dumpExceptions:true, showStack:true }));
//    console.log('listening to port 13337');
//    server = app.listen(13337);
//    ws.instance.start(tracker.instance, server, null, config.clientTimeout);
//    console.log('here I am');
//});
//
//app.configure('production', function () {
    var options = {
        key:fs.readFileSync('server/secret/private.key'),
        cert:fs.readFileSync('server/secret/self.crt')
    };
    app.use(express.errorHandler({ dumpExceptions:true, showStack:true }));

    console.log('listening to port 80');
    server80 = app.listen(80);

    console.log('listening to port 443');
    server = https.createServer(options, app).listen(443);
    ws.instance.start(tracker.instance,server, null, config.clientTimeout);
    //signaling.start(server);
});

router.configure(app, __dirname);