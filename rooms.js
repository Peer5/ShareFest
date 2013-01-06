var util = require('./util.js');
// an in memory placeholder for the rooms
var rooms = {};

function Room(id) {
    this.id = id;
    this.count = 0;
    this.peers = {};
}

Room.prototype = {
    getRandomK: function(k) {
        return util.getRandomK(Object.keys(this.peers),k);
    },

    addPeer: function(id) {
        this.count++;
        this.peers[id] = "placeholder";
    },

    removePeer:function(id) {
        delete this.peers[id];
        this.count--;
    }
};

function getRoom(id)
{
    if (id in rooms) {
        console.log('existing room ' + id);
        rooms[id].count++;

    } else {
        var room = new Room(id);
        rooms[id] = room;
    }
    return rooms[id];
}

exports.getRoom = getRoom;
