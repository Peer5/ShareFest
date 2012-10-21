if (!console || !console.log) {
    var console = {
        log:function () {
        }
    };
}
// Ugh, globals.
var peerc;
var myUserID;
var mainRef = new Firebase("https://gamma.firebase.com/kix/gupshup/");
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
    }, error);
}
;
function log(info) {
    var d = document.getElementById("debug");
    d.innerHTML += info + "\n\n";
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
    navigator.mozGetUserMedia({video:true}, function (vs) {
        document.getElementById("localvideo").mozSrcObject = vs;
        document.getElementById("localvideo").play();
        navigator.mozGetUserMedia({audio:true}, function (as) {
            document.getElementById("localaudio").mozSrcObject = as;
            document.getElementById("localaudio").play();
            var pc = new mozRTCPeerConnection();
            pc.addStream(vs);
            pc.addStream(as);
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
    }, error);
}
function initiateCall(userid) {
    document.getElementById("main").style.display = "none";
    document.getElementById("call").style.display = "block";
    navigator.mozGetUserMedia({video:true}, function (vs) {
        document.getElementById("localvideo").mozSrcObject = vs;
        document.getElementById("localvideo").play();
        navigator.mozGetUserMedia({audio:true}, function (as) {
            document.getElementById("localaudio").mozSrcObject = as;
            document.getElementById("localaudio").play();
            var pc = new mozRTCPeerConnection();
            pc.addStream(vs);
            pc.addStream(as);
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
prereqs(); 