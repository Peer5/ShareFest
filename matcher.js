var rooms = require('./rooms.js');
const MAX_PEERS_MATCH = 5;

/**
 * gets a new peer and return a list of peers to be connected with this peer
 * @param swarmId
 * @param peerId
 */
exports.join = function(swarmId, peerId) {
    var room = rooms.getRoom(swarmId);
    var peers = room.getRandomK(MAX_PEERS_MATCH);
    room.addPeer(peerId);
    return peers;
}

exports.leave = function(swarmId, peerId) {
    var room = rooms.getRoom(swarmId);
    room.removePeer(peerId);
}