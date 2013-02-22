(function () {
    peerConnectionImplFirefox = function (ws, originId, targetId, initiator) {
        this.ws = ws;
        this.originId = originId;
        this.targetId = targetId;
        this.peerConnection;
        this.dataChannel;
        this.secondaryDataChannel;
        this.secondaryDataChannel2;
        //pseudo ports for connectDataConnection() - will be deperecated soon.
        this.offererPort;
        this.answererPort;
        this.connectionReady = false;
        this.registerEvents();
        this.createPeerConnection();
    };

    peerConnectionImplFirefox.prototype = {
    //public methods
        setupCall:function () {
            this.initiateCall();
        },

        handleMessage:function (msg) {
            console.log("receivedOffer: " + msg.type);
            switch (msg.type) {
                case "offer":
                    this.offererPort = msg.port || 5000;
                    this.acceptCall(msg.offer, msg.originId);
                    break;
                case "answer":
                    this.answererPort = msg.port || 5001;
                    this.incomingAnswer(msg.answer);
                    break;
            }
        },

        send:function(message){
            var thi$ = this;
            if (thi$.dataChannel.readyState.toLowerCase() == 'open') {
                thi$.dataChannel.send(message)
            } else {
                console.log('dataChannel wasnt ready, seting timeout');
                setTimeout(function (dataChannel, message) {
                    thi$.send(dataChannel, message);
                }, 1000, thi$.dataChannel, message);
            }
        },

    //private methods
        registerEvents:function () {

        },

        initiateCall:function () {
            console.log("init");
            var thi$ = this;
            navigator.mozGetUserMedia({audio:true, fake:true},function(as){
                    console.log("gotMedia", as);
                    thi$.peerConnection.addStream(as);
                    thi$.peerConnection.createOffer(function (offer) {
                        console.log("Created offer" + (offer.sdp));
                        console.log(offer.sdp);
                        thi$.peerConnection.setLocalDescription(offer, function () {
                            // Send offer to remote end.
                            console.log("setLocalDescription, sending to remote");
                            thi$.offererPort = Math.floor(Math.random() * 5000) * 2;
                            var toSend = {
                                type:"offer",
                                originId:thi$.ws.socket.socket.sessionid,
                                targetId:thi$.targetId,
                                port:thi$.offererPort,
                                offer:JSON.stringify(offer)
                            };
                            console.log("remoteID: " + thi$.targetId);
                            thi$.ws.sendSDP(toSend);
                        }, thi$.error);
                    }, thi$.error);
            }, this.error);
        },

        createPeerConnection:function (as) {
            var thi$ = this;
            this.peerConnection = new mozRTCPeerConnection();
            this.peerConnection.onaddstream = this.onaddstream;
            this.peerConnection.onconnection = function () {
                console.log("pc1 onconnection");
                if(thi$.dataChannel)
                    thi$.secondarydataChannel2 = thi$.dataChannel;
                thi$.dataChannel = thi$.peerConnection.createDataChannel("This is pc1", {}); // reliable (TCP-like)
//                thi$.dataChannel = thi$.peerConnection.createDataChannel("This is pc1", {outOfOrderAllowed: true, maxRetransmitNum: 0}); // reliable (TCP-like)
                //            channel = pc.createDataChannel("This is pc1",{outOfOrderAllowed: true, maxRetransmitNum: 0});
                thi$.setupChannel("Hello out there.");
            };
            this.peerConnection.ondatachannel = function (channel) {
                // In case pc2 opens a channel
                console.log("pc onDataChannel = " + channel + ", label='" + channel.label + "'");

                // There's a race condition with onopen; if the channel is already
                // open it should fire after onDataChannel -- state should normally be 0 here
                if(thi$.dataChannel)
                    thi$.secondaryDataChannel = thi$.dataChannel;
                thi$.dataChannel = channel;
                thi$.setupChannel("Hello out there.");
                if (thi$.dataChannel.readyState !== 0) {
                    console.log("*** pc1 no onopen??! possible race");
                }
            };
        },

        incomingAnswer:function (answer) {
            console.log("incomingAnswer");
            var thi$ = this;
            this.peerConnection.setRemoteDescription(JSON.parse(answer), function () {
                console.log("Recieved answer" + (JSON.parse(answer).sdp));

                console.log("sdp negotiation finished");
                setTimeout(function () {
                    thi$.peerConnection.connectDataConnection(thi$.offererPort, thi$.answererPort);
                    console.log("connectDataConnection(" + thi$.offererPort + "," + thi$.answererPort + ")");
                }, 3000);
            }, this.error);
        },

        acceptCall:function (offer, fromUser) {
            console.log("Incoming call with offer" + (JSON.parse(offer).sdp));
            var thi$ = this;
            navigator.mozGetUserMedia({audio:true, fake:true}, function (as) {
                thi$.peerConnection.addStream(as);
                thi$.peerConnection.setRemoteDescription(JSON.parse(offer), function () {
                    console.log("setRemoteDescription, creating answer");

                    thi$.peerConnection.createAnswer(function (answer) {
                        thi$.peerConnection.setLocalDescription(answer, function () {
                            // Send answer to remote end.
                            console.log("created Answer and setLocalDescription " + (answer.sdp));

                            console.log(answer.sdp)
                            thi$.answererPort = thi$.offererPort + 1;
                            var toSend = {
                                type:"answer",
                                originId:thi$.originId,
                                targetId:thi$.targetId,
                                port:thi$.answererPort,
                                answer:JSON.stringify(answer)
                            };
                            thi$.ws.sendSDP(toSend);
                            console.log("remoteID: " + thi$.targetId)

                            setTimeout(function () {
                                thi$.peerConnection.connectDataConnection(thi$.answererPort, thi$.offererPort);
                                console.log("connectDataConnection(" + thi$.answererPort + "," + thi$.offererPort + ")");
                            }, 3000);
                        }, thi$.error);
                    }, thi$.error);
                }, thi$.error);
            }, this.error);
        },

        setupChannel:function (localPC, remotePC, greeting) {
            localPC = this.originId;
            remotePC = this.targetId;
            var thi$ = this;
            this.dataChannel.onerror = this.error;
            this.dataChannel.onmessage = function (evt) {
                if (evt.data instanceof Blob) {
                    console.log("file from ", remotePC, " ,length=", evt.data.size);

                    var objectURL = window.URL.createObjectURL(evt.data);
                    console.log(thi$.targetId + " sent Blob: <a href='" + objectURL + "'>[File]</a>, type=" + evt.data.type + ", length=" + evt.data.size);
                    console.dir(evt.data);

                } else {
                    //            log("message from", remotePC," length=",evt.data.length);
                    //            console.log(evt.data);
                    radio('commandArrived').broadcast(evt);
                }
            };

            this.dataChannel.onopen = function () {
                if(thi$.connectionReady)
                    return console.log("connection is ready allready!");
                thi$.connectionReady = true;
                console.log(localPC + " onopen fired for " + thi$.dataChannel);
                if (greeting) {
                    thi$.dataChannel.send(proto64.message(thi$.originId, thi$.targetId, greeting));
                }
                console.log(localPC + "state: " + thi$.dataChannel.state);
                radio('connectionReady').broadcast(thi$.targetId);
            };

            this.dataChannel.onclose = function () {
                console.log(localPC + " onclosed fired")
            };

            console.log(localPC + " state:" + this.dataChannel.readyState);
        },

        onaddstream:function (obj) {
            console.log("Got onaddstream of type " + obj.type);
        },

        endCall:function () {
            console.log("Ending call");
        },

        error:function (e) {
            console.log(e);
            if (typeof e === typeof {}) {
                alert("Oh no! " + JSON.stringify(e));
            } else {
                alert("Oh no! " + e);
            }
            this.endCall();
        }
    }
})();