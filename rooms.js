// an in memory placeholder for the rooms
var rooms = {};


function Room(id) {
    this.id = id;
    this.count = 0;
    peers = {};
}

Room.prototype = {
    addPeer: function(id) {
        count++;
        peers[id] = "placeholder";
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