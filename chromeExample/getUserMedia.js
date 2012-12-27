/**
 * Created with JetBrains WebStorm.
 * User: Shachar
 * Date: 27/12/12
 * Time: 10:46
 * To change this template use File | Settings | File Templates.
 */
/**
 * Copyright (c) 2012 The Chromium Authors. All rights reserved.
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

/**
 * See http://dev.w3.org/2011/webrtc/editor/getusermedia.html for more
 * information on getUserMedia.
 */

/**
 * Keeps track of our local stream (e.g. what our local webcam is streaming).
 * @private
 */
var gLocalStream = null;

/**
 * The MediaConstraints to use when connecting the local stream with a peer
 * connection.
 * @private
 */
var gAddStreamConstraints = {};

/**
 * String which keeps track of what happened when we requested user media.
 * @private
 */
var gRequestWebcamAndMicrophoneResult = 'not-called-yet';

/**
 * This function asks permission to use the webcam and mic from the browser. It
 * will return ok-requested to PyAuto. This does not mean the request was
 * approved though. The test will then have to click past the dialog that
 * appears in Chrome, which will run either the OK or failed callback as a
 * a result. To see which callback was called, use obtainGetUserMediaResult().
 *
 * @param{string} constraints Defines what to be requested, with mandatory
 *     and optional constraints defined. The contents of this parameter depends
 *     on the WebRTC version. This should be JavaScript code that we eval().
 */
function getUserMedia(constraints) {
    if (!navigator.webkitGetUserMedia) {
        returnToTest('Browser does not support WebRTC.');
        return;
    }
    try {
        var evaluatedConstraints;
        eval('evaluatedConstraints = ' + constraints);
    } catch (exception) {
        throw failTest('Not valid JavaScript expression: ' + constraints);
    }
    debug('Requesting getUserMedia: constraints: ' + constraints);
    navigator.webkitGetUserMedia(evaluatedConstraints,
        getUserMediaOkCallback_,
        getUserMediaFailedCallback_);
    returnToTest('ok-requested');
}

/**
 * Must be called after calling getUserMedia. Returns not-called-yet if we have
 * not yet been called back by WebRTC. Otherwise it returns either ok-got-stream
 * or failed-with-error-x (where x is the error code from the error callback)
 * depending on which callback got called by WebRTC.
 */
function obtainGetUserMediaResult() {
    returnToTest(gRequestWebcamAndMicrophoneResult);
    return gRequestWebcamAndMicrophoneResult;
}

/**
 * Stops the local stream.
 */
function stopLocalStream() {
    if (gLocalStream == null)
        throw failTest('Tried to stop local stream, ' +
            'but media access is not granted.');

    gLocalStream.stop();
    returnToTest('ok-stopped');
}

// Functions callable from other JavaScript modules.

/**
 * Adds the current local media stream to a peer connection.
 * @param{RTCPeerConnection} peerConnection
 */
function addLocalStreamToPeerConnection(peerConnection) {
    if (gLocalStream == null)
        throw failTest('Tried to add local stream to peer connection, ' +
            'but there is no stream yet.');
    try {
        peerConnection.addStream(gLocalStream, gAddStreamConstraints);
    } catch (exception) {
        throw failTest('Failed to add stream with constraints ' +
            gAddStreamConstraints + ': ' + exception);
    }
    debug('Added local stream.');
}

/**
 * Removes the local stream from the peer connection.
 * @param{RTCPeerConnection} peerConnection
 */
function removeLocalStreamFromPeerConnection(peerConnection) {
    if (gLocalStream == null)
        throw failTest('Tried to remove local stream from peer connection, ' +
            'but there is no stream yet.');
    try {
        peerConnection.removeStream(gLocalStream);
    } catch (exception) {
        throw failTest('Could not remove stream: ' + exception);
    }
    debug('Removed local stream.');
}

// Internals.

/**
 * @private
 * @param {MediaStream} stream Media stream.
 */
function getUserMediaOkCallback_(stream) {
    gLocalStream = stream;
    var videoTag = $('local-view');
    videoTag.src = webkitURL.createObjectURL(stream);

    // Due to crbug.com/110938 the size is 0 when onloadedmetadata fires.
    // videoTag.onloadedmetadata = updateVideoTagSize_('local-view');
    // Use setTimeout as a workaround for now.
    setTimeout(function() {updateVideoTagSize_('local-view')}, 500);
    gRequestWebcamAndMicrophoneResult = 'ok-got-stream';
}

/**
 * @private
 * @param {string} videoTagId The ID of the video tag to update.
 */
function updateVideoTagSize_(videoTagId) {
    var videoTag = $(videoTagId);
    // Don't update if sizes are 0 (happens for Chrome M23).
    if (videoTag.videoWidth > 0 && videoTag.videoHeight > 0) {
        debug('Set video tag "' + videoTagId + '" width and height to ' +
            videoTag.videoWidth + 'x' + videoTag.videoHeight);
        videoTag.width = videoTag.videoWidth;
        videoTag.height = videoTag.videoHeight;
    }
}

/**
 * @private
 * @param {NavigatorUserMediaError} error Error containing details.
 */
function getUserMediaFailedCallback_(error) {
    debug('GetUserMedia FAILED: Maybe the camera is in use by another process?');
    gRequestWebcamAndMicrophoneResult = 'failed-with-error-' + error.code;
}

$ = function(id) {
    return document.getElementById(id);
};

