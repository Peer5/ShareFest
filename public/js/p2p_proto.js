(function () {
    var ORIGINID_TAG = 0; //string
    var DESTID_TAG = 1;
    var SWARMID_TAG = 2; // string
    var CHUNKID_TAG = 3; // uint32
    var DATA_TAG = 4; // UInt8array
    var SDP_TAG = 5; // UInt8array
    var NEED_CHUNK = 6; // uint32

    function cmd(op,originId, destId, swarmId, chunkId,data) {
        this.op = op;
        this.originId = originId;
        this.destId = destId;
        this.swarmId = swarmId;
        this.chunkId = chunkId;
        this.data = data;
    }

    var encode = function(cmdObj) {
        return btoa(JSON.stringify(cmdObj));
    }

    proto64 = {};

    proto64.need = function (originId, destId, swarmId, chunkId) {
        cmdObj = new cmd(NEED_CHUNK, originId, destId, swarmId, chunkId, null);
        return encode(cmdObj);
    }

    proto64.send = function (originId, destId, swarmId, chunkId, data) {
        cmdObj = new cmd(DATA_TAG, originId, destId, swarmId, chunkId, data);
        return encode(cmdObj);
    }

    proto64.decode = function(encoded) {
        return JSON.parse(atob(encoded));
    }

})();

