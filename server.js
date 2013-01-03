var express = require('express');
var app = express();
require('./signalingServer.js');
var server;
var rooms = require('./rooms.js');

var allowCrossDomain = function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header('Access-Control-Allow-Headers', 'Range');
    next();
}

app.use(allowCrossDomain);
app.use(express.static(__dirname + '/public'));
app.use(express.static(__dirname + '/chromeExample'));



app.configure('development', function () {
    app.use(express.errorHandler({ dumpExceptions:true, showStack:true }));
    server = app.listen(13337);
    console.log('here I am');
});

app.configure('production', function () {
    server = app.listen(8000); //nodejitsu will map this to 80
});

app.get('/room/:id', function (req, res) {
    var roomId = req.params.id;
    var room = rooms.getRoom(roomId);
//    displayRoom(room);
    res.send(room);
})