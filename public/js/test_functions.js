/**
 * Copyright (c) 2012 The Chromium Authors. All rights reserved.
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

/**
 * This list keeps track of failures in the test. This is necessary to keep
 * track of failures that happen outside of PyAuto test calls and need to be
 * reported asynchronously.
 * @private
 */
var gFailures = [];

/**
 * The callback to send test messages to. By default we will assume that we
 * are being run by a PyAuto test case, but this can be overridden.
 * @private
 */
var gReturnCallback = sendToPyAuto;

/**
 * The callback to send debug messages to. By default we assume console.log.
 * @private
 */
var gDebugCallback = consoleLog_;

/**
 * Returns the list of errors and clears the list.
 *
 * @return {string} Returns either the string ok-no-errors or a text message
 *     which describes the failure(s) which have been registered through calls
 *     to addTestFailure in this source file.
 */
function getAnyTestFailures() {
    if (gFailures.length == 1)
        returnToTest('Test failure: ' + gFailures[0]);
    else if (gFailures.length > 1)
        returnToTest('Multiple failures: ' + gFailures.join(' AND '));
    else
        returnToTest('ok-no-errors');
    gFailures = [];
}

/**
 * Replaces the test message callback. Test messages are messages sent by the
 * returnToTest function.
 *
 * @param callback A function that takes a single string (the message).
 */
function replaceReturnCallback(callback) {
    gReturnCallback = callback;
}

/**
 * Replaces the debug message callback. Debug messages are messages sent by the
 * debug function.
 *
 * @param callback A function that takes a single string (the message).
 */
function replaceDebugCallback(callback) {
    gDebugCallback = callback;
}

// Helper / error handling functions.

/**
 * Prints a debug message on the webpage itself.
 */
function debug(txt) {
    if (gOurClientName == null)
        prefix = '';
    else
        prefix = gOurClientName + ' says: ';

    gDebugCallback(prefix + txt);
}

/**
 * Sends a value back to the test.
 *
 * @param {string} message The message to return.
 */
function returnToTest(message) {
    gReturnCallback(message);
}

/**
 * Sends a message to the PyAuto test case. Requires that this javascript was
 * loaded by PyAuto. This will make the test proceed if it is blocked in a
 * ExecuteJavascript call.
 *
 * @param {string} message The message to send.
 */
function sendToPyAuto(message) {
    debug('Returning ' + message + ' to PyAuto.');
    window.domAutomationController.send(message);
}

/**
 * Adds a test failure without affecting the control flow. If the test is
 * blocked, this function will immediately break that call with an error
 * message. Otherwise, the error is saved and it is up to the test to check it
 * with getAnyTestFailures.
 *
 * @param {string} reason The reason why the test failed.
 */
function addTestFailure(reason) {
    returnToTest('Test failure: ' + reason)
    gFailures.push(reason);
}

/**
 * Follows the same contract as addTestFailure. This is a convenience function
 * that should be invoked like this since you probably want to break the flow of
 * the test on failure and yet point to the right line in a JavaScript debugger:
 *
 * throw failTest('my reason');
 *
 * @return {!Error}
 */
function failTest(reason) {
    addTestFailure(reason);
    return new Error(reason);
}

/** @private */
function consoleLog_(message) {
    // It is not legal to treat console.log as a first-class object, so wrap it.
    console.log(message);
}
/**
 * Created with JetBrains WebStorm.
 * User: Shachar
 * Date: 27/12/12
 * Time: 10:47
 * To change this template use File | Settings | File Templates.
 */
