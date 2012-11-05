if (!console || !console.log) {
    var console = {
        log:function () {
        }
    };
}
// Ugh, globals.
var user=2;
var peerc;
var myUserID;
var mainRef = new Firebase("https://gamma.firebase.com/kix/gupshup/");
var num_channels = 0;
var dc2;
var dc1;
var datachannels = [];
$("#incomingCall").modal();
$("#incomingCall").modal("hide");
function prereqs() {
    if (!navigator.mozGetUserMedia) {
        error("Sorry, getUserMedia is not available! (Did you set media.navigator.enabled?)");
        return;
    }
    if (!window.mozRTCPeerConnection) {
        error("Sorry, PeerConnection is not available! (Did you set media.peerconnection.enabled?)");
        return;
    }
// Ask user to login.
    var name = prompt("Enter your username", "Guest" + Math.floor(Math.random() * 100) + 1);
// Set username & welcome.
    document.getElementById("username").innerHTML = name;
    document.getElementById("welcome").style.display = "block";
    myUserID = btoa(name);
    var userRef = mainRef.child(myUserID);
    var userSDP = userRef.child("sdp");
    var userStatus = userRef.child("presence");
    userSDP.setOnDisconnect(null);
    userStatus.setOnDisconnect(false);
    $(window).unload(function () {
        userSDP.set(null);
        userStatus.set(false);
    });
// Now online.
    userStatus.set(true);
    mainRef.on("child_added", function (snapshot) {
        var data = snapshot.val();
        if (data.presence) {
            appendUser(snapshot.name());
        }
    });
    mainRef.on("child_changed", function (snapshot) {
        var data = snapshot.val();
        if (data.presence) {
            removeUser(snapshot.name());
            appendUser(snapshot.name());
        }
        if (!data.presence) {
            removeUser(snapshot.name());
        }
        if (data.sdp && data.sdp.to == myUserID) {
            if (data.sdp.type == "offer") {
                incomingOffer(data.sdp.offer, data.sdp.from)
                userSDP.set(null);
            }
            if (data.sdp.type == "answer") {
                incomingAnswer(data.sdp.answer);
                userSDP.set(null);
            }
        }
    });
}
function error(msg) {
    document.getElementById("message").innerHTML = msg;
    document.getElementById("alert").style.display = "block";
}
$("#incomingCall").on("hidden", function () {
    document.getElementById("incomingRing").pause();
});
function incomingOffer(offer, fromUser) {
    document.getElementById("incomingUser").innerHTML = atob(fromUser);
    document.getElementById("incomingAccept").onclick = function () {
        $("#incomingCall").modal("hide");
        acceptCall(offer, fromUser);
    };
    $("#incomingCall").modal();
    document.getElementById("incomingRing").play();
}
;
function incomingAnswer(answer) {
    peerc.setRemoteDescription(JSON.parse(answer), function () {
        log("Call established!");
        setTimeout(dataChannelConnect,2000);
    }, error);
}
;
function log(info) {
    var d = document.getElementById("debug");
    d.innerHTML += info + "\n\n";
    console.log(info);
}
function appendUser(userid) {
    if (userid == myUserID) return;
    var d = document.createElement("div");
    d.setAttribute("id", userid);
    var a = document.createElement("a");
    a.setAttribute("class", "btn btn-block btn-inverse");
    a.setAttribute("onclick", "initiateCall('" + userid + "');");
    a.innerHTML = "<i class='icon-user icon-white'></i> " + atob(userid);
    d.appendChild(a);
    d.appendChild(document.createElement("br"));
    document.getElementById("users").appendChild(d);
}
function removeUser(userid) {
    var d = document.getElementById(userid);
    if (d) {
        document.getElementById("users").removeChild(d);
    }
}
// TODO: refactor, this function is almost identical to initiateCall().
function acceptCall(offer, fromUser) {
    log("Incoming call with offer " + offer);
    document.getElementById("main").style.display = "none";
    document.getElementById("call").style.display = "block";
    navigator.mozGetUserMedia({video:true,fake:true}, function (vs) {
        document.getElementById("localvideo").mozSrcObject = vs;
        document.getElementById("localvideo").play();
            var pc = new mozRTCPeerConnection();

            pc.ondatachannel = function (channel) {
                log("pc2 onDataChannel");
                log("pc2 onDataChannel [" + num_channels + "] = " + channel +
                    ", label='" + channel.label + "'");
                dc2 = channel;
                datachannels[num_channels] = channel;
                num_channels++;
                log("num_channels: " + num_channels);
                log("pc2 created channel " + dc2 + " binarytype = " + dc2.binaryType);
                channel.binaryType = "blob";
                log("pc2 new binarytype = " + dc2.binaryType);

                channel.onmessage = function (evt) {
                    log("onMessage in pc2: " + evt.data);
                    iter2 = iter2 + 1;
                    if (evt.data instanceof Blob) {
                        log("*** pc1 sent Blob: " + evt.data + ", length=" + evt.data.size, "red");
                        saveLocally(evt.data);
                    } else {
                        log("*** pc1 said: " + evt.data + ", length=" + evt.data.length, "red");
                    }
                };
                channel.onopen = function () {
                    log("*** pc2 onopen fired, sending to " + channel);
                    channel.send("pc2 says Hi there!");
                };
                channel.onclose = function () {
                    log("*** pc2 onclose fired");
                };
                log("*** pc2 state:" + channel.readyState);
                // There's a race condition with onopen; if the channel is already
                // open it should fire after onDataChannel -- state should normally be 0 here
                if (channel.readyState != 0) {
                    log("*** pc2 no onopen??! possible race");
                }

            };


            pc.onconnection = function () {
                log("pc2 onConnection ");
                //dc2 = pc2.createDataChannel();
                //log("pc2 created channel " + dc2);
            }



            pc.addStream(vs);
            pc.onaddstream = function (obj) {
                log("Got onaddstream of type " + obj.type);
                if (obj.type == "video") {
                    document.getElementById("remotevideo").mozSrcObject = obj.stream;
                    document.getElementById("remotevideo").play();
                } else {
                    document.getElementById("remoteaudio").mozSrcObject = obj.stream;
                    document.getElementById("remoteaudio").play();
                }
                document.getElementById("dialing").style.display = "none";
                document.getElementById("hangup").style.display = "block";
            };



            pc.setRemoteDescription(JSON.parse(offer), function () {

                log("setRemoteDescription, creating answer");
                pc.createAnswer(function (answer) {
                    pc.setLocalDescription(answer, function () {
                // Send answer to remote end.
                        log("created Answer and setLocalDescription " + JSON.stringify(answer));
                        peerc = pc;
                        setTimeout(dataChannelConnect,2000);
                        var toSend = {
                            type:"answer",
                            to:fromUser,
                            from:myUserID,
                            answer:JSON.stringify(answer)
                        };
                        var toUser = mainRef.child(toSend.to);
                        var toUserSDP = toUser.child("sdp");
                        toUserSDP.set(toSend);
                    }, error);
                }, error);
            }, error);
    }, error);
}
function initiateCall(userid) {
    user=1;
    document.getElementById("main").style.display = "none";
    document.getElementById("call").style.display = "block";
    navigator.mozGetUserMedia({video:true,fake:true}, function (vs) {
        document.getElementById("localvideo").mozSrcObject = vs;
        document.getElementById("localvideo").play();
            var pc = new mozRTCPeerConnection();
            pc.addStream(vs);
            pc.onaddstream = function (obj) {
                log("Got onaddstream of type " + obj.type);
                if (obj.type == "video") {
                    document.getElementById("remotevideo").mozSrcObject = obj.stream;
                    document.getElementById("remotevideo").play();
                } else {
                    document.getElementById("remoteaudio").mozSrcObject = obj.stream;
                    document.getElementById("remoteaudio").play();
                }
                document.getElementById("dialing").style.display = "none";
                document.getElementById("hangup").style.display = "block";
            };

            pc.ondatachannel = function (channel) {
                // In case pc2 opens a channel
                log("pc1 onDataChannel [" + num_channels + "] = " + channel +
                    ", label='" + channel.label + "'");
                datachannels[num_channels] = channel;
                num_channels++;

                channel.onmessage = function (evt) {
                    log("onMessage in pc1: " + evt.data);
                    if (evt.data instanceof Blob) {
                        log("*** pc2 sent Blob: " + evt.data + ", length=" + evt.data.size, "blue");
                    } else {
                        log('pc2 said: ' + evt.data + ", length=" + evt.data.length, "blue");
                    }
                }

                channel.onopen = function () {
                    log("pc1 onopen fired for " + channel);
                    channel.send("pc1 says Hello out there...");
                    log("pc1 state: " + channel.readyState);
                }
                channel.onclose = function () {
                    log("pc1 onclose fired");
                };
                log("pc1 state:" + channel.readyState);
                // There's a race condition with onopen; if the channel is already
                // open it should fire after onDataChannel -- state should normally be 0 here
                if (channel.readyState != 0) {
                    log("*** pc1 no onopen??! possible race");
                }
            }

            pc.onconnection = function () {
                log("pc1 onConnection ");
                dc1 = pc.createDataChannel("This is pc1", {}); // reliable (TCP-like)
                //  dc1 = pc1.createDataChannel("This is pc1",{outOfOrderAllowed: true, maxRetransmitNum: 0}); // unreliable (UDP-like)
                log("pc1 created channel " + dc1 + " binarytype = " + dc1.binaryType);
                channel = dc1;
                channel.binaryType = "blob";
                log("pc1 new binarytype = " + dc1.binaryType);

                // Since we create the datachannel, don't wait for onDataChannel!
                channel.onmessage = function (evt) {
                    log("onMessage in pc1: " + evt.data);
                    if (evt.data instanceof Blob) {
                        log("*** pc2 sent Blob: " + evt.data + ", length=" + evt.data.size, "blue");
                    } else {
                        log('pc2 said: ' + evt.data, "blue");
                    }
                }
                channel.onopen = function () {
                    log("pc1 onopen fired for " + channel);
                    channel.send("pc1 says Hello...");
                    log("pc1 state: " + channel.state);
                }
                channel.onclose = function () {
                    log("pc1 onclose fired");
                };
                log("pc1 state:" + channel.readyState);
            }
            pc.createOffer(function (offer) {
                log("Created offer" + JSON.stringify(offer));
                pc.setLocalDescription(offer, function () {
// Send offer to remote end.
                    log("setLocalDescription, sending to remote");
                    peerc = pc;
                    var toSend = {
                        type:"offer",
                        to:userid,
                        from:myUserID,
                        offer:JSON.stringify(offer)
                    };
                    var toUser = mainRef.child(toSend.to);
                    var toUserSDP = toUser.child("sdp");
                    toUserSDP.set(toSend);
                }, error);
            }, error);
    }, error);
}
function endCall() {
    log("Ending call");
    document.getElementById("call").style.display = "none";
    document.getElementById("main").style.display = "block";
    document.getElementById("localvideo").pause();
    document.getElementById("localaudio").pause();
    document.getElementById("remotevideo").pause();
    document.getElementById("remoteaudio").pause();
    document.getElementById("localvideo").src = null;
    document.getElementById("localaudio").src = null;
    document.getElementById("remotevideo").src = null;
    document.getElementById("remoteaudio").src = null;
    peerc = null;
}
function error(e) {
    if (typeof e == typeof {}) {
        alert("Oh no! " + JSON.stringify(e));
    } else {
        alert("Oh no! " + e);
    }
    endCall();
}

function dataChannelConnect(){
    log("connecting in data channel");
    log("peerc " + peerc);
    log("user: " + user);
    if(user == '1')
        peerc.connectDataConnection(5000,5001);
    else
        peerc.connectDataConnection(5001,5000);

}
prereqs(); 