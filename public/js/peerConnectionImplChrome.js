(function () {
    peerConnectionImplChrome = function (ws, originId, targetId, initiator) {
        this.ws = ws;

        var STUN_SERVER = 'stun.l.google.com:19302';

        /** @private */
        this.peerConnection;
        this.dataChannel;
        this.label = initiator ? (originId + targetId) : (targetId + originId);
        this.originId = originId;
        this.targetId = targetId;
        this.createAnswerConstraints = {};
        this.createOfferConstraints = {};

        this.initiatePeerConnectionCallbacks();
        this.createPeerConnection(STUN_SERVER);
        if (initiator)
            this.ensureHasDataChannel();
    };

    peerConnectionImplChrome.prototype = {
    //public methods
        setupCall:function (peerConnection) {
            debug('createOffer with constraints: ' +
                JSON.stringify(this.createOfferConstraints, null, ' '));
            this.peerConnection.createOffer(
                this.setLocalAndSendMessage_,
                function (err) {
                    debug('createOffer(): failed, ' + err)
                },
                this.createOfferConstraints);
        },


        handleMessage:function (message) {
            message = message.sdp;
            console.log('handling message ' + message);
            var parsed_msg = JSON.parse(message);
            if (parsed_msg.type) {
                var session_description = new RTCSessionDescription(parsed_msg);
                this.peerConnection.setRemoteDescription(
                    session_description,
                    function () {
                        debug('setRemoteDescription(): success.')
                    },
                    function (err) {
                        debug('setRemoteDescription(): failed, ' + err)
                    });
                if (session_description.type == "offer") {
                    debug('createAnswer with constraints: ' +
                        JSON.stringify(this.createAnswerConstraints, null, ' '));
                    this.peerConnection.createAnswer(
                        this.setLocalAndSendMessage_,
                        function (err) {
                            debug('createAnswer(): failed, ' + err)
                        },
                        this.createAnswerConstraints);
                }
                return;
            } else if (parsed_msg.candidate) {
                var candidate = new RTCIceCandidate(parsed_msg);
                this.peerConnection.addIceCandidate(candidate);
                return;
            }
            addTestFailure("unknown message received");
            return;
        },

        send:function(message){

            var thi$ = this;
            if (thi$.dataChannel.readyState.toLowerCase() == 'open') {
                thi$.dataChannel.send(message);
            } else {
                console.log('dataChannel wasnt ready, seting timeout');
                setTimeout(function (dataChannel, message) {
                    thi$.send(dataChannel, message);
                }, 1000, thi$.dataChannel, message);
            }
        },

    //private methods
        initiatePeerConnectionCallbacks:function () {
            replaceReturnCallback(function (msg) {
                console.log("return log: " + msg);
            });
            replaceDebugCallback(function (msg) {
                console.log("return debug: " + msg);
            });
            this.registerEvents();
        },

        registerEvents:function () {
            var thi$ = this;
            this.setLocalAndSendMessage_ = function (session_description) {
                session_description.sdp = thi$.transformOutgoingSdp(session_description.sdp);
                thi$.peerConnection.setLocalDescription(
                    session_description,
                    function () {
                        debug('setLocalDescription(): success.');
                    },
                    function (err) {
                        debug('setLocalDescription(): failed' + err)
                    });
                debug("Sending SDP message:\n" + session_description.sdp);
                thi$.ws.sendSDP(new protocol.Offer(JSON.stringify(session_description), thi$.targetId, thi$.originId));
            };

            this.iceCallback_ = function (event) {
                if (event.candidate)
                    thi$.ws.sendSDP(new protocol.Offer(JSON.stringify(event.candidate), thi$.targetId, thi$.originId));
            };

            this.onCreateDataChannelCallback_ = function (event) {
                if (thi$.dataChannel != null && thi$.dataChannel.readyState != 'closed') {
                    throw failTest('Received DataChannel, but we already have one.');
                }
                thi$.dataChannel = event.channel;
                debug('DataChannel with label ' + thi$.dataChannel.label +
                    ' initiated by remote peer.');
                thi$.hookupDataChannelEvents();
            };

            this.onDataChannelReadyStateChange_ = function (event) {
                var readyState = event.target.readyState;
                debug('DataChannel state:' + readyState);
                radio('connectionReady').broadcast(thi$.targetId);
            };

            this.onMessageCallback_ = function (message) {
//                console.log("received message" + message);
                radio('commandArrived').broadcast(message);
            };
        },

        ensureHasDataChannel:function () {
            if (this.peerConnection == null)
                throw failTest('Tried to create data channel, ' +
                    'but have no peer connection.');
            if (this.dataChannel != null && this.dataChannel != 'closed') {
                throw failTest('Creating DataChannel, but we already have one.');
            }
            this.createDataChannel();
        },

        createPeerConnection:function (stun_server) {
            servers = {iceServers:[
                {url:"stun:" + stun_server}
            ]};
            try {
                if (window.webkitRTCPeerConnection) {
                    console.log("webkitRTCPeerConnection");
                    this.peerConnection = new webkitRTCPeerConnection(
                        servers, { optional:[
                            { RtpDataChannels:true }
                        ]});
                }
                else if (window.mozRTCPeerConnection) {
                    console.log("window.mozRTCPeerConnection");
                    this.peerConnection = new mozRTCPeerConnection();
                    var thi$ = this;
                    navigator.mozGetUserMedia({video:true, fake:true}, function (vs) {
                        thi$.peerConnection.addStream(vs);
                    }, addTestFailure)
                }
            } catch (exception) {
                throw failTest('Failed to create peer connection: ' + exception);
            }
            this.peerConnection.onaddstream = this.addStreamCallback_;
            this.peerConnection.onremovestream = this.removeStreamCallback_;
            this.peerConnection.onicecandidate = this.iceCallback_;
            this.peerConnection.ondatachannel = this.onCreateDataChannelCallback_;
        },

        createDataChannel:function () {
            console.log("createDataChannel");
            if (window.webkitRTCPeerConnection)
                this.dataChannel = this.peerConnection.createDataChannel(this.label, { reliable:false });
            else if (window.mozRTCPeerConnection)
                this.dataChannel = this.peerConnection.createDataChannel(this.label, {outOfOrderAllowed:true, maxRetransmitNum:0});

            debug('DataChannel with label ' + this.dataChannel.label + ' initiated locally.');
            this.hookupDataChannelEvents();
        },

        closeDataChannel:function (peerConnection) {
            if (this.dataChannel == null)
                throw failTest('Closing DataChannel, but none exists.');
            debug('DataChannel with label ' + this.dataChannel.label + ' is beeing closed.');
            this.dataChannel.close();
        },

        hookupDataChannelEvents:function () {
            this.dataChannel.onmessage = this.onMessageCallback_;
            this.dataChannel.onopen = this.onDataChannelReadyStateChange_;
            this.dataChannel.onclose = this.onDataChannelReadyStateChange_;
            //connecting status:
            console.log('data-channel-status: ' + this.dataChannel.readyState);
        },

        transformOutgoingSdp:function (sdp) {
            var splitted = sdp.split("b=AS:30");
            var newSDP = splitted[0] + "b=AS:1638400" + splitted[1];
            return newSDP;
        },

        //keeping add/remove stream since firefox might still need it
        addStreamCallback_:function (event) {
            debug('Receiving remote stream...');
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
            debug('Call ended.');
            document.getElementById("remote-view").src = '';
        }

    }
})();
