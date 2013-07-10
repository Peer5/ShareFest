//require lang_ext for inheritance
require('../util/lang_ext.js');
(function (exports) {
    exports.ITracker = Object.subClass({
        name:'peer5.core.tracker.ITracker',
        createSwarm:function(peerId, fileInfo, sender) {
            throw 'unimplemented method';
        },

        join:function(peerId, swarmId, originBrowser, sender) {
            throw 'unimplemented method';
        },

        leave:function(peerId, sender) {
            throw 'unimplemented method';
        },

        report:function(peerId, swarmId, report, sender) {
            throw 'unimplemented method';
        },

        validateToken:function(token,domain){
            throw 'unimplemented method';
        }


    })
})(typeof exports === 'undefined' ? peer5.core.tracker : exports);