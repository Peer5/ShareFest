var express = require('express');
var app = express();
var signaling = require('./server/lib/signalingServer.js');
var router = require('./server/lib/router.js')
var server;

var allowCrossDomain = function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header('Access-Control-Allow-Headers', 'Range');
    next();
}

app.use(allowCrossDomain);
app.use(express.static(__dirname + '/public'));

app.configure('development', function () {
    app.use(express.errorHandler({ dumpExceptions:true, showStack:true }));
    console.log('listening to port 13337')
    server = app.listen(13337);
    signaling.start(server);
    console.log('here I am');
});

app.configure('production', function () {
    console.log('listening to port 80')
    server = app.listen(80); //nodejitsu will map this to 80
    signaling.start(server);
});

router.configure(app, __dirname);
