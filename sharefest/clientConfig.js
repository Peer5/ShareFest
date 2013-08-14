peer5.config = {
    MAX_PENDING_CHUNKS:200, //max number of chunks pending per peer
    MOZ_MAX_PENDING_CHUNKS:8, //max number of chunks pending per peer for mozilla
    CHUNK_SIZE:800,
    CHUNK_EXPIRATION_TIMEOUT:1500,
    REPORT_INTERVAL:10000,
    STUN_SERVERS:['stun.l.google.com:19302'],
    TURN_SERVERS:[],
    TURN_CREDENTIALS:[],
    P2P_PREFETCH_THRESHOLD:100,
    PC_FAIL_TIMEOUT:15000,
    SOCKET_RECONNECTION_INTERVAL:2000
};
