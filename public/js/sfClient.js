(function () {
    client = function (wsServerUrl) {
        this.clientId;
        this.peerConnections = {};
        this.configureBrowserSpecific();
        this.CHUNK_SIZE;//bytes
        this.peerConnectionImpl;
        this.dataChannels = {};
        this.initiateClient(wsServerUrl);
        this.registerEvents();
        this.chunks = {};// <id, arrybuffer>
        this.numOfChunksInFile;
        this.hasEntireFile = false;
        this.incomingChunks = {};
        this.requestThresh = 1;
        this.numOfChunksToAllocate = 15;
    };

    client.prototype = {
        configureBrowserSpecific:function () {
            if (window.mozRTCPeerConnection) {
                this.CHUNK_SIZE = 50000;
                this.peerConnectionImpl = peerConnectionImplFirefox;

            } else if (window.webkitRTCPeerConnection) {
                this.CHUNK_SIZE = 750;
                this.peerConnectionImpl = peerConnectionImplChrome;
            }
        },

        updateMetadata:function (metadata) {
            this.metadata = metadata[0];
            this.numOfChunksInFile = metadata[0].numOfChunks;
        },

        chunkFile:function (base64file) {
            this.numOfChunksInFile = Math.ceil(base64file.length / this.CHUNK_SIZE)
            for (var i = 0; i < this.numOfChunksInFile; i++) {
                var start = i * this.CHUNK_SIZE;
                this.chunks[i] = base64file.slice(start, start + this.CHUNK_SIZE);
            }
        },

        addFile:function (body) {
            var splitAns = body.split(',');
            var base64file = splitAns[1];
            this.chunkFile(base64file);
            this.hasEntireFile = true;
        },

        receiveChunk:function (chunkId, chunkData) {
            this.chunks[chunkId] = chunkData;
            this.updateProgress();
            this.checkHasEntireFile();
        },

        updateProgress:function () {
            var percentage = Object.keys(this.chunks).length / this.numOfChunksInFile;
            radio('downloadProgress').broadcast(percentage * 100);
        },

        requestChunks:function (targetId) {
            var chunkIds = [];
            for(var i=0;i<this.numOfChunksToAllocate && (Object.keys(this.chunks).length + i)<this.numOfChunksInFile;++i){
                chunkIds.push(Object.keys(this.chunks).length + i);
            }
            this.incomingChunks[targetId]+=chunkIds.length;
            this.peerConnections[targetId].send(proto64.need(this.clientId, 1, 1, chunkIds))
        },

        checkHasEntireFile:function () {
            if (Object.keys(this.chunks).length == this.numOfChunksInFile) {
                //ToDo: anounce has file base64.decode the strings and open it
                console.log("I have the entire file");
                this.hasEntireFile = true;
                this.ws.sendDownloadCompleted();
                this.saveFileLocally();
            }
        },

        saveFileLocally:function () {
            var stringFile = '';
            for (var i = 0; i < this.numOfChunksInFile; ++i) {
                stringFile += this.chunks[i];
            }
            var blob = new Blob([base64.decode(stringFile)]);
            saveLocally(blob, this.metadata.name);
        },

        initiateClient:function (wsServerUrl) {
            this.ws = new WsConnection(wsServerUrl);
            this.clientId; //either randomly create or get it from WsConnection
        },

        //init true if this peer initiated the connection
        ensureHasPeerConnection:function (peerId, init) {
            if (!this.peerConnections[peerId]) {
                this.peerConnections[peerId] = new this.peerConnectionImpl(this.ws, this.clientId, peerId, init);
            }
        },

        registerEvents:function () {
            //websockets events
            radio('receivedRoomMetadata').subscribe([function (files) {
                this.updateMetadata(files);
            }, this]);

            radio('socketConnected').subscribe([function () {
                this.clientId = this.ws.socket.socket.sessionid;
                console.log('got an id: ' + this.clientId);
            }, this]);

            radio('receivedMatch').subscribe([function (message) {
                if (this.hasEntireFile)
                    return;
                for (var i = 0; i < message.clientIds.length; ++i) {
                    this.ensureHasPeerConnection(message.clientIds[i], true);
                    this.peerConnections[message.clientIds[i]].setupCall();
                }
            }, this]);

            radio('receivedOffer').subscribe([function (msg) {
                this.ensureHasPeerConnection(msg.originId, false);
                this.peerConnections[msg.originId].handleMessage(msg);
            }, this]);

            //PeerConnection events
            radio('commandArrived').subscribe([function (msg) {
                var cmd = proto64.decode(msg.data);
                if (cmd.op == proto64.NEED_CHUNK) {
                    for (var i = 0; i < cmd.chunkId.length; ++i) {
                        var chunkId = cmd.chunkId[i];
//                        console.log("received NEED_CHUNK command " + chunkId);
                        if (chunkId in this.chunks) {
                            this.peerConnections[cmd.originId].send(proto64.send(this.clientId, 1, 1, chunkId, this.chunks[chunkId]));
                        } else {
                            console.warn('I dont have this chunk' + chunkId);
                        }
                    }
                } else if (cmd.op == proto64.DATA_TAG) {
//                    console.log("received DATA_TAG command with chunk id " + cmd.chunkId);
                    this.receiveChunk(cmd.chunkId, cmd.data);
                    this.incomingChunks[cmd.originId]--;
                    if (!this.hasEntireFile && this.incomingChunks[cmd.originId] < this.requestThresh)
                        this.requestChunks(cmd.originId);
                } else if (cmd.op == proto64.MESSAGE) {
                    console.log("peer " + cmd.originId + " sais: " + cmd.data);
                }
            }, this]);

            radio('connectionReady').subscribe([function (targetId) {
                this.incomingChunks[targetId] = 0;
                if (0 in this.chunks) {
                    console.log('got chunk 0');
                } else {
                    console.log('requesting chunk 0');
                    this.requestChunks(targetId);
                }
            }, this]);


        }
    };
})();