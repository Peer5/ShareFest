(function () {
    WsConnection = function (wsServerUrl) {
        this.socket;
        this.initiateWebSocket(wsServerUrl)
    };

    WsConnection.prototype = {
        initiateWebSocket:function (wsServerUrl) {
            var thi$ = this;
            this.socket = io.connect(wsServerUrl);
            console.log('new websocket');
            this.socket.on('connect', function () {
                console.log("websocket connected");
                thi$.socket.on('disconnect', function () {
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
                    if (!gPeerConnection)
                        gPeerConnection = createPeerConnection(STUN_SERVER);
                    handleMessage(gPeerConnection, message);
                });
                thi$.socket.on('match', function (message) {
                    var clientIds = message.clientIds;
                    console.log(clientIds);
                });

                thi$.socket.emit('message', 'hi from a new peer');

            });
        },

        sendSDP:function (message) {
            this.socket.emit('offer', message);
        }


    };
})();