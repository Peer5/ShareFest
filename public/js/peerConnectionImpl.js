(function () {
    peerConnectionImpl = function (originId, targetId, initiator) {
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

    peerConnectionImpl.prototype = {

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
            radio('onCreateDataChannelCallback' + this.label).subscribe([function (event) {
                if (this.dataChannel != null && this.dataChannel.readyState != 'closed') {
                    throw failTest('Received DataChannel, but we already have one.');
                }
                this.dataChannel = event.channel;
                debug('DataChannel with label ' + this.label +
                    ' initiated by remote peer.');
                this.hookupDataChannelEvents();
            }, this]);

            radio('onDataChannelReadyStateChange' + this.label).subscribe([function (event) {
                var readyState = event.target.readyState;
                debug('DataChannel state:' + readyState);
                radio('connectionReady').broadcast(event.target);
            }, this]);

            radio('receivedMessage' + this.label).subscribe([function (data_message) {
                console.log("received message" + data_message);
                radio('commandArrived').broadcast(data_message.currentTarget,data_message);
            }, this]);

            radio('setLocalAndSendMessage' + this.label).subscribe([function (session_description) {
                session_description.sdp = this.transformOutgoingSdp(session_description.sdp);
                this.peerConnection.setLocalDescription(
                    session_description,
                    function () {
                        debug('setLocalDescription(): success.');
                    },
                    function (err) {
                        debug('setLocalDescription(): failed' + err)
                    });
                debug("Sending SDP message:\n" + session_description.sdp);
                ws.sendSDP(new protocol.Offer(JSON.stringify(session_description), this.peerConnection.targetId, this.peerConnection.originId));
            }, this]);
        },

        ensureHasDataChannel:function () {
            if (this.peerConnection == null)
                throw failTest('Tried to create data channel, ' +
                    'but have no peer connection.');
            if (this.dataChannel != null && this.dataChannel != 'closed') {
                throw failTest('Creating DataChannel, but we already have one.');
            }
            this.dataChannel = this.createDataChannel();
        },

        handleMessage:function (message) {
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
                    tempPeerConnection = this.peerConnection;
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

        createPeerConnection:function (stun_server) {
            servers = {iceServers:[
                {url:"stun:" + stun_server}
            ]};
            try {
                this.peerConnection = new webkitRTCPeerConnection(
                    servers, { optional:[
                        { RtpDataChannels:true }
                    ]});
            } catch (exception) {
                throw failTest('Failed to create peer connection: ' + exception);
            }
            this.peerConnection.onaddstream = this.addStreamCallback_;
            this.peerConnection.onremovestream = this.removeStreamCallback_;
            this.peerConnection.onicecandidate = this.iceCallback_;
            this.peerConnection.ondatachannel = this.onCreateDataChannelCallback_;
            this.peerConnection.originId = this.originId;
            this.peerConnection.targetId = this.targetId;
//            return this.peerConnection;
        },

        setupCall:function (peerConnection) {
            debug('createOffer with constraints: ' +
                JSON.stringify(this.createOfferConstraints, null, ' '));
            tempPeerConnection = this.peerConnection;
            this.peerConnection.createOffer(
                this.setLocalAndSendMessage_,
                function (err) {
                    debug('createOffer(): failed, ' + err)
                },
                this.createOfferConstraints);
        },

        createDataChannel:function () {
            console.log("createDataChannel");
            this.dataChannel = this.peerConnection.createDataChannel(this.label, { reliable:false });
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
            this.dataChannel.onmessage = function (data_message) {
                //scope is the datachannel
                radio('receivedMessage' + this.label).broadcast(data_message);
            }
            this.dataChannel.onopen = this.onDataChannelReadyStateChange_;
            this.dataChannel.onclose = this.onDataChannelReadyStateChange_;
            // Trigger gDataStatusCallback so an application is notified
            // about the created data channel.
            console.log('data-channel-status: ' + this.dataChannel.readyState);
//    onDataChannelReadyStateChange_(dataChannel);
        },

        transformOutgoingSdp:function (sdp) {
            return sdp;
        },

// Internals.
        iceCallback_:function (event) {
            if (event.candidate)
                ws.sendSDP(new protocol.Offer(JSON.stringify(event.candidate), event.currentTarget.targetId, event.currentTarget.originId));
//        sendToPeer(gRemotePeerId, JSON.stringify(event.candidate));
        },

        setLocalAndSendMessage_:function (session_description) {
            //parsing the label from the sdp:
            var subStrings = session_description.sdp.split(" label:"); //the label is at the end of the sdp
            var label = subStrings[subStrings.length - 1].replace(/\n|\r/g, ""); //removing newlines
            radio('setLocalAndSendMessage' + label).broadcast(session_description);
        },

        onCreateDataChannelCallback_:function (event) {
            console.log("onCreateDataChannel");
            console.log(event);
            radio('onCreateDataChannelCallback' + event.channel.label).broadcast(event);
        },

        onDataChannelReadyStateChange_:function (event) {
            console.log('onDataChannelReadyStateChange');
            radio('onDataChannelReadyStateChange' + event.currentTarget.label).broadcast(event);
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
