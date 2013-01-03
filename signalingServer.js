/**
 * Created with JetBrains WebStorm.
 * User: Shachar
 * Date: 13/11/12
 * Time: 22:10
 * To change this template use File | Settings | File Templates.
 */
var socketio = require('socket.io');
var io;
//var rooms = require('rooms.js');

exports.start = function (server) {
    io = socketio.listen(server);
    exports.createRoom('/broadcast'); //
}

exports.createRoom = function(roomId) {
    io.of(roomId).on('connection', function (socket) {
//        socket.broadcast.emit('message','user connected');
        socket.emit('message', 'm');

        socket.on('join', function (msg) {
            users[users.length] = socket.id;
        });

        socket.on('offer', function (msg) {
            socket.broadcast.to(roomId).emit('offer', msg);

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

        });
    });

}
exports.send = function (socketId, message) {
    var s = io.sockets.sockets[socketId];
    if (s) {
        s.emit('send', message);
    }
};

exports.sendOffer = function (socketId, message) {
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
