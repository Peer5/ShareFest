(function () {
    client = function (wsServerUrl) {
        this.CHUNK_SIZE = 500; //bytes
        this.clientId;
        this.peerConnections = {};
        this.dataChannels = {};
        this.initiateClient(wsServerUrl);
        this.registerEvents();
        this.chunks = {};// <id, arrybuffer>
        this.numOfChunksInFile;
    };

    client.prototype = {

        updateMetadata:function(files){
            updateList(files);
            this.numOfChunksInFile = Math.ceil(files[0].size/this.CHUNK_SIZE)
        },

        addFile:function(body) {
            var splitAns = body.split(',');
            this.chunks[0] = splitAns[1];
        },

        receiveChunk:function(chunkId,chunkData){
            this.chunks[chunkId] = chunkData;
            this.checkHasEntireFile();
        },

        checkHasEntireFile:function(){
            if(Object.keys(this.chunks).length == this.numOfChunksInFile){
                //ToDo: anounce has file base64.decode the strings and open it
                console.log("I have the entire file");
                ws.sendDownloadCompleted();
                this.saveFileLocally();
            }
        },

        saveFileLocally:function(){
            var stringFile;
            for(var i=0;i<this.numOfChunksInFile;++i){
                if(!file){
                    file = base64.decode(this.chunks[i])
                }else{

                    //ToDo: concat the rest of the chunks
                }
            }
            var blob = new Blob([file]);
            saveLocally(blob);
        },

        initiateClient:function (wsServerUrl) {
            var thi$ = this;
            ws = new WsConnection(wsServerUrl);
            this.clientId; //either randomly create or get it from WsConnection

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

        sendCommand:function(dataChannel,message){
            var thi$=this;
            if(dataChannel.readyState == 'open'){
                dataChannel.send(message);
            }else{
                console.log('dataChannel wasnt ready, seting timeout');
                setTimeout(function(dataChannel,message){
                    thi$.sendCommand(dataChannel,message);
                },1000,dataChannel,message);
            }
        },

        registerEvents:function () {
            var thi$ = this;

            radio('receivedRoomMetadata').subscribe([function(files){
                this.updateMetadata(files);
            },this]);

            radio('commandArrived').subscribe([function(dataChannel, cmd){
                if (cmd.op == proto64.NEED_CHUNK) {
                    console.log("received NEED_CHUNK command");
                    this.sendCommand(dataChannel, proto64.send(this.clientId,1,1,0,this.chunks[0]))
                }else if(cmd.op == proto64.DATA_TAG){
                    console.log("received DATA_TAG command");
                    this.receiveChunk(cmd.chunkId,cmd.data);
                }
            },thi$]);

            radio('connectionReady').subscribe([function(dataChannel) {
                if (0 in this.chunks) {
                    console.log('got chunk 0');
                } else {
                    console.log('requesting chunk 0');
                    this.sendCommand(dataChannel, proto64.need(this.clientId, 1, 1, 0));
                }
            }, thi$]);

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