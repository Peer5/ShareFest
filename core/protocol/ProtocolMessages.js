
(function (exports) {

    exports.P2P_DATA = 0x11;
    exports.P2P_REQUEST = 0x12;
    exports.P2P_CANCEL = 0x13;
    exports.P2P_HAVE = 0x14;

    exports.REPORT = 0x21;
    exports.FILE_INFO = 0x22;
    exports.MATCH = 0x23;
    exports.JOIN = 0x24;
    exports.SWARM_HEALTH = 0x29;
    exports.SWARM_ERROR = 0x30;
    exports.SDP = 0x31;
    exports.COMPLETED_DOWNLOAD = 0x32;

//    attributes (ordered)
//    swarmId - 4bytes - only the intial 4 bytes will be encoded. We have a slight chance for collision, but even if there is, the pollution detection will prevent serious problems.
//        chunkId - 4bytes (UInt32) means that we have a limitation of 2^32 chunks per swarm -> ~4TB for each file.
//        payload data - chunk
//    length: chunk size + swarmId length under 1200 bytes constraint
//    constraints:
//        peer will send only hash varified chunks
    function Data(swarmId, chunkId, payload) {
        this.tag = exports.P2P_DATA;
        this.swarmId = swarmId;
        this.chunkId = chunkId;
        this.payload = payload;
    }

//    swarmId (4bytes)
//    chunkIds - optional - array of ids each 4bytes
//    Example of 2 chunks encoding: 0x010203040A0B0C0D. 0x01-0x04 are the first encoded chunk, 0x0A-0x0D are the second encoded chunk)
    function Request(swarmId, chunkIds) {
        this.tag = exports.P2P_REQUEST
        this.swarmId = swarmId;
        if (!chunkIds) chunkIds = [];
        this.chunkIds = chunkIds;
    }

//Cancel (0x13)
//attributes (ordered)
//swarmId (4 bytes)
//chunkIds/all (optional) if empty (not included) then all chunks are to be canceled. If included, chunks are encoded in 4bytes-per-chunk - for example  0x010203040A0B0C0D
    function Cancel(swarmId, chunkIds) {
        this.tag = exports.P2P_CANCEL;
        this.swarmId = swarmId;
        if (!chunkIds)
            chunkIds = [];
        this.all = (chunkIds.length == 0)
        this.chunkIds = chunkIds;
    }

    /**
     *
     * @param swarmId
     * @param seeder true if seeder
     * @param complete true if availabilityMap, false if update
     * @param blockIds in list of chunks, or availabilityMap
     * @constructor
     */
    function Have(swarmId, seeder, availabilityMap, blockIds) {
        this.tag = exports.P2P_HAVE;
        this.swarmId = swarmId;
        this.seeder = seeder;
        this.blockIds = [];
        if (!seeder) {
            if (availabilityMap) {
                this.complete = true
                this.availabilityMap = availabilityMap;
            }
            else {
                this.complete = false
                this.blockIds = blockIds;
            }
        }
    }

//    swarmId full (20bytes)
//    last requested blockId (not random) (uint)
//    transport statistics (for P2P total, HTTP)
//    total bytes dl/up
//    dl/up speed (max,min,avg)
//    rejected connections (NAT problems, etc.)
//    num of connections (byte)
//    connections (special parsing)
//    info gathered on those connections?
//#bytes recv, sent, dl/up speed (max,min,avg)
//    chunk drop % (expiration)
//#blocks failed hash verification
//    latency MS (best so far)
//    browser - user agent
//    vendor (byte)
//    major (byte)
//        ?minor (byte)
//        availability block map (variable length)
    function Report(swarmId, last_requested_block_id, total_bytes_up_P2P, total_bytes_down_P2P, total_bytes_down_HTTP,total_waste_P2P,total_waste_HTTP, speed_up, speed_down, connections, ua, availabilityMap,numOfBlocksHave,fileSize,completedDownload) {
        this.tag = exports.REPORT;
        this.swarmId = swarmId;
        this.lastRequestedBlockId = last_requested_block_id;
        this.totalBytesUpP2P = total_bytes_up_P2P;
        this.totalBytesDownP2P = total_bytes_down_P2P;
        this.totalBytesDownHTTP = total_bytes_down_HTTP;
        this.totalWasteP2P = total_waste_P2P;
        this.totalWasteHTTP = total_waste_HTTP;
        this.speedUp = speed_up;
        this.speedDown = speed_down
        this.connections = connections;
        this.ua = ua;
        this.availabilityMap = availabilityMap;
        this.numOfBlocksHave = numOfBlocksHave;
        this.fileSize = fileSize;
        this.completedDownload = completedDownload;
    }

    function Join(swarmId) {
        this.tag = exports.JOIN;
        this.swarmId = swarmId;
    }

    /**
     * Represents metadata needed to manage the swarm
     * @param swarmId uniqueId or null if needs to create new
     * @param size the size of the swarm in bytes
     * @param hashes list of digests for each block
     * @param blockSize size of a single block in bytes
     * @param origin optional identification of the swarm creator (i.e. customerId, name of uploader, company)
     * @constructor
     */
    function FileInfo(swarmId, size, hashes, blockSize, origin, name, lastModified, type) {
        this.tag = exports.FILE_INFO;
        this.swarmId = swarmId;
        this.size = size;
        this.hashes = hashes;
        this.blockSize = blockSize;
        this.origin = origin;
        this.name = name;
        this.lastModified = lastModified;
        this.type = type;
    }

    exports.SWARM_NOT_FOUND = 0;
    exports.SWARM_ONLY_FIREFOX = 11;
    exports.SWARM_ONLY_CHROME = 12;

    function SwarmError(swarmId,error) {
        this.tag = exports.SWARM_ERROR;
        this.error = error;
    }

    function Match(swarmId,peerId,availabilityMap){
        this.tag = exports.MATCH; //protocol tag
        this.swarmId = swarmId; //the swarm that consists the two peers
        this.peerId = peerId; //the matched peerid
        this.availabilityMap = availabilityMap; //bitarray consisting available blocks
    }

    function Connection(totalBytesDown, totalBytesUp, speedDown, speedUp, chunksExpired, chunksRequested, latency, connected, connectingDuration, failure) {
        this.totalBytesDown = totalBytesDown; //        total bytes dl
        this.totalBytesUp = totalBytesUp; //        total bytes up
        this.speedDown = speedDown; //        dl speed kbs max, min, avg
        this.speedUp = speedUp;//        up speed kbs max, min, avg
        this.chunksRequested = chunksRequested;
        this.chunksExpired = chunksExpired; // number of chunks expired (loss)
        this.latency = latency; // best latency
        this.connected = connected; //is the connection connected/not connected
        this.connectingDuration = connectingDuration;
        this.failure = failure; //was there a problem
    }

    function Sdp(originId,destId,sdpMessage,port,type){
        this.tag = exports.SDP;
        this.originId = originId;
        this.destId = destId;
        this.sdpMessage = sdpMessage;
        //deprecated: just to support Firefox 21-
        this.port = port;
        this.type = type;
    }

    function SwarmHealth(swarmId , numOfSeedersInSwarm , NumOfPeersInSwarm, totalCompletedDownloads){
        this.tag = exports.SWARM_HEALTH;
        this.swarmId = swarmId;
        this.numOfSeedersInSwarm = numOfSeedersInSwarm;
        this.NumOfPeersInSwarm = NumOfPeersInSwarm;
        this.totalCompletedDownloads = totalCompletedDownloads;

    }

    exports.Have = Have;
    exports.Cancel = Cancel;
    exports.Request = Request;
    exports.Data = Data;
    exports.Report = Report;
    exports.Connection = Connection;
    exports.FileInfo = FileInfo;
    exports.Match = Match;
    exports.Join = Join;
    exports.Sdp = Sdp;
    exports.SwarmHealth = SwarmHealth;
    exports.SwarmError = SwarmError;
})
(typeof exports === 'undefined' ? peer5.core.protocol : exports);