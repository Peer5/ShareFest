var socketio = require('socket.io');
var io;
var url = require('url');
var matcher = require('./matcher.js');
var proto = require('./public/shared/protocol.js');
//var rooms = require('rooms.js');

exports.start = function (server) {
    io = socketio.listen(server);
    io.on('connection', function (socket) {

        socket.room = url.parse(socket.handshake.headers.referer).pathname;
        socket.join(socket.room);

        var peers = matcher.join(socket.room,socket.id);
        socket.emit('match', new proto.Match(peers))

        //TODO: notify other peers about this match (more secured)
//        socket.broadcast.emit('message','user connected');

        socket.on('join', function (msg) {
            users[users.length] = socket.id;
        });

        socket.on('sdp',function(sdp){

        });


        socket.on('data', function (data) {
            socket.broadcast.to(socket.room).emit('data', data);
        });

        socket.on('message', function (msg) {
            socket.broadcast.to(socket.room).emit('message', msg + ' from ' + socket.id);
        });

        socket.on('offer', function (msg) {
            socket.broadcast.to(socket.room).emit('offer', msg);

//            for (var i = 0; i < users.length; ++i) {
//                if (users[i] != socket.id) {        //publishing the offer to all other users
//                    this.sendOffer(socket.id, msg);
//                }
//            }
        });

        socket.on('answer', function (msg) {    //msg = {socketid:...,data:...}
            this.answer(msg.socketid, msg);
        });

        socket.on('disconnect', function (msg) {
            matcher.leave(socket.room, socket.id);
            socket.broadcast.to(socket.room).emit('message', 'bye from ' + socket.id);
        });
    });
}

exports.send = function (socketId, message) {
    var s = io.sockets.sockets[socketId];
    if (s) {
        s.emit('send', message);
    }
};

exports.offer = function (socketId, message) {
    var s = io.sockets.sockets[socketId];
    if (s) {
        s.emit('offer', message);
    }
};

exports.answer = function (socketId, message) {
    var s = io.sockets.sockets[socketId];
    if (s) {
        s.emit('answer', message);
    }
};
