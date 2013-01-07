/**
 * Copyright (c) 2012 The Chromium Authors. All rights reserved.
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

// This file requires these functions to be defined globally by someone else:
// function handleMessage(peerConnection, message)
// function createPeerConnection(stun_server)
// function setupCall(peerConnection)
// function answerCall(peerConnection, message)

// Currently these functions are supplied by jsep01_call.js.

/**
 * This object represents the call.
 * @private
 */
var gPeerConnection = null;

/**
 * True if we are accepting incoming calls.
 * @private
 */
var gAcceptsIncomingCalls = true;

/**
 * Our peer id as assigned by the peerconnection_server.
 * @private
 */
var gOurPeerId = null;

/**
 * The client id we use to identify to peerconnection_server.
 * @private
 */
var gOurClientName = null;

/**
 * The URL to the peerconnection_server.
 * @private
 */
var gServerUrl = null;

/**
 * The remote peer's id. We receive this one either when we connect (in the case
 * our peer connects before us) or in a notification later.
 * @private
 */
var gRemotePeerId = null;

/**
 * Whether or not to auto-respond by adding our local stream when we are called.
 * @private
 */
var gAutoAddLocalToPeerConnectionStreamWhenCalled = true;

/**
 * The one and only data channel.
 * @private
 */
var gDataChannel = null;

/**
 * We need a STUN server for some API calls.
 * @private
 */
var STUN_SERVER = 'stun.l.google.com:19302';

// Public interface to PyAuto test.


/**
 * Connects to the provided peerconnection_server.
 *
 * @param{string} serverUrl The server URL in string form without an ending
 *     slash, something like http://localhost:8888.
 * @param{string} clientName The name to use when connecting to the server.
 */
function connect(serverUrl, clientName) {
    if (gOurPeerId != null)
        throw failTest('connecting, but is already connected.');

    debug('Connecting to ' + serverUrl + ' as ' + clientName);
    gServerUrl = serverUrl;
    gOurClientName = clientName;

    request = new XMLHttpRequest();
    request.open('GET', serverUrl + '/sign_in?' + clientName, true);
    debug(serverUrl + '/sign_in?' + clientName);
    request.onreadystatechange = function() {
        connectCallback_(request);
    }
    request.send();
}

/**
 * Checks if the remote peer has connected. Returns peer-connected if that is
 * the case, otherwise no-peer-connected.
 */
function remotePeerIsConnected() {
    if (gRemotePeerId == null)
        returnToTest('no-peer-connected');
    else
        returnToTest('peer-connected');
}

/**
 * Creates a peer connection. Must be called before most other public functions
 * in this file.
 */
function preparePeerConnection() {
    if (gPeerConnection != null)
        throw failTest('creating peer connection, but we already have one.');

    gPeerConnection = createPeerConnection(STUN_SERVER);
    returnToTest('ok-peerconnection-created');
}

/**
 * Negotiates a call with the other side. This will create a peer connection on
 * the other side if there isn't one. The other side will automatically add any
 * stream it has unless doNotAutoAddLocalStreamWhenCalled() has been called.
 *
 * To call this method we need to be aware of the other side, e.g. we must be
 * connected to peerconnection_server and we must have exactly one peer on that
 * server.
 *
 * This method may be called any number of times. If you haven't added any
 * streams to the call, an "empty" call will result. The method will return
 * ok-negotiating immediately to the test if the negotiation was successfully
 * sent.
 */
function negotiateCall() {
    if (gPeerConnection == null)
        throw failTest('negotiating call, but we have no peer connection.');
//    if (gOurPeerId == null)
//        throw failTest('negotiating call, but not connected.');
//    if (gRemotePeerId == null)
//        throw failTest('negotiating call, but missing remote peer.');
    setupCall(gPeerConnection);
    returnToTest('ok-negotiating');
}

/**
 * Adds the local stream to the peer connection. You will have to re-negotiate
 * the call for this to take effect in the call.
 */
function addLocalStream() {
    if (gPeerConnection == null)
        throw failTest('adding local stream, but we have no peer connection.');

    addLocalStreamToPeerConnection(gPeerConnection);
    returnToTest('ok-added');
}

/**
 * Removes the local stream from the peer connection. You will have to
 * re-negotiate the call for this to take effect in the call.
 */
function removeLocalStream() {
    if (gPeerConnection == null)
        throw failTest('attempting to remove local stream, but no call is up');

    removeLocalStreamFromPeerConnection(gPeerConnection);
    returnToTest('ok-local-stream-removed');
}

/**
 * (see getReadyState)
 */
function getPeerConnectionReadyState() {
    returnToTest(getReadyState());
}

/**
 * Toggles the remote audio stream's enabled state on the peer connection, given
 * that a call is active. Returns ok-[typeToToggle]-toggled-to-[true/false]
 * on success.
 *
 * @param selectAudioOrVideoTrack: A function that takes a remote stream as
 *     argument and returns a track (e.g. either the video or audio track).
 * @param typeToToggle: Either "audio" or "video" depending on what the selector
 *     function selects.
 */
function toggleRemoteStream(selectAudioOrVideoTrack, typeToToggle) {
    if (gPeerConnection == null)
        throw failTest('Tried to toggle remote stream, ' +
            'but have no peer connection.');
    if (gPeerConnection.remoteStreams.length == 0)
        throw failTest('Tried to toggle remote stream, ' +
            'but not receiving any stream.');

    var track = selectAudioOrVideoTrack(gPeerConnection.remoteStreams[0]);
    toggle_(track, 'remote', typeToToggle);
}

/**
 * See documentation on toggleRemoteStream (this function is the same except
 * we are looking at local streams).
 */
function toggleLocalStream(selectAudioOrVideoTrack, typeToToggle) {
    if (gPeerConnection == null)
        throw failTest('Tried to toggle local stream, ' +
            'but have no peer connection.');
    if (gPeerConnection.localStreams.length == 0)
        throw failTest('Tried to toggle local stream, but there is no local ' +
            'stream in the call.');

    var track = selectAudioOrVideoTrack(gPeerConnection.localStreams[0]);
    toggle_(track, 'local', typeToToggle);
}

/**
 * Hangs up a started call. Returns ok-call-hung-up on success. This tab will
 * not accept any incoming calls after this call.
 */
function hangUp() {
    if (gPeerConnection == null)
        throw failTest('hanging up, but has no peer connection');
    if (getReadyState() != 'active')
        throw failTest('hanging up, but ready state is not active (no call up).');
    sendToPeer(gRemotePeerId, 'BYE');
    closeCall_();
    gAcceptsIncomingCalls = false;
    returnToTest('ok-call-hung-up');
}

/**
 * Start accepting incoming calls again after a hangup.
 */
function acceptIncomingCallsAgain() {
    gAcceptsIncomingCalls = true;
}

/**
 * Do not auto-add the local stream when called.
 */
function doNotAutoAddLocalStreamWhenCalled() {
    gAutoAddLocalToPeerConnectionStreamWhenCalled = false;
}

/**
 * Disconnects from the peerconnection server. Returns ok-disconnected on
 * success.
 */
function disconnect() {
    if (gOurPeerId == null)
        throw failTest('Disconnecting, but we are not connected.');

    request = new XMLHttpRequest();
    request.open('GET', gServerUrl + '/sign_out?peer_id=' + gOurPeerId, false);
    request.send();
    gOurPeerId = null;
    returnToTest('ok-disconnected');
}

/**
 * Creates a DataChannel on the current PeerConnection. Only one DataChannel can
 * be created on each PeerConnection.
 * Returns ok-datachannel-created on success.
 */
function createDataChannelOnPeerConnection(peerConnection,clientId) {
    if (peerConnection == null)
        throw failTest('Tried to create data channel, ' +
            'but have no peer connection.');

    createDataChannel(peerConnection, clientId);
    returnToTest('ok-datachannel-created');
}

/**
 * Close the DataChannel on the current PeerConnection.
 * Returns ok-datachannel-close on success.
 */
function closeDataChannelOnPeerConnection() {
    if (gPeerConnection == null)
        throw failTest('Tried to close data channel, ' +
            'but have no peer connection.');

    closeDataChannel(gPeerConnection);
    returnToTest('ok-datachannel-close');
}

// Public interface to signaling implementations, such as JSEP.

/**
 * Sends a message to a peer through the peerconnection_server.
 */
function sendToPeer(peer, message) {
    var messageToLog = message.sdp ? message.sdp : message;
    debug('Sending message ' + messageToLog + ' to peer ' + peer + '.');

    var request = new XMLHttpRequest();
    var url = gServerUrl + '/message?peer_id=' + gOurPeerId + '&to=' + peer;
    request.open('POST', url, false);
    request.setRequestHeader('Content-Type', 'text/plain');
    request.send(message);
}

/**
 * Returns true if we are disconnected from peerconnection_server.
 */
function isDisconnected() {
    return gOurPeerId == null;
}

/**
 * @return {!string} The current peer connection's ready state, or
 *     'no-peer-connection' if there is no peer connection up.
 */
function getReadyState() {
    if (gPeerConnection == null)
        return 'no-peer-connection';
    else
        return gPeerConnection.readyState;
}

// Internals.

/** @private */
function toggle_(track, localOrRemote, audioOrVideo) {
    if (!track)
        throw failTest('Tried to toggle ' + localOrRemote + ' ' + audioOrVideo +
            ' stream, but has no such stream.');

    track.enabled = !track.enabled;
    returnToTest('ok-' + audioOrVideo + '-toggled-to-' + track.enabled);
}

/** @private */
function connectCallback_(request) {
    debug('Connect callback: ' + request.status + ', ' + request.readyState);
    if (request.status == 0) {
        debug('peerconnection_server doesn\'t seem to be up.');
        returnToTest('failed-to-connect');
    }
    if (request.readyState == 4 && request.status == 200) {
        gOurPeerId = parseOurPeerId_(request.responseText);
        gRemotePeerId = parseRemotePeerIdIfConnected_(request.responseText);
        startHangingGet_(gServerUrl, gOurPeerId);
        returnToTest('ok-connected');
    }
}

/** @private */
function parseOurPeerId_(responseText) {
    // According to peerconnection_server's protocol.
    var peerList = responseText.split('\n');
    return parseInt(peerList[0].split(',')[1]);
}

/** @private */
function parseRemotePeerIdIfConnected_(responseText) {
    var peerList = responseText.split('\n');
    if (peerList.length == 1) {
        // No peers have connected yet - we'll get their id later in a notification.
        return null;
    }
    var remotePeerId = null;
    for (var i = 0; i < peerList.length; i++) {
        if (peerList[i].length == 0)
            continue;

        var parsed = peerList[i].split(',');
        var name = parsed[0];
        var id = parsed[1];

        if (id != gOurPeerId) {
            debug('Found remote peer with name ' + name + ', id ' +
                id + ' when connecting.');

            // There should be at most one remote peer in this test.
            if (remotePeerId != null)
                throw failTest('Expected just one remote peer in this test: ' +
                    'found several.');

            // Found a remote peer.
            remotePeerId = id;
        }
    }
    return remotePeerId;
}

/** @private */
function startHangingGet_(server, ourId) {
    if (isDisconnected())
        return;
    hangingGetRequest = new XMLHttpRequest();
    hangingGetRequest.onreadystatechange = function() {
        hangingGetCallback_(hangingGetRequest, server, ourId);
    }
    hangingGetRequest.ontimeout = function() {
        hangingGetTimeoutCallback_(hangingGetRequest, server, ourId);
    }
    callUrl = server + '/wait?peer_id=' + ourId;
    debug('Sending ' + callUrl);
    hangingGetRequest.open('GET', callUrl, true);
    hangingGetRequest.send();
}

/** @private */
function hangingGetCallback_(hangingGetRequest, server, ourId) {
    if (hangingGetRequest.readyState != 4)
        return;
    if (hangingGetRequest.status == 0) {
        // Code 0 is not possible if the server actually responded.
        throw failTest('Previous request was malformed, or server is unavailable.');
    }
    if (hangingGetRequest.status != 200) {
        throw failTest('Error ' + hangingGetRequest.status + ' from server: ' +
            hangingGetRequest.statusText);
    }
    var targetId = readResponseHeader_(hangingGetRequest, 'Pragma');
    if (targetId == ourId)
        handleServerNotification_(hangingGetRequest.responseText);
    else
        handlePeerMessage_(targetId, hangingGetRequest.responseText);

    hangingGetRequest.abort();
    restartHangingGet_(server, ourId);
}

/** @private */
function hangingGetTimeoutCallback_(hangingGetRequest, server, ourId) {
    debug('Hanging GET times out, re-issuing...');
    hangingGetRequest.abort();
    restartHangingGet_(server, ourId);
}

/** @private */
function handleServerNotification_(message) {
    var parsed = message.split(',');
    if (parseInt(parsed[2]) == 1) {
        // Peer connected - this must be our remote peer, and it must mean we
        // connected before them (except if we happened to connect to the server
        // at precisely the same moment).
        debug('Found remote peer with name ' + parsed[0] + ', id ' +
            parsed[1] + ' when connecting.');
        gRemotePeerId = parseInt(parsed[1]);
    }
}

/** @private */
function closeCall_() {
    if (gPeerConnection == null)
        throw failTest('Closing call, but no call active.');
    gPeerConnection.close();
    gPeerConnection = null;
}

/** @private */
function handlePeerMessage_(peerId, message) {
    debug('Received message from peer ' + peerId + ': ' + message);
    if (peerId != gRemotePeerId) {
        addTestFailure('Received notification from unknown peer ' + peerId +
            ' (only know about ' + gRemotePeerId + '.');
        return;
    }
    if (message.search('BYE') == 0) {
        debug('Received BYE from peer: closing call');
        closeCall_();
        return;
    }
    if (gPeerConnection == null && gAcceptsIncomingCalls) {
        // The other side is calling us.
        debug('We are being called: answer...');

        gPeerConnection = createPeerConnection(STUN_SERVER);
        if (gAutoAddLocalToPeerConnectionStreamWhenCalled &&
            obtainGetUserMediaResult() == 'ok-got-stream') {
            debug('We have a local stream, so hook it up automatically.');
            addLocalStreamToPeerConnection(gPeerConnection);
        }
        answerCall(gPeerConnection, message);
        return;
    }
    handleMessage(gPeerConnection, message);
}

/** @private */
function restartHangingGet_(server, ourId) {
    window.setTimeout(function() {
        startHangingGet_(server, ourId);
    }, 0);
}

/** @private */
function readResponseHeader_(request, key) {
    var value = request.getResponseHeader(key)
    if (value == null || value.length == 0) {
        addTestFailure('Received empty value ' + value +
            ' for response header key ' + key + '.');
        return -1;
    }
    return parseInt(value);
}
