/**
 * Copyright (c) 2012 The Chromium Authors. All rights reserved.
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

// The *Here functions are called from peerconnection.html and will make calls
// into our underlying JavaScript library with the values from the page
// (have to be named differently to avoid name clashes with existing functions).

function connectFromHere() {
    var ws_url = $('server').value;
    if ($('peer-id').value == '') {
        // Generate a random name to distinguish us from other tabs:
        $('peer-id').value = 'peer_' + Math.floor(Math.random() * 10000);
        debug('Our name from now on will be ' + $('peer-id').value);
    }
    var roomid = 'broadcast';
    gOurClientName = $('peer-id').value;
    socket = new WsConnection(ws_url,$('peer-id').value)
}

function negotiateCallFromHere() {
    ensureHasPeerConnection_();
    negotiateCall();
}

function hangUpFromHere() {
    hangUp();
    acceptIncomingCallsAgain();
}

function createDataChannelFromHere() {
    ensureHasPeerConnection_();
    createDataChannelOnPeerConnection();
}

function closeDataChannelFromHere() {
    ensureHasPeerConnection_();
    closeDataChannelOnPeerConnection();
}

function sendDataFromHere() {
    var data = 'text' + $('data-channel-send').value;
    sendDataOnChannel(data);
}

function sendDataFromLoop() {
    var s='';
    for (var i=0;i<100000;i++) {
        console.log('sending text in length ' + i);
        sendDataOnChannel(s);
        s+='+';
    }
}

function sendBlobFromHere() {
    var data = 'blob' + $('data-channel-blob').toSend;
    sendDataOnChannel(data);
}


function showServerHelp() {
    alert('You need to build and run a peerconnection_server on some ' +
        'suitable machine. To build it in chrome, just run make/ninja ' +
        'peerconnection_server. Otherwise, read in https://code.google' +
        '.com/searchframe#xSWYf0NTG_Q/trunk/peerconnection/README&q=REA' +
        'DME%20package:webrtc%5C.googlecode%5C.com.');
}

/**
 * Prepopulate constraints from JS to the UI and setup callbacks in the scripts
 * shared with PyAuto tests.
 */
window.onload = function() {
    replaceReturnCallback(print_);
    replaceDebugCallback(debug_);
    doNotAutoAddLocalStreamWhenCalled();
    hookupDataChannelCallbacks_();
    document.getElementById('data-channel-blob').addEventListener('change', handleFileSelect, false);
};

/**
 * Disconnect before the tab is closed.
 */
window.onunload = function() {
    if (!isDisconnected())
        disconnect();
};

// Internals.

/**
 * Create the peer connection if none is up (this is just convenience to
 * avoid having a separate button for that).
 * @private
 */
function ensureHasPeerConnection_() {
    if (getReadyState() == 'no-peer-connection')
        preparePeerConnection();
}

/**
 * @private
 * @param {string} message Text to print.
 */
function print_(message) {
    // Filter out uninteresting noise.
    if (message == 'ok-no-errors')
        return;

    console.log(message);
    $('messages').innerHTML += message + '<br>';
}

/**
 * @private
 * @param {string} message Text to print.
 */
function debug_(message) {
//    console.log(message);
//    $('debug').innerHTML += message + '<br>';
}

/**
 * Swaps lines within a SDP message.
 * @private
 * @param {string} sdp The full SDP message.
 * @param {string} line The line to swap with swapWith.
 * @param {string} swapWith The other line.
 * @return {string} The altered SDP message.
 */
function swapSdpLines_(sdp, line, swapWith) {
    var lines = sdp.split('\r\n');
    var lineStart = lines.indexOf(line);
    var swapLineStart = lines.indexOf(swapWith);
    if (lineStart == -1 || swapLineStart == -1)
        return sdp;  // This generally happens on the first message.

    var tmp = lines[lineStart];
    lines[lineStart] = lines[swapLineStart];
    lines[swapLineStart] = tmp;

    return lines.join('\r\n');
}


/** @private */
function dontTouchSdp_() {
    setOutgoingSdpTransform(function(sdp) { return sdp; });
}

/** @private */
function hookupDataChannelCallbacks_() {
    setDataCallbacks(function(status) {
            console.log('data-channel-status: ' + status);
        },
        function(data_message) {
            console.log("received message" + data_message);
            debug('Received ' + data_message.data);
            var header = data_message.data.slice(0,4);
            var body = data_message.data.slice(4);
            if(header=='text'){
                console.log("received text message");
            }else if(header = 'blob'){
                var splitAns = body.split(',');
                var meta = splitAns[0].split(':')[1].split(';')[0];
                console.log(meta);
                var data = base64.decode(splitAns[1]);
                var blob = new Blob([data],{type:meta});
                saveLocally(blob);
            }

        });
}

$ = function(id) {
    return document.getElementById(id);
};
