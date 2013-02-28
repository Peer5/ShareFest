var rooms = require('./rooms.js');
const MAX_PEERS_MATCH = 1;

/**
 * gets a new peer and return a list of peers to be connected with this peer
 * @param swarmId
 * @param peerId
 */
exports.join = function (swarmId, peerId) {
    var room = rooms.getRoom(swarmId);
    if (!room) return;
    var peers = room.getRandomK(MAX_PEERS_MATCH);
    room.addPeer(peerId);
    return {peers:peers, size: room.getCount(), metadata:room.getMetadata()};
}

exports.addRoom = function (firstPeerId, swarmId, metadata) {
    rooms.addRoom(swarmId, metadata).addPeer(firstPeerId);
}


exports.leave = function (swarmId, peerId) {
    var room = rooms.getRoom(swarmId);
    if (room) {
        room.removePeer(peerId);
    }
    return room.getCount();
}