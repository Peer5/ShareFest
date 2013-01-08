(function () {

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

    proto64.ORIGINID_TAG = 0; //string
    proto64.DESTID_TAG = 1;
    proto64.SWARMID_TAG = 2; // string
    proto64.CHUNKID_TAG = 3; // uint32
    proto64.DATA_TAG = 4; // UInt8array
    proto64.SDP_TAG = 5; // UInt8array
    proto64.NEED_CHUNK = 6; // uint32


    proto64.need = function (originId, destId, swarmId, chunkId) {
        cmdObj = new cmd(this.NEED_CHUNK, originId, destId, swarmId, chunkId, null);
        return encode(cmdObj);
    }

    proto64.send = function (originId, destId, swarmId, chunkId, data) {
        cmdObj = new cmd(this.DATA_TAG, originId, destId, swarmId, chunkId, data);
        return encode(cmdObj);
    }

    proto64.decode = function(encoded) {
        return JSON.parse(atob(encoded));
    }

})();

