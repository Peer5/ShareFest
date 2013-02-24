var socketio = require('socket.io');
var io;
var url = require('url');
var matcher = require('./matcher.js');
var proto = require('./public/shared/protocol.js');
var util = require('./util.js');
//var rooms = require('rooms.js');

exports.start = function (server) {
    io = socketio.listen(server);
    matcher.addRoom(null, '/test', {meta:'data'});
    io.on('connection', function (socket) {
        var pathname = url.parse(socket.handshake.headers.referer).pathname;
        var uploadPath = {'/upload':true, '/':true}
        if (!io.rooms[pathname]) {
            if (uploadPath[pathname] == true) {
                console.log('uploader entered');
            } else {
                //no room found!
                console.warn(pathname + ' room id not found');
                socket.emit('files', null);
            }
        } else {
            socket.room = pathname.substr(1);
            socket.join(socket.room);

            var result = matcher.join(socket.room, socket.id);
            socket.emit('files', result);
            socket.emit('match', new proto.Match(result.peers))
            socket.emit('size', result.size);
            socket.broadcast.emit('size', result.size);
        }

        //TODO: notify other peers about this match (more secured)
//        socket.broadcast.emit('message','user connected');

        socket.on('join', function () {
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
            socket.room = newId;
            matcher.addRoom(socket.id, socket.room, files);
            socket.join(socket.room);
            socket.emit('created', newId);
        });


        socket.on('data', function (data) {
            socket.broadcast.to(socket.room).emit('data', data);
        });

        socket.on('message', function (msg) {
            if (socket.room) {
                socket.broadcast.to(socket.room).emit('message', msg + ' from ' + socket.id);
            } else {
                console.log('got an empty room');
            }
        });

        socket.on('offer', function (offer) {
            exports.offer(offer.targetId, offer);
        });

        socket.on('answer', function (msg) {    //msg = {socketid:...,data:...}
            this.answer(msg.socketid, msg);
        });

        socket.on('announce', function (msg) {
            socket.broadcast.to(socket.room).emit('announce', msg);
        });

        socket.on('disconnect', function (msg) {
            if (socket.room) {

                socket.broadcast.to(socket.room).emit('message', 'bye from ' + socket.id);
                socket.leave(socket.room);
                matcher.leave(socket.room, socket.id);
            } else {
                console.warn('socket room is undefined');
            }
        });
    });
};

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
