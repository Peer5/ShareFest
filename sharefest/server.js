var express = require('express');
var app = express();
var ws = require('../core/transport/WebSocketServer.js');

var config = require('../serverConfig.json');
var router = require('./server/lib/router.js');
var tracker = require(config.trackerPath);
var server;
var https = require('https');
var fs = require('fs');

var allowCrossDomain = function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header('Access-Control-Allow-Headers', 'Range');
    next();
}

if (process.env.REQUIRE_HTTPS) {
    app.use(function (req, res, next) {
        if (!req.secure) {
            return res.redirect('https://' + req.get('Host') + req.url);
        }
        next();
    });
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
    var options = {
        // Important: the following crt and key files are insecure
        // replace the following files with your own keys
        key:fs.readFileSync('secret/private.key'),
        ca:[fs.readFileSync('secret/AddTrustExternalCARoot.crt'),
            fs.readFileSync('secret/SSLcomAddTrustSSLCA.crt')],
        cert:fs.readFileSync('secret/www_sharefest_me.crt')
    };
    app.use(express.errorHandler({ dumpExceptions:true, showStack:true }));
//    wsPort = process.env.WS_PORT || 443;

    peer5.log('listening to port 80');
    server80 = app.listen(80);

    peer5.log('listening to port 443');
    server = https.createServer(options, app).listen(443);

    ws.instance.start(tracker.instance, server, null, config.clientTimeout);
//    signaling.start(server);
});

router.configure(app, __dirname);