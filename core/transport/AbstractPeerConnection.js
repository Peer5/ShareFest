(function () {
    peer5.core.transport.AbstractPeerConnection = Object.subClass({
        name:'peer5.core.transport.AbstractPeerConnection',

        ctor:function (originId, targetId, initiator) {
            /** @private properties */
            this.peerConnection;
            this.dataChannel;
            this.label = initiator ? (originId + targetId) : (targetId + originId);
            this.originId = originId;
            this.targetId = targetId;
            this.createAnswerConstraints = {};
            this.createOfferConstraints = {};
            this.startTime;
            /** @public properties*/
            this.ready = false;
            this.requestDropped = 0;
            this.numOfRequestedChunks = 0;
            this.numOfExpiredChunks = 0;
            this.numOfPendingChunks = 0;
            this.maxNumOfPendingChunks = peer5.config.MAX_PENDING_CHUNKS / 2;
            this.minLatencyForChunk = null;
            this.maxLatencyForChunk = null;
            this.avgLatencyForChunk = null;
            this.connectingDuration = null;
            this.numOfChunksArrived = 0;
            this.failure = false;
        },

        /** @public methods*/
        setupCall:function () {
            throw 'unimplemented method';
        },
        handleMessage:function (message){
            throw 'unimplemented method';
        },
        send:function (binaryMessage){
            throw 'unimplemented method';
        }
    })
})();

