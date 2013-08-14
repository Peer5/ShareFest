var util = require('./util.js');
// an in memory placeholder for the rooms
var swarms = {};

function Swarm(id, metadata) {
    this.id = id;
    this.count = 0;
    this.peers = {};
    this.metadata = metadata;
}

Swarm.prototype = {
    getCount:function() {
        return this.count;
    },

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

exports.getSwarm = function getSwarm(id) {
    return swarms [id];
}

exports.addSwarm = function (id, metadata) {
    return swarms[id] = new Swarm(id, metadata);
}

exports.removePeer = function(id) {
    for (var swarmId in swarms) {
        var swarm = swarms[swarmId];
        swarm.removePeer(id);
    }
}
