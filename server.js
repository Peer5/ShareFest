var express = require('express');
var app = express();
var signaling = require('./signalingServer.js');
var server;
var rooms = require('./rooms.js');

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

app.get('/browser', function (req, res) {
    res.sendfile(__dirname + '/public/browser.html');
});

app.get('/about', function (req, res) {
    res.redirect("https://github.com/peer5/sharefest");
});

app.get('/contact', function (req, res) {
    res.redirect("https://github.com/peer5/sharefest");
});


app.get('/:id', function (req, res) {
    var roomId = req.params.id;
    var room = rooms.getRoom(roomId);
//    displayRoom(room);

    //todo: bind the room info to the page and output
    res.sendfile(__dirname + '/public/index.html');
    //res.send(room);
});

