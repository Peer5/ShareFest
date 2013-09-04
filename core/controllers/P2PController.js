(function () {
    peer5.core.controllers.P2PController = peer5.core.controllers.IController.subClass({
        ctor:function (clientId,prefetch) {
            this.clientId = clientId;
            this.peerConnections = {}; //Peer connections that are ready and functional
            this.initPeerConnections = {}; //Peer connections that are in init process
            this.droppedConnections = {}; //Peer connections that were closed
            this.inited = false;
            this.remoteAvailabilityMaps = {};
            this.p2pPendingChunks = {}; //<chunkId:arbitrary_value>
            this.peerConnectionImpl = null;
            this.prefetchFlag = {};
            this.resourceState = {}; //<resourceId,bool> true===everything is normal, false === error/pause/stop
            this.configureBrowserSpecific();
            this.availableTimeStamp = 0;
        },

        init:function (swarmId, prefetch, forceInit) {
            if(!forceInit && this.resourceState.hasOwnProperty(swarmId)) return;
            this.resourceState[swarmId] = true;
            if (forceInit || !this.p2pPendingChunks[swarmId])
                this.p2pPendingChunks[swarmId] = {};
            if (forceInit || !this.remoteAvailabilityMaps[swarmId])
                this.remoteAvailabilityMaps[swarmId] = {};
            this.prefetchFlag[swarmId] = prefetch;
            this.registerEvents();
        },

        /** @Public Methods*/
        allocateChunks:function (swarmId, startBlock, endBlock) {
            var chunkIds = [];
            var blockMap = peer5.core.data.BlockCache.get(swarmId);
            var tmpChunks;
            if (!startBlock) startBlock = blockMap.getFirstMissingBlock();
            if (!endBlock) endBlock = blockMap.getNumOfBlocks() - 1;
            for (var block = startBlock; block <= endBlock && block < blockMap.getNumOfBlocks() && chunkIds.length < Object.keys(this.peerConnections).length * peer5.config.MAX_PENDING_CHUNKS; ++block) {
                if (!blockMap.has(block)) {
                    tmpChunks = [];
                    tmpChunks = blockMap.getChunkIdsOfBlock(block);
                    for (var i = 0; i < tmpChunks.length; ++i) {
                        if (!blockMap.hasChunk(tmpChunks[i]) && !(this.p2pPendingChunks.hasOwnProperty(swarmId) &&
                            this.p2pPendingChunks[swarmId].hasOwnProperty(tmpChunks[i])))
                            chunkIds.push(tmpChunks[i]);
                    }
                }
            }
            return chunkIds;
        },

        /**
         * download more chunks
         * @param startBlock optional start block index (default 0)
         * @param endBlock optional end block index (default last block index)
         */
        download:function (swarmId, startBlock, endBlock) {
            if(!this.isAvailable(swarmId)) return;
            //store the needed blocks for the specific swarm
            peer5.log("startBlock = " + startBlock + " endBlock = " + endBlock);
            var chunkIds = this.allocateChunks(swarmId, startBlock, endBlock);
            //console.log(chunkIds[0] + ' ' + chunkIds[chunkIds.length - 1]);
            this.distributeChunksAmongSources(swarmId, chunkIds);
        },

        stopResource:function (swarmId) {
            this.resourceState[swarmId] = false;
        },

        isPendingBlock:function (swarmId, blockId) {
            var blockMap = peer5.core.data.BlockCache.get(swarmId)
            var chunkIds = blockMap.getChunkIdsOfBlock(blockId);
            for (var i = 0; i < chunkIds.length; i++) {
                if (this.p2pPendingChunks[swarmId].hasOwnProperty(chunkIds[i])) {
                    return true;
                }
            }
            return false;
        },

        isPendingEntireBlock:function(swarmId, blockId){
            var blockMap = peer5.core.data.BlockCache.get(swarmId)
            var chunkIds = blockMap.getChunkIdsOfBlock(blockId);
            for (var i = 0; i < chunkIds.length; i++) {
                if (!this.p2pPendingChunks[swarmId].hasOwnProperty(chunkIds[i])) {
                    return false;
                }
            }
            return true;
        },

        isPendingChunk:function(swarmId,chunkId){
            return (this.p2pPendingChunks.hasOwnProperty(swarmId) &&
            this.p2pPendingChunks[swarmId].hasOwnProperty(chunkId));
        },

        isAvailable:function(swarmId){
            if(!this.resourceState[swarmId]) return false;
            var availableTimeStamp = Date.now();
            var bm = peer5.core.data.BlockCache.get(swarmId);
            for (var peerId in this.peerConnections) {
                if (this.remoteAvailabilityMaps[swarmId][peerId]
                    && this.remoteAvailabilityMaps[swarmId][peerId].numOfOnBits > bm.numOfVerifiedBlocks //only consider peers that can actually give me something TODO: change this to diff on availabilitymaps
                    && this.peerConnections[peerId].numOfPendingChunks < 0.9 * this.peerConnections[peerId].maxNumOfPendingChunks) {
//                    console.log("++++P2P is available++++ " + this.peerConnections[peerId].numOfPendingChunks + " " + this.peerConnections[peerId].maxNumOfPendingChunks + " " + (availableTimeStamp - this.availableTimeStamp));
                    this.availableTimeStamp = availableTimeStamp;
                    return true;
                }
            }
//            if(this.peerConnections[peerId]) console.log("----P2P is not available---- "+ this.peerConnections[peerId].numOfPendingChunks + " " + this.peerConnections[peerId].maxNumOfPendingChunks + " " + (availableTimeStamp - this.availableTimeStamp));
            this.availableTimeStamp = availableTimeStamp;
            return false;
        },

        getConnectionStats:function(){
            var connectionsState = {}
            for (key in this.peerConnections) {
                connectionsState[key] = new peer5.core.protocol.Connection(null, null, null, null,
                    this.peerConnections[key].numOfExpiredChunks, this.peerConnections[key].numOfRequestedChunks,
                    this.peerConnections[key].minLatencyForChunk, this.peerConnections[key].ready,
                    this.peerConnections[key].connectingDuration, this.peerConnections[key].failure);
            }
            for (key in this.droppedConnections) {
                connectionsState[key] = new peer5.core.protocol.Connection(null, null, null, null,
                    this.droppedConnections[key].numOfExpiredChunks, this.droppedConnections[key].numOfRequestedChunks,
                    this.droppedConnections[key].minLatencyForChunk, this.droppedConnections[key].ready,
                    this.droppedConnections[key].connectingDuration, this.droppedConnections[key].failure);
            }
            return connectionsState;
        },

        getAvailableNumOfChunksToSend:function(){
            var numOfChunks = 0;
            for(var key in this.peerConnections){
                numOfChunks += (this.peerConnections[key].maxNumOfPendingChunks - this.peerConnections[key].numOfPendingChunks);
            }
            return numOfChunks;
        },

        /** @Private Methods*/
        registerEvents:function () {
            var thi$ = this;
            this.expireChunks = function (swarmId, chunksIds, peerId) {
                var rerequestExpiredChunks = [];
                var numOfExpired = 0;
                var blockMap = peer5.core.data.BlockCache.get(swarmId);
                for (var i = 0; i < chunksIds.length; i++) {
                    var chunkId = chunksIds[i];
                    if (thi$.p2pPendingChunks.hasOwnProperty(swarmId) &&
                        thi$.p2pPendingChunks[swarmId].hasOwnProperty(chunkId)) {
                        peer5.debug('expiring chunk ' + chunkId);
                        // let's expire this chunk
                        delete thi$.p2pPendingChunks[swarmId][chunkId];
                        numOfExpired++;
                        if (thi$.peerConnections[peerId]) {
                            thi$.peerConnections[peerId].numOfExpiredChunks++;
                            thi$.peerConnections[peerId].numOfPendingChunks--;
                        }
                        if (!blockMap.hasChunk(chunkId))
                            rerequestExpiredChunks.push(chunkId);
                    }
                }
                if (numOfExpired == chunksIds.length) {
                    if (thi$.peerConnections[peerId]) {
                        thi$.peerConnections[peerId].requestDropped ? thi$.peerConnections[peerId].requestDropped++ : thi$.peerConnections[peerId].requestDropped = 1;
                        if (thi$.peerConnections[peerId].requestDropped >= peer5.config.REQUEST_DROPPED_FAIL) {
                            thi$.closeConnection(peerId);
                        }
                    }
                } else {
                    if (thi$.peerConnections[peerId])
                        thi$.peerConnections[peerId].requestDropped = 0;
                }
                if (thi$.peerConnections[peerId])
                    peer5.log("num of requests dropped from " + peerId + " is " + thi$.peerConnections[peerId].requestDropped);
                //testing whether to send a request
                if (rerequestExpiredChunks.length) {
//                    thi$.distributeChunksAmongSources(swarmId, rerequestExpiredChunks);
                    if (thi$.peerConnections[peerId]) {
                        thi$.peerConnections[peerId].maxNumOfPendingChunks = Math.ceil(Math.max(thi$.peerConnections[peerId].maxNumOfPendingChunks / 2, thi$.peerConnections[peerId].maxNumOfPendingChunks - numOfExpired * 2));
                        peer5.log("expiring chunks, windows decreased to " + thi$.peerConnections[peerId].maxNumOfPendingChunks);
                    }
                    if(thi$.isAvailable(swarmId)) radio('P2PAvailableEvent').broadcast(swarmId);
                } else {
                    if (thi$.peerConnections[peerId]) {
                        thi$.peerConnections[peerId].maxNumOfPendingChunks = Math.min(peer5.config.MAX_PENDING_CHUNKS, thi$.peerConnections[peerId].maxNumOfPendingChunks + 1);
                        peer5.log("no chunks expired, windows increased to " + thi$.peerConnections[peerId].maxNumOfPendingChunks);
                    }
                }
            };

            radio('P2PAvailableEvent').subscribe([function(swarmId){
                if (this.prefetchFlag[swarmId])
                    this.prefetch(swarmId);
            },this])

            radio('blockReceivedEvent').subscribe([function (blockId, blockMap) {
                this.sendHaveToAll(blockMap.metadata.swarmId);
            }, this]);

            //PeerConnection events
            radio('dataReceivedEvent').subscribe([function (packedData, originId) {
                //identify the type of data received
                var unpackedDataArray =  peer5.core.protocol.BinaryProtocol.decode(new Uint8Array(packedData));

                //for now peer that was disconnected cannot be restored - we might consider to changing this in the near future
                if (!this.peerConnections[originId]) {
                    peer5.info('got dataReceivedEvent from peerId ' + originId + 'which was not found in peerConnections');
                    return;
                }

//                this.restoreConnection(originId);
                for (var i = 0; i < unpackedDataArray.length; ++i) {
                    switch (unpackedDataArray[i].tag) {
                        case peer5.core.protocol.P2P_HAVE:
                            this.receiveHaveMessage(unpackedDataArray[i], originId);
                            if(this.isAvailable(unpackedDataArray[i].swarmId))
                                radio('P2PAvailableEvent').broadcast(unpackedDataArray[i].swarmId);
                            break;
                        case peer5.core.protocol.P2P_REQUEST:
                            this.receiveRequestMessage(unpackedDataArray[i], originId);
                            break;
                        case peer5.core.protocol.P2P_DATA:
                            this.receiveDataMessage(unpackedDataArray[i], originId);
                            if(this.isAvailable(unpackedDataArray[i].swarmId))
                                radio('P2PAvailableEvent').broadcast(unpackedDataArray[i].swarmId);
                            break;
                        case peer5.core.protocol.P2P_CANCEL:
                            break;
                    }
                }
            }, this]);

            radio('connectionReady').subscribe([function (targetId) {
                if (this.peerConnections[targetId])
                    peer5.warn("peerConnection to " + targetId + " was initialized, but we already have a connection to him");
                else {
                    this.peerConnections[targetId] = this.initPeerConnections[targetId];
                    delete this.initPeerConnections[targetId];
                }
                radio('activePeerConnectionsNumberChanged').broadcast(Object.keys(this.peerConnections).length);

                peer5.core.data.BlockCache.forEach(function (key, blockMap) {
                    var metadata = blockMap.metadata;
                    if (metadata) {
                        var swarmId = blockMap.metadata.swarmId;
                        thi$.sendHaveToNewConnection(swarmId, targetId);
                    }
                })
            }, this]);

            radio('connectionFailed').subscribe([function (peerId) {
                peer5.warn("onConnectionFailed: closing connection with " + peerId);
                if (this.peerConnections[peerId]) {
//                    this.droppedConnections[peerId] = this.peerConnections[peerId]
                    delete this.peerConnections[peerId];
                } else if (this.initPeerConnections[peerId]) {
//                    this.droppedConnections[peerId] = this.initPeerConnections[peerId]
                    delete this.initPeerConnections[peerId];
                }
//                this.droppedConnections[peerId].ready = false;
                radio('activePeerConnectionsNumberChanged').broadcast(Object.keys(this.peerConnections).length);
            }, this])

            //WS events
            radio('receivedMatchEvent').subscribe([function (matchMessage) {
                peer5.info("receivedMatch with peer " + matchMessage.peerId);
                var peerId = matchMessage.peerId;
                this.ensurePeerConnectionInitialized(peerId, true);
            }, this])

            radio('receivedSDP').subscribe([function (msg) {
                this.ensurePeerConnectionInitialized(msg.originId, false);
                if (this.initPeerConnections[msg.originId]) {
                    this.initPeerConnections[msg.originId].handleMessage(msg);
                } else {
                    peer5.log('receivedSDP: this.initPeerConnections [' + msg.originId + ' ] undefined');
                }
            }, this]);
        },

        //ToDo: rarest first mechanism
        prefetch:function (swarmId) {
            if(!this.isAvailable(swarmId)) return;
            this.download(swarmId);
        },

        receiveRequestMessage:function (requestMessage, originId) {
            peer5.log("received a request for " + requestMessage.chunkIds.length + " chunks");
//            for (var i = 0; i < requestMessage.chunkIds.length; ++i) {
//                this.sendData(requestMessage.swarmId, originId, requestMessage.chunkIds[i]);
//            }
            this.sendData(requestMessage.swarmId, originId, requestMessage.chunkIds, 0);
            radio('requestChunks').broadcast(requestMessage.swarmId, originId, requestMessage.chunkIds);
        },

        receiveDataMessage:function (dataMessage, originId) {
            this.receiveP2PChunk(dataMessage.swarmId, originId, dataMessage.chunkId, dataMessage.payload);
        },

        configureBrowserSpecific:function () {
            if (window.mozRTCPeerConnection) {
                this.peerConnectionImpl = peer5.core.transport.PeerConnectionImpl;
                peer5.config.MAX_PENDING_CHUNKS = peer5.config.MOZ_MAX_PENDING_CHUNKS; //a workaround for mozilla
            } else if (window.webkitRTCPeerConnection) {
                this.peerConnectionImpl = peer5.core.transport.PeerConnectionImpl;
            }
        },

        distributeChunksAmongSources:function (swarmId, chunkIds) {
            var thi$ = this;
            var sortedPeers = Object.keys(this.peerConnections).sort(function (a, b) {
                return thi$.peerConnections[a].numOfPendingChunks > thi$.peerConnections[b].numOfPendingChunks
            });
            var chunkDist = {};
            for (var i = 0; i < chunkIds.length; ++i) {
                for (var j = 0; j < sortedPeers.length; ++j) {
                    var blockId = Math.floor(chunkIds[i] / (peer5.config.BLOCK_SIZE / peer5.config.CHUNK_SIZE));
                    if (this.remoteAvailabilityMaps.hasOwnProperty(swarmId) &&
                        this.remoteAvailabilityMaps[swarmId][sortedPeers[j]] &&
                        this.remoteAvailabilityMaps[swarmId][sortedPeers[j]].has(blockId)) {
                        if (this.peerConnections[sortedPeers[j]].numOfPendingChunks < thi$.peerConnections[sortedPeers[j]].maxNumOfPendingChunks) {
                            if (!chunkDist[sortedPeers[j]])
                                chunkDist[sortedPeers[j]] = [];
                            chunkDist[sortedPeers[j]].push(chunkIds[i]);
                            this.peerConnections[sortedPeers[j]].numOfPendingChunks++;
                            break; //no need to allocate this chunk twice (yet)
                        }
                    }
                }
            }
            for (var k = 0; k < sortedPeers.length; ++k) {
                if (chunkDist[sortedPeers[k]]) {
                    var remotePeerId = sortedPeers[k];
                    var chunkIds = chunkDist[remotePeerId];
                    this.addToPendingChunks(swarmId, chunkIds, remotePeerId);
//                    if (this.incomingChunks[remotePeerId] > peer5.config.REQUEST_CHUNK_THRESH) {
                    this.peerConnections[sortedPeers[k]].numOfRequestedChunks += chunkIds.length;
//                    radio('requestChunks').broadcast(sortedPeers[k], swarmId, chunkIds)
                    var requestMessage = new peer5.core.protocol.Request(swarmId, chunkIds);
                    var encodedMsg = peer5.core.protocol.BinaryProtocol.encode([requestMessage]);
                    peer5.log("sending request for " + chunkIds.length + " chunks");
                    this.peerConnections[sortedPeers[k]].send(encodedMsg);
                }
            }
        },

        sendToAll:function (message) {
            var encodedMsg = peer5.core.protocol.BinaryProtocol.encode([message]);
            for (var remotePeerId in this.peerConnections) {
                if (this.peerConnections[remotePeerId].ready)
                    this.peerConnections[remotePeerId].send(encodedMsg);
            }
        },

        //init true if this peer initiated the connection
        ensurePeerConnectionInitialized:function (peerId, init) {
            if (!this.peerConnections[peerId] && !this.initPeerConnections[peerId]) {
                this.initPeerConnections[peerId] = new this.peerConnectionImpl(this.clientId, peerId, init);
                if (init)
                    this.initPeerConnections[peerId].setupCall();
            }
        },

        sendData:function (swarmId, peerID, chunkIds , iter) {
            if(!this.canUpload(swarmId)) return;
            if(peer5.config.EMULATE_LOSS && Math.random() < peer5.config.EMULATE_LOSS_PERCENTAGE) return;
            if(peer5.config.USE_FS){
                var chunkId = chunkIds[iter];
                iter++;
                var thi$ = this;
                peer5.core.data.BlockCache.get(swarmId).getChunk(chunkId,function(succ,data){
                    var dataMessage = new peer5.core.protocol.Data(swarmId, chunkId,data);
                    var packedData = peer5.core.protocol.BinaryProtocol.encode([dataMessage]);
                    thi$.peerConnections[peerID].send(packedData);
                    radio('chunkSentEvent').broadcast(swarmId);
                    if(iter<chunkIds.length)
                        thi$.sendData(swarmId, peerID, chunkIds, iter);
                });
            }else{
                for(var i=0;i<chunkIds.length;++i){
                    chunkId = chunkIds[i];
                    var data = peer5.core.data.BlockCache.get(swarmId).getChunk(chunkId);
                    var dataMessage = new peer5.core.protocol.Data(swarmId,chunkId,data);
                    var packedData = peer5.core.protocol.BinaryProtocol.encode([dataMessage]);
                    this.peerConnections[peerID].send(packedData);
                    radio('chunkSentEvent').broadcast(swarmId);
                }
            }

        },

        sendHaveToNewConnection:function (swarmId, remotePeerId) {
            var blockMap = peer5.core.data.BlockCache.get(swarmId);
            if (!blockMap) return;
            if (this.peerConnections[remotePeerId].ready) {
                var haveMessage = this.createHaveMessage(swarmId);
                var encodedMsg = peer5.core.protocol.BinaryProtocol.encode([haveMessage]);
                this.peerConnections[remotePeerId].send(encodedMsg);
            } else {
                peer5.log("connection is not ready yet");
            }
        },

        receiveHaveMessage:function (haveMessage, originId) {
            //ToDo: do we want to initialize RAMaps[swarmId] for every new havemessage?
            var swarmId = haveMessage.swarmId;
            if (!this.remoteAvailabilityMaps[swarmId][originId]) {
                peer5.info("got a have message from a peer with a non initialized availabilityMap");
                var blockMap = peer5.core.data.BlockCache.get(haveMessage.swarmId);
                this.remoteAvailabilityMaps[swarmId][originId] =
                    new peer5.core.dataStructures.AvailabilityMap(blockMap.getNumOfBlocks());
            }
            if (haveMessage.availabilityMap)
                this.remoteAvailabilityMaps[swarmId][originId].deserializeAndCopy(haveMessage.availabilityMap);
            else if (haveMessage.seeder)
                this.remoteAvailabilityMaps[swarmId][originId].setSeeder();
            else
                this.remoteAvailabilityMaps[swarmId][originId].deserializeAndUpdate(haveMessage.chunkIds);
        },

        sendHaveToAll:function (swarmId) {
            //need to create a HAVE message with serializedMap
            var haveMessage = this.createHaveMessage(swarmId);
            this.sendToAll(haveMessage);
        },

        receiveP2PChunk:function (swarmId, originPeer, chunkId, data) {
            peer5.debug("receiving chunk " + chunkId);
            var blockMap = peer5.core.data.BlockCache.get(swarmId);
            if (!blockMap.hasChunk(chunkId)) {
//                this.state.numOfP2PCompletedChunks++;
//                this.downloadedBytes += peer5.config.CHUNK_SIZE;
//                this.state.addP2PRecv();
                //dispatch event so the client will know new data arrived
                this.addChunk(swarmId, data, chunkId);
                radio('peer5_new_p2p_chunk').broadcast(chunkId, swarmId, originPeer);
            }
            else {
//                this.state.addP2PWaste();
                peer5.log('DOH! I already got chunk: ' + chunkId + '!');
                radio('peer5_waste_p2p_chunk').broadcast(chunkId, swarmId, originPeer);
            }
            //update the num of chunks coming from this peer
            if (this.p2pPendingChunks.hasOwnProperty(swarmId) &&
                this.p2pPendingChunks[swarmId].hasOwnProperty(chunkId)) {
                var latency = Date.now() - this.p2pPendingChunks[swarmId][chunkId];
                if (!this.peerConnections[originPeer].minLatencyForChunk) {
                    this.peerConnections[originPeer].minLatencyForChunk = latency;
                    this.peerConnections[originPeer].maxLatencyForChunk = latency;
                    this.peerConnections[originPeer].avgLatencyForChunk = latency;
                }
                else {
                    this.peerConnections[originPeer].minLatencyForChunk = Math.min(this.peerConnections[originPeer].minLatencyForChunk, latency);
                    this.peerConnections[originPeer].maxLatencyForChunk = Math.max(this.peerConnections[originPeer].maxLatencyForChunk, latency);
                    this.peerConnections[originPeer].avgLatencyForChunk = (this.peerConnections[originPeer].avgLatencyForChunk * this.peerConnections[originPeer].numOfChunksArrived + latency) / (1 + this.peerConnections[originPeer].numOfChunksArrived);
                }
                this.peerConnections[originPeer].numOfChunksArrived++;
                this.peerConnections[originPeer].numOfPendingChunks--;
                delete this.p2pPendingChunks[swarmId][chunkId];
            } else {
                peer5.log("we already expired chunk: " + chunkId);
            }
//            if (!this.requestPending && this.peerConnections[originPeer].numOfPendingChunks <= peer5.config.REQUEST_CHUNK_THRESH) {
//                radio('sendReportRequest').broadcast(this.url);
//                this.requestPending = true;
//            }
        },


        blockCompleted:function (swarmId, blockId) {

        },

        addChunk:function (swarmId, data, chunkId) {
            var blockMap = peer5.core.data.BlockCache.get(swarmId);
            var blockId = blockMap.setChunk(chunkId, data);
//            if (blockMap.verifyBlock(blockId)) {
//                this.blockCompleted(swarmId, blockId);
//                radio('P2PAvailableEvent').broadcast(this.url);
//            }
        },

        addToPendingChunks:function (swarmId, chunksIds, peerId) {
            var expiration = peer5.config.CHUNK_EXPIRATION_TIMEOUT;
            for (var i = 0; i < chunksIds.length; ++i) {
                var chunkId = chunksIds[i];
                this.p2pPendingChunks[swarmId][chunkId] = Date.now();
                radio('peer5_p2p_pending_chunk').broadcast(chunkId,swarmId,peerId);
            }
            if (chunksIds.length == 0) return;
            var id = setTimeout(this.expireChunks, expiration, swarmId, chunksIds, peerId);
        },

        restoreConnection:function (originId) {
            if (!this.peerConnections[originId] && this.droppedConnections[originId]) {
                peer5.warn("connection with " + originId + " was restored");
                this.peerConnections[originId] = this.droppedConnections[originId];
                this.peerConnections[originId].ready = true;
                delete this.droppedConnections[originId];
                this.sendHaveToNewConnection(originId);
            }
        },

        createHaveMessage:function (swarmId) {
            var blockMap = peer5.core.data.BlockCache.get(swarmId);
            var haveMessage;
            if (blockMap.isFull()) {
                haveMessage = new peer5.core.protocol.Have(swarmId, true);
            } else {
                haveMessage = new peer5.core.protocol.Have(swarmId, false, blockMap.getSerializedMap(), null);
            }
            return haveMessage;
        },

        closeConnection:function (peerId) {
            peer5.warn("closing connection with " + peerId + " due to high packet loss");
            if(this.peerConnections[peerId]){
                peer5.info(this.peerConnections[peerId]);
                this.peerConnections[peerId].close();
                delete this.peerConnections[peerId];
            }
        },

        canUpload:function(swarmId){
            return this.resourceState[swarmId];
        }
    });
})();