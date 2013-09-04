(function () {
    peer5.core.transport.WsConnection = Object.subClass({
        name:'peer5.core.transport.WsConnection',
        ctor:function (wsSeverUrl, clientId) {
            this.state = {
                connectionOpenTime:0
            };
            this.clientId = clientId;
            this.wsSeverUrl = wsSeverUrl;
            this.lastPongTimeStamp; // indicating when was the last server interaction.
            this.socketInitating = true;
            this.socket;
            this.initiateWebSocket(this.wsSeverUrl, this.clientId);
        },

        initiateWebSocket:function (wsSeverUrl, clientId) {
            var thi$ = this;
            this.start = Date.now();
            //TODO: check if id and token are needed
            this.socket = new WebSocket(wsSeverUrl + '?id=' + clientId + '&token=' + peer5.config.TOKEN);
            peer5.log('trying to connect to a new websocket');
            this.socket.sessionid = clientId;
            this.socket.binaryType = "arraybuffer";

            this.socket.onclose = function (e) {
                ga('send', 'event', 'errors', 'websocketClosed', '');
                peer5.warn('WebSocket closed with error');
                peer5.warn(e);
                thi$.socketInitating = true;
                thi$.socket = null;

                peer5.info('Peer ' + thi$.sessionid + " is trying to reconnect");
                setTimeout(function () {
                    thi$.initiateWebSocket(thi$.wsSeverUrl, thi$.clientId);
                }, peer5.config.SOCKET_RECONNECTION_INTERVAL);
            };

            this.socket.onerror = function (error) {
                peer5.error('peer with Id ' + thi$.sessionid + " had socket error : ");
                peer5.error(error);
            };

            this.socket.onopen = function () {
                //clearTimeout(timeout);
                var now = Date.now();
                thi$.state.connectionOpenTime = now - thi$.start;
                thi$.socketInitating = false;
                thi$.lastPongTimeStamp = now;
                peer5.log("websocket took: " + thi$.state.connectionOpenTime + " to open");
                thi$.socketInit = true;
                thi$.registerServerNotifications();
                radio('webSocketInit').broadcast();
            };

            radio('websocketsSendData').subscribe([function(message){
                this.sendData(message);
            },this]);
        },

        registerServerNotifications:function () {
            var thi$ = this;

            this.socket.onmessage = function (message) {
                thi$.lastPongTimeStamp = Date.now();
                if (typeof message.data != 'string') {
                    var unpackedDataArray = peer5.core.protocol.BinaryProtocol.decode(new Uint8Array(message.data));
                    for (var i = 0; i < unpackedDataArray.length; ++i) {
                        switch (unpackedDataArray[i].tag) {
                            case peer5.core.protocol.MATCH:
                                radio('receivedMatchEvent').broadcast(unpackedDataArray[i]);
                                break;
                            case peer5.core.protocol.FILE_INFO:
                                radio('receivedFileInfo').broadcast(unpackedDataArray[i]);
                                break;
                            case peer5.core.protocol.SDP:
                                radio('receivedSDP').broadcast(unpackedDataArray[i]);
                                break;
                            case peer5.core.protocol.SWARM_HEALTH:
                                radio('swarmHealth').broadcast(unpackedDataArray[i]);
                                break;
                            case peer5.core.protocol.SWARM_ERROR:
                                radio('swarmError').broadcast(unpackedDataArray[i]);
                                break;
                        }
                    }
                } else {
                    peer5.warn("received a string message from server - not supported");
                }
            };
        },

        socketReadyToSend:function () {
            return (this.socket && this.socketInit && this.socket.readyState == this.socket.OPEN);
        },

        sendMessage:function(protocolMessage) {
            var packedData = peer5.core.protocol.BinaryProtocol.encode([protocolMessage]);
            this.sendData(packedData);
        },

        sendData:function (packedData) {
            if (this.socketReadyToSend()) {
                peer5.log('sending data on websockets, at time: ' + (Date.now()));
                this.socket.send(packedData);
            } else {
                peer5.warn('cant send data - socket is not defined');
            }
        }
    })
})();