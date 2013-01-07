var util = require('./util.js');
// an in memory placeholder for the rooms
var rooms = {};

function Room(id, metadata) {
    this.id = id;
    this.count = 0;
    this.peers = {};
    this.metadata = metadata;
}

Room.prototype = {
    getMetadata:function () {
        return this.metadata;
    },

    getRandomK:function (k) {
        return util.getRandomK(Object.keys(this.peers), k);
    },

    addPeer:function (id) {
        if (id) {
            this.count++;
            this.peers[id] = "placeholder";
        }
    },

    removePeer:function (id) {
        delete this.peers[id];
        this.count--;
    }
};

exports.getRoom = function getRoom(id) {
    return rooms[id];
}

exports.addRoom = function (id, metadata) {
    return rooms[id] = new Room(id, metadata);
}
