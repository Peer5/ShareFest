(function () {
    client = function (wsServerUrl) {
        this.clientId;

        this.initiateClient(wsServerUrl);
        this.registerEvents();
    };

    client.prototype = {
        initiateClient:function (wsServerUrl) {
            var thi$ = this;
            ws = new WsConnection(wsServerUrl);
            this.clientId; //either randomly create or get it from WsConnection
            this.peerConnections = {};
            this.dataChannels = {};
            this.initiatePeerConnectionCallbacks();
        },

        initiatePeerConnectionCallbacks:function(){
            replaceReturnCallback(print_);
            replaceDebugCallback(debug_);
            doNotAutoAddLocalStreamWhenCalled();
            hookupDataChannelCallbacks_();
        },

        ensureHasPeerConnection:function(peerId){
            if(!this.peerConnections[peerId]){
                this.peerConnections[peerId] = createPeerConnection(STUN_SERVER);
                this.peerConnections[peerId].remotePeerId = peerId;
                this.peerConnections[peerId].localPeerId = this.clientId;
            }

        },

        ensureHasDataChannel:function(peerConnection,peerId){
            if (peerConnection == null)
                throw failTest('Tried to create data channel, ' +
                    'but have no peer connection.');
            if (this.dataChannels[peerId] != null && this.dataChannels[peerId] != 'closed') {
                throw failTest('Creating DataChannel, but we already have one.');
            }
            this.dataChannels[peerId] = createDataChannel(peerConnection,peerId);
        },

        createDataChannel:function(remotePeerId){
            this.ensureHasPeerConnection(remotePeerId);
            createDataChannel(this.peerConnections[remotePeerId],this.clientId);
//            createDataChannelOnPeerConnection(this.peerConnections[remotePeerId],this.clientId);
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

            radio('socketConnected').subscribe([function(){
               thi$.clientId = ws.socket.socket.sessionid;
                console.log('got an id: ' + thi$.clientId);
            },this]);

            radio('onCreateDataChannelCallback').subscribe([function(event){
                if (this.dataChannels[event.currentTarget.remotePeerId] != null && this.dataChannels[event.currentTarget.remotePeerId].readyState != 'closed') {
                throw failTest('Received DataChannel, but we already have one.');
                }
                this.dataChannels[event.currentTarget.remotePeerId] = event.channel;
                debug('DataChannel with label ' + this.dataChannels[event.currentTarget.remotePeerId].label +
                    ' initiated by remote peer.');
                hookupDataChannelEvents(this.dataChannels[event.currentTarget.remotePeerId]);
                },this]);
        }
    };
})();