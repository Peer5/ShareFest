(function () {
    peer5.core.dataStructures.BlockMap = Object.subClass({
        name:'peer5.core.dataStructures.BlockMap',

        /** @Public Methods*/
        ctor:function (fileSize) {
            /** @Private members*/
            this.metadata = null;
            this.privateBlockMap = {};
            this.numOfChunksInBlock = peer5.config.BLOCK_SIZE / peer5.config.CHUNK_SIZE;
            this.fileSize = fileSize;
            this.numOfBlocks = Math.ceil(this.fileSize / peer5.config.BLOCK_SIZE);
            this.numOfChunks = Math.ceil(this.fileSize / peer5.config.CHUNK_SIZE);
            this.numOfVerifiedBlocks = 0;
            this.firstMissingBlock = 0;
            this.sizeOfLastBlock = fileSize % peer5.config.BLOCK_SIZE;
            this.availabilityMap = new peer5.core.dataStructures.AvailabilityMap(this.numOfBlocks);
        },

        getSerializedMap:function () {
            return this.availabilityMap.serialize();
        },

        isFull:function () {
            return (this.numOfBlocks == this.numOfVerifiedBlocks);
        },

        has:function (blockId) {
            return (this.privateBlockMap[blockId] && this.privateBlockMap[blockId].verified);
        },

        hasChunk:function (chunkId) {
            var indices = this.calcBlockIdChunkOffset(chunkId);
            if (this.privateBlockMap[indices.block])
                return this.privateBlockMap[indices.block].hasChunk(indices.chunk);
            return false;
        },

        getNumOfBlocks:function () {
            return this.numOfBlocks;
        },

        getNumOfChunks:function() {
            return this.getNumOfChunks;
        },

        getBlock:function (blockId) {
            if (this.privateBlockMap[blockId])
                return this.privateBlockMap[blockId].getBlock();
            else
                return false;
        },

        getBlockChunks:function (blockId) {
            if (this.privateBlockMap[blockId].verified)
                return  this.privateBlockMap[blockId].getBlockChunks(blockId);
            else
                return false;
        },

        getChunkIdsOfBlock:function (blockId) {
            if (blockId >= this.numOfBlocks)
                return [];
            var numOfChunksInThisBlock = (blockId == this.numOfBlocks - 1) ? Math.ceil(this.sizeOfLastBlock / peer5.config.CHUNK_SIZE) : this.numOfChunksInBlock;
            var chunkIds = [];
            var firstChunk = blockId * this.numOfChunksInBlock;
            for (var i = firstChunk; i < firstChunk + numOfChunksInThisBlock; ++i) {
                chunkIds.push(i);
            }
            return chunkIds;
        },

        getBlockIdOfChunk:function(chunkId){
            if(chunkId >= this.numOfChunks)
                return -1;
            var indices = this.calcBlockIdChunkOffset(chunkId);
            return indices.block;
        },

        getChunk:function (chunkId) {
            var indices = this.calcBlockIdChunkOffset(chunkId);
            if (this.privateBlockMap[indices.block])
                return this.privateBlockMap[indices.block].getChunk(indices.chunk);
            else
                return false;
        },

        setChunk:function (chunkId, chunkData) {
            var indices = this.calcBlockIdChunkOffset(chunkId);
            if (!this.privateBlockMap[indices.block]) {
                var blockSize = (indices.block == this.numOfBlocks - 1) ? this.sizeOfLastBlock : (peer5.config.BLOCK_SIZE);
                this.privateBlockMap[indices.block] = new peer5.core.Block(blockSize);
            }
            this.privateBlockMap[indices.block].setChunk(indices.chunk, chunkData);
            this.verifyBlock(indices.block);
            return indices.block;
        },

        isEmpty:function (blockId) {
            return (!this.privateBlockMap[blockId]);
        },

        getBlockIndex:function(index) {
            return Math.ceil(index/peer5.config.BLOCK_SIZE);
        },

        getBlockIds:function () {
            return Object.keys(this.privateBlockMap);
        },

        getFirstMissingBlock:function() {
            return this.firstMissingBlock;
        },

        getConsecutiveBuffer:function(startBlock) {
            var firstMissingBlock = startBlock;
            while (this.has(firstMissingBlock)) {
                firstMissingBlock++;
            }

            var numOfBlocks = (firstMissingBlock - startBlock);
            var array = new Uint8Array(peer5.config.BLOCK_SIZE*numOfBlocks);
            for (var i = 0; i < numOfBlocks; ++i) {
                array.set(this.getBlock(i), i * peer5.config.BLOCK_SIZE);
            }
            return array;
        },

        verifyBlock:function (blockId) {
            if (this.privateBlockMap[blockId]) {
                if(this.privateBlockMap[blockId].verifyBlock() == 1){
                    this.numOfVerifiedBlocks++;
                    //find the first missing block again
                    while (this.has(this.firstMissingBlock)) {
                        this.firstMissingBlock++;
                    }
                    if(this.metadata) //ToDo: broadcast only the metadata
                        radio('blockReceivedEvent').broadcast(blockId,this,this.metadata);
                    if(this.isFull()) radio('transferFinishedEvent').broadcast(this); //only call when a new block is completed
                }
                if (this.privateBlockMap[blockId].verified) {
                    this.availabilityMap.set(blockId);
                    return true;
                }
            }
            return false;
        },

        addMetadata:function(metadata){
            this.metadata = metadata;
        },

        getMetadata:function(){
            return this.metadata;
        },

        /** @private functions*/
        calcBlockIdChunkOffset:function (chunkId) {
            var blockId = Math.floor(chunkId / this.numOfChunksInBlock);
            var chunkOffset = chunkId % this.numOfChunksInBlock;
            return {block:blockId, chunk:chunkOffset};
        }
    })
})();
