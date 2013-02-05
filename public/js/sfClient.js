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
        this.hasEntireFile = false;
    };

    client.prototype = {

        updateMetadata:function (files) {
            this.numOfChunksInFile = files[0].numOfChunks;
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

        updateProgress:function(){
            var percentage = Object.keys(this.chunks).length/this.numOfChunksInFile;
            radio('downloadProgress').broadcast(percentage*100);
        },

        requestChunks:function (dataChannel, chunkNum) {
            this.sendCommand(dataChannel, proto64.need(this.clientId, 1, 1, chunkNum));
        },

        checkHasEntireFile:function () {
            if (Object.keys(this.chunks).length == this.numOfChunksInFile) {
                //ToDo: anounce has file base64.decode the strings and open it
                console.log("I have the entire file");
                this.hasEntireFile = true;
                ws.sendDownloadCompleted();
                this.saveFileLocally();
            }
        },

        saveFileLocally:function () {
            var stringFile = '';
            for (var i = 0; i < this.numOfChunksInFile; ++i) {
                stringFile += this.chunks[i];
            }
            var blob = new Blob([base64.decode(stringFile)]);
            saveLocally(blob);
        },

        initiateClient:function (wsServerUrl) {
            ws = new WsConnection(wsServerUrl);
            this.clientId; //either randomly create or get it from WsConnection
        },

        //init true if this peer initiated the connection
        ensureHasPeerConnection:function (peerId, init) {
            if (!this.peerConnections[peerId]) {
                this.peerConnections[peerId] = new peerConnectionImpl(this.clientId, peerId, init);
            }
        },

        sendCommand:function (dataChannel, message) {
            var thi$ = this;
            if (dataChannel.readyState == 'open') {
                setTimeout(function (message) { //setting a timeout since chrome can't handle fast transfer yet
                    dataChannel.send(message)
                }, 200, message);
            } else {
                console.log('dataChannel wasnt ready, seting timeout');
                setTimeout(function (dataChannel, message) {
                    thi$.sendCommand(dataChannel, message);
                }, 1000, dataChannel, message);
            }
        },

        registerEvents:function () {
            //websockets events
            radio('receivedRoomMetadata').subscribe([function (files) {
                this.updateMetadata(files);
            }, this]);

            radio('socketConnected').subscribe([function () {
                this.clientId = ws.socket.socket.sessionid;
                console.log('got an id: ' + this.clientId);
            }, this]);

            radio('receivedMatch').subscribe([function (message) {
                for (var i = 0; i < message.clientIds.length; ++i) {
                    this.ensureHasPeerConnection(message.clientIds[i], true);
                    this.peerConnections[message.clientIds[i]].setupCall();
                }
            }, this]);

            radio('receivedOffer').subscribe([function (msg) {
                this.ensureHasPeerConnection(msg.originId, false);
                this.peerConnections[msg.originId].handleMessage(msg.sdp);
            }, this]);

            //PeerConnection events
            radio('commandArrived').subscribe([function (dataChannel, msg) {
                var cmd = proto64.decode(msg.data);
                if (cmd.op == proto64.NEED_CHUNK) {
                    console.log("received NEED_CHUNK command " + cmd.chunkId);
                    if (cmd.chunkId in this.chunks) {
                        this.sendCommand(dataChannel, proto64.send(this.clientId, 1, 1, cmd.chunkId, this.chunks[cmd.chunkId]))
                    } else {
                        console.warn('I dont have this chunk' + cmd.chunkId);
                    }
                } else if (cmd.op == proto64.DATA_TAG) {
                    console.log("received DATA_TAG command with chunk id " + cmd.chunkId);
                    this.receiveChunk(cmd.chunkId, cmd.data);
                    if (!this.hasEntireFile)
                        this.requestChunks(dataChannel, cmd.chunkId + 1);
                }
            }, this]);

            radio('connectionReady').subscribe([function (dataChannel) {
                if (0 in this.chunks) {
                    console.log('got chunk 0');
                } else {
                    console.log('requesting chunk 0');
                    this.requestChunks(dataChannel, 0);
                }
            }, this]);


        }
    };
})();