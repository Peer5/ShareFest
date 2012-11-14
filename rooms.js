// an in memory placeholder for the rooms
var rooms = {};
var DICTIONARY = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789".split('');

function getRoom(id) {
    if (id in rooms) {
        console.log('existing room ' + id);
        rooms[id].count++;
    } else {
        rooms[id] = {id:id, count:1}; // TODO: create a room class
    }
    return rooms[id];
}

exports.getRoom = getRoom;