var oldSessions = {};
var newSessions = {};
var started = false;
exports.monitor = function (interval) {
    if (!started) {
        started = true;
    } else {
        peer5.warn("sessionManager.monitor already called");
    }

    function expire() {
        peer5.debug('sessionManager is expiring ' + Object.keys(oldSessions).length + '/' +  (Object.keys(oldSessions).length + Object.keys(newSessions).length));
        Object.keys(oldSessions).forEach(function (k) {
            oldSessions[k](k); // spawn the function if session expired
        });
        oldSessions = newSessions;
        newSessions = {};
    }

    setInterval(expire, interval);
}

/**
 * notify the manager that a client is still connected
 * @param id
 */
exports.notify = function (id, expire_function) {
    peer5.debug(id + ' notified to sessionManager');
    if (!(id in newSessions)) { // otherwise already safe
        delete oldSessions[id];
        newSessions[id] = expire_function; // we can put timestamp here...
    }
}