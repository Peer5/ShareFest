(function () {
    WsConnection = function (wsServerUrl) {
        this.socket;
        this.initiateWebSocket(wsServerUrl)
    };

    WsConnection.prototype = {
        initiateWebSocket:function (wsServerUrl) {
            var thi$ = this;
            this.socket = io.connect(wsServerUrl,{'connect timeout': 1500,transports: ['xhr-polling']});
            console.log('new websocket');

            thi$.socket.on('disconnect', function () {
                //thi$.socket.removeAllListeners();
            });
            thi$.socket.on('created', function (msg) {
                radio('roomReady').broadcast(msg);
            });

            thi$.socket.on('size', function (size) {
                radio('roomSizedChanged').broadcast(size);
            });

            thi$.socket.on('files', function (files) {
                if (files) {
                    radio('receivedRoomMetadata').broadcast(files.metadata);
                } else {
                    radio('roomNotFound').broadcast();
                }

            });
            thi$.socket.on('message', function (msg) {
                console.log(msg);
//                    var arr = Uint8Array(10);
//                    arr[5] = 5;
//
//                    thi$.socket.emit()
            });
            thi$.socket.on('offer', function (message) {
                console.log("got an offer");
                radio('receivedOffer').broadcast(message);
            });
            thi$.socket.on('match', function (message) {
                console.log('received a match');
                radio('receivedMatch').broadcast(message);
            });
            this.socket.on('connect', function () {
                console.log("websocket connected");
                thi$.socket.emit('message', 'hi from a new peer');
                radio('socketConnected').broadcast();
            });
        },

        sendSDP:function (message) {
            console.log("sending offer: " + message);
            this.socket.emit('offer', message);
        },

        upload:function (files) {
            this.socket.emit('upload', files);
        },

        sendDownloadCompleted:function () {
            this.socket.emit('downloadCompleted');
        }

    };
})();