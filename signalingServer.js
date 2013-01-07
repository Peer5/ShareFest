var socketio = require('socket.io');
var io;
var url = require('url');
var matcher = require('./matcher.js');
var proto = require('./public/shared/protocol.js');
var util = require('./util.js');
//var rooms = require('rooms.js');

exports.start = function (server) {
    io = socketio.listen(server);
    io.on('connection', function (socket) {
        var pathname = url.parse(socket.handshake.headers.referer).pathname;
        if (!io.rooms[pathname]) {
            //no room found!
            console.warn(pathname + ' room id not found');
        } else {
            socket.room = pathname;
            socket.join(socket.room);

            var result = matcher.join(socket.room, socket.id);
            socket.emit('files', result.metadata);
            socket.emit('match', new proto.Match(result.peers))
        }

        //TODO: notify other peers about this match (more secured)
//        socket.broadcast.emit('message','user connected');

        socket.on('join', function (msg) {
            users[users.length] = socket.id;
        });

        socket.on('sdp', function (sdp) {

        });

        socket.on('upload', function (files) {
            //TODO: sanitize files
            var idFound = false;
            var newId;
            while (!idFound) {
                newId = util.makeid();
                idFound = (!io.rooms[newId]);
            }

            matcher.addRoom(socket.id, '/' + newId, files);
            socket.room = newId;
            socket.join(socket.room);
            socket.emit('created', newId);
        });


        socket.on('data', function (data) {
            socket.broadcast.to(socket.room).emit('data', data);
        });

        socket.on('message', function (msg) {
            socket.broadcast.to(socket.room).emit('message', msg + ' from ' + socket.id);
        });

        socket.on('offer', function (offer) {
            exports.offer(offer.targetId, offer);
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
