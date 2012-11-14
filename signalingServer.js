/**
 * Created with JetBrains WebStorm.
 * User: Shachar
 * Date: 13/11/12
 * Time: 22:10
 * To change this template use File | Settings | File Templates.
 */
var io = require('socket.io').listen(80);
var rooms = require('rooms.js');

io.sockets.on('connection', function (socket) {
    socket.emit('connectionReady', {});

    socket.on('join',function(msg){ //msg = {roomId:...,socketId...,data:....}
        rooms.get(msg.roomId).add(socket.id);
    });

    socket.on('offer', function (msg) { //msg = {socketId:...,data:...}
        this.sendOffer(msg.socketId,msg.data);
    });

    socket.on('answer', function (msg) {    //msg = {socketId:...,data:...}
        this.answer(msg.socketid,msg);
    });

    socket.on('disconnect', function (msg) {


    });
});

this.send = function (socketId, message) {
    var s = io.sockets.sockets[socketId];
    if (s) {
        s.emit('send', message);
    }
};

this.sendOffer = function (socketId, message) {
    var s = io.sockets.sockets[socketId];
    if (s) {
        s.emit('offer', message);
    }
};

this.answer = function (socketId, message) {
    var s = io.sockets.sockets[socketId];
    if (s) {
        s.emit('answer', message);
    }
};

this.createOffer = function(senderId,receiverId,message){
    var s = io.sockets.sockets[senderId];
    if (s) {
        s.emit('createOffer', message);
    }
}