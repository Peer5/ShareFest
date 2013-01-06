(function () {
    client = function (wsServerUrl) {
        this.clientId;
        this.ws;
    };

    client.prototype = {
        initiateClient:function (wsServerUrl) {
            var thi$ = this;
            this.ws = new WsConnection(ws_url);
            this.clientId; //either randomly create or get it from WsConnection
            this.peerConnections = {};
            this.initiatePeerConnectionCallbacks();
        },

        initiatePeerConnectionCallbacks:function(){
            replaceReturnCallback(print_);
            replaceDebugCallback(debug_);
            doNotAutoAddLocalStreamWhenCalled();
            hookupDataChannelCallbacks_();
        },

        ensureHasPeerConnection:function(peerId){
            if(!this.peerConnections[peerId])
                this.peerConnections[peerId] = createPeerConnection(STUN_SERVER);
        },

        createDataChannel:function(remotePeerId){
            thi$.ensureHasPeerConnection(remotePeerId);
            createDataChannelOnPeerConnection(thi$.peerConnections[remotePeerId],thi$.clientId);
        },

        registerEvents:function () {
            var thi$ = this;

            radio('receivedMatch').subscribe([function (message) {
                for(var i=0;i<message.clientIds.length;++i){
                    thi$.createDataChannel(message.clientIds[i]);
                    setupCall(thi$.peerConnections[message.clientIds[i]]);
                }
            }, this]);

            radio('receivedOffer').subscribe([function (message) {
                thi$.ensureHasPeerConnection(message.originId);
                handleMessage(thi$.peerConnections[message.originId],message.sdp);
            }, this]);

            radio('socketConnected').subscribe(function(){
               thi$.ws.socket.sessionId;
            });
        }
    };
})();