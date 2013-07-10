(function () {
    peer5.core.transport.PeerConnectionImpl = peer5.core.transport.AbstractPeerConnection.subClass({
        name:'peer5.core.transport.PeerConnectionImpl',

        ctor:function (originId, targetId, initiator) {
            this._super(originId, targetId, initiator);
            this.reliable = false;
            if (window.webkitRTCPeerConnection) {
                this.RTCPeerConnection = webkitRTCPeerConnection;
                this.RTCSessionDescription = RTCSessionDescription
                this.useBase64 = true;
                if (this.reliable)
                    peer5.error("chrome hasn't implemented reliable dc yet");
                else
                    this.dataChannelOptions = { reliable:false };
            } else if (window.mozRTCPeerConnection) {
                this.reliable = true;
                //delete trun servers due to incompatablitiy now
                peer5.config.TURN_SERVERS = []

                this.RTCPeerConnection = mozRTCPeerConnection;
                this.RTCSessionDescription = mozRTCSessionDescription
                this.useBase64 = false;
                if (this.reliable)
                    this.dataChannelOptions = {};
                else
                    this.dataChannelOptions = { outOfOrderAllowed:true, maxRetransmitNum:0 };
            }
            this.initiatePeerConnection(initiator);
        },

        /** @public methods*/
        setupCall:function () {
            this.startTime = Date.now();
            peer5.debug('createOffer with constraints: ' +
                JSON.stringify(this.createOfferConstraints, null, ' '));
            this.peerConnection.createOffer(
                this.setLocalAndSendMessage_,
                function (err) {
                    peer5.debug('createOffer(): failed, ' + err)
                },
                this.createOfferConstraints);
        },
        handleMessage:function (message) {
            parsed_msg = message.sdpMessage;
            peer5.info('handling message ' + message);
            if (parsed_msg.type) {
                var session_description = new this.RTCSessionDescription(parsed_msg);
                var thi$ = this;
                this.peerConnection.setRemoteDescription(
                    session_description,
                    function () {
                        peer5.debug('setRemoteDescription(): success.')
                        if (session_description.type == "offer") {
                            peer5.debug('createAnswer with constraints: ' +
                                JSON.stringify(this.createAnswerConstraints, null, ' '));
                            thi$.peerConnection.createAnswer(
                                thi$.setLocalAndSendMessage_,
                                function (err) {
                                    peer5.debug('createAnswer(): failed, ' + err)
                                },
                                thi$.createAnswerConstraints);
                        }
                    },
                    function (err) {
                        peer5.debug('setRemoteDescription(): failed, ' + err)
                    });

                return;
            } else if (parsed_msg.candidate) {
                if (JSON.stringify(parsed_msg) in this.peerConnection.candidates) {
                    peer5.warn('candidate was already added');
                    return; // no need to add this!
                }
                var candidate = new RTCIceCandidate(parsed_msg);
                this.peerConnection.addIceCandidate(candidate);

                this.peerConnection.candidates[JSON.stringify(parsed_msg)] = Date.now(); //memorize we have this candidate
                return;
            }
            peer5.log("unknown message received");
//            addTestFailure("unknown message received");
            return;
        },
        send:function (binaryMessage) {
            //ToDo: remove this test for checking current buffer
            var buffered = this.dataChannel.bufferedAmount
            if(buffered != 0)
                console.log("yay! sctp enabled? buffered amount is: " + buffered);
            //base64 encoding to be removed:
            var message = this.useBase64 ? peer5.core.util.base64.encode(binaryMessage) : binaryMessage.buffer;
            var thi$ = this;
            if (thi$.dataChannel.readyState.toLowerCase() == 'open') {
                peer5.debug("sending data on dataChannel");
                thi$.dataChannel.send(message);
            } else {
                peer5.info('dataChannel wasnt ready, seting timeout');
                setTimeout(function (dataChannel, message) {
                    thi$.send(dataChannel, message);
                }, 1000, thi$.dataChannel, message);
            }
        },
        close:function(){
            this.ready = false;
            this.dataChannel.close();
            this.peerConnection.close();
        },

        /** @private methods*/
        initiatePeerConnection:function (initiator) {
            this.initiatePeerConnectionCallbacks();
            this.createPeerConnection();
            if (initiator)
                this.ensureHasDataChannel();
            var id = setTimeout(function (thi$) {
                if (!thi$.ready) {
                    thi$.failure = true;
                    peer5.warn("couldn't connect to " + thi$.targetId);
                    thi$.handlePeerDisconnection(thi$.targetId);
                }
            }, peer5.config.PC_FAIL_TIMEOUT, this);
        },
        initiatePeerConnectionCallbacks:function () {
//            replaceReturnCallback(function (msg) {
//                console.log("return log: " + msg);
//            });
//            replaceDebugCallback(function (msg) {
//                console.log("return debug: " + msg);
//            });
            this.registerEvents();
        },
        registerEvents:function () {
            var thi$ = this;
            this.setLocalAndSendMessage_ = function (session_description) {
                session_description.sdp = thi$.transformOutgoingSdp(session_description.sdp);
                thi$.peerConnection.setLocalDescription(
                    session_description,
                    function () {
                        peer5.debug('setLocalDescription(): success.');
                    },
                    function (err) {
                        peer5.debug('setLocalDescription(): failed' + err)
                    });
                peer5.debug("Sending SDP message:\n" + session_description.sdp);
                var sdpMsg = new peer5.core.protocol.Sdp(thi$.originId, thi$.targetId, session_description);
                var encodedMsg = peer5.core.protocol.BinaryProtocol.encode([sdpMsg]);
//                thi$.ws.sendData(encodedMsg);
                radio('websocketsSendData').broadcast(encodedMsg);
//                thi$.ws.sendSDP({op:'sdp',sdp:JSON.stringify(session_description),targetId:thi$.targetId,originId:thi$.originId});
            };

            this.iceCallback_ = function (event) {
                if (event.candidate && event.target.iceConnectionState != 'disconnected') {
                    var sdpMsg = new peer5.core.protocol.Sdp(thi$.originId, thi$.targetId, event.candidate);
                    var encodedMsg = peer5.core.protocol.BinaryProtocol.encode([sdpMsg]);
//                    thi$.ws.sendData(encodedMsg);
                    radio('websocketsSendData').broadcast(encodedMsg);
                }
//                    thi$.ws.sendSDP({op:'sdp',sdp:JSON.stringify(event.candidate),targetId:thi$.targetId,originId:thi$.originId});
            };

            this.iceStateChangedCallback_ = function (event) {
                if (!!event.target && event.target.iceConnectionState === 'disconnected') {
                    thi$.handlePeerDisconnection();
                }

            };

            this.signalingStateChangeCallback_ = function (event) {
                if(event.target && event.target.signalingState == "closed"){
                    thi$.handlePeerDisconnection();
                }
            };

            this.onCreateDataChannelCallback_ = function (event) {
                if (thi$.dataChannel != null && thi$.dataChannel.readyState != 'closed') {
                    peer5.warn('Received DataChannel, but we already have one.');
                }
                thi$.dataChannel = event.channel;
                peer5.debug('DataChannel with label ' + thi$.dataChannel.label +
                    ' initiated by remote peer.');
                thi$.hookupDataChannelEvents();
            };

            this.onDataChannelReadyStateChange_ = function (event) {
                var readyState = event.target.readyState;
                peer5.info('DataChannel state:' + readyState);
                if (readyState.toLowerCase() == 'open') {
                    thi$.ready = true;
                    thi$.connectingDuration = Date.now() - thi$.startTime;
                    radio('connectionReady').broadcast(thi$.targetId);
                }
            };

            this.onDataChannelClose_ = function (event) {
                thi$.handlePeerDisconnection();
            };

            this.onMessageCallback_ = function (message) {
                peer5.debug("receiving data on dataChannel");
                var binaryMessage = thi$.useBase64 ? peer5.core.util.base64.decode(message.data) : new Uint8Array(message.data);
                radio('dataReceivedEvent').broadcast(binaryMessage, thi$.targetId);
            };
        },
        ensureHasDataChannel:function () {
            if (this.peerConnection == null)
                peer5.warn('Tried to create data channel, ' +
                    'but have no peer connection.');
            if (this.dataChannel != null && this.dataChannel != 'closed') {
                peer5.warn('Creating DataChannel, but we already have one.');
            }
            this.createDataChannel();
        },
        createPeerConnection:function () {
            var stun_servers = peer5.config.STUN_SERVERS;
            var turn_servers = peer5.config.TURN_SERVERS ? peer5.config.TURN_SERVERS : [];
            var turn_creds = peer5.config.TURN_CREDENTIALS;
            var servers = {"iceServers":[]};
            for (var i = 0; i < stun_servers.length; ++i) {
                servers.iceServers.push({url:"stun:" + stun_servers[i]});
            }
            for (var j = 0; j < turn_servers.length; ++j) {
                servers.iceServers.push({url:"turn:" + turn_servers[j], credential:turn_creds[j]});
            }
            try {
                peer5.info("webkitRTCPeerConnection");
                if(window.mozRTCPeerConnection)
//                    this.peerConnection = new this.RTCPeerConnection();
                    this.peerConnection = new this.RTCPeerConnection();
                else
                    this.peerConnection = new this.RTCPeerConnection(
                        servers
                        ,{ optional:[{ RtpDataChannels:true }]}
                    );
                this.peerConnection.candidates = {}; // to remember what candidates were added
            } catch (exception) {
                peer5.warn('Failed to create peer connection: ' + exception);
            }
            this.peerConnection.onaddstream = this.addStreamCallback_;
            this.peerConnection.onremovestream = this.removeStreamCallback_;
            this.peerConnection.onicecandidate = this.iceCallback_;
            this.peerConnection.oniceconnectionstatechange = this.iceStateChangedCallback_;
            this.peerConnection.onicechange = this.iceStateChangedCallback_;
            this.peerConnection.onsignalingstatechange = this.signalingStateChangeCallback_;
            this.peerConnection.ondatachannel = this.onCreateDataChannelCallback_;
        },
        createDataChannel:function () {
            peer5.info("createDataChannel");
            this.dataChannel = this.peerConnection.createDataChannel(this.label, this.dataChannelOptions);
            peer5.debug('DataChannel with label ' + this.dataChannel.label + ' initiated locally.');
            this.hookupDataChannelEvents();
        },
        closeDataChannel:function () {
            if (this.dataChannel == null)
                peer5.warn('Closing DataChannel, but none exists.');
            peer5.debug('DataChannel with label ' + this.dataChannel.label + ' is being closed.');
            this.dataChannel.close();
        },
        hookupDataChannelEvents:function () {
            this.dataChannel.binaryType = 'arraybuffer';
            this.dataChannel.onmessage = this.onMessageCallback_;
            this.dataChannel.onopen = this.onDataChannelReadyStateChange_;
            this.dataChannel.onclose = this.onDataChannelClose_;
            //connecting status:
            peer5.info('data-channel-status: ' + this.dataChannel.readyState);
        },
        transformOutgoingSdp:function (sdp) {
            var split = sdp.split("b=AS:30");
            if(split.length > 1)
                var newSDP = split[0] + "b=AS:1638400" + split[1];
            else
                newSDP = sdp;
            return newSDP;
        },
        //keeping add/remove stream since Firefox might still need it
        addStreamCallback_:function (event) {
            peer5.debug('Receiving remote stream...');
            var videoTag = document.getElementById('remote-view');
            videoTag.src = webkitURL.createObjectURL(event.stream);

            // Due to crbug.com/110938 the size is 0 when onloadedmetadata fires.
            // videoTag.onloadedmetadata = updateVideoTagSize_('remote-view');
            // Use setTimeout as a workaround for now.
            setTimeout(function () {
                updateVideoTagSize_('remote-view')
            }, 500);
        },
        removeStreamCallback_:function (event) {
            peer5.debug('Call ended.');
            document.getElementById("remote-view").src = '';
        },

        handlePeerDisconnection:function(){
            if(this.dataChannel.readyState != "closed"){
                peer5.info("handling peer disconnection: closing the datachannel");
                this.dataChannel.close();
            }
            if(this.peerConnection.signalingState != "closed"){
                peer5.info("handling peer disconnection: closing the peerconnection");
                this.peerConnection.close();
            }
//            if(this.dataChannel.readyState == "closed" &&
//                ((this.peerConnection.signalingState && this.peerConnection.signalingState == "closed")
//                    || (this.peerConnection.readyState && this.peerConnection.readyState == "closed")))
                radio('connectionFailed').broadcast(this.targetId);
        }
    })
})();
