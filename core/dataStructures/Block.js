(function(){
    peer5.core.Block = Object.subClass({
        name:'peer5.core.Block',

        /** @Public Methods*/
        ctor:function(blockSize,buffer,verified){
            /** @private members*/
            this.blockSize = blockSize; //numOfBytes
            this.length = Math.ceil(this.blockSize/peer5.config.CHUNK_SIZE); //numOfChunks
            this.buffer = buffer?buffer:null;
            this.verified = verified?verified:false;
            this.hash = null; //optional
            this.chunkMap = [];

            for(var i=0;i<this.length;++i)
                this.chunkMap[i] = this.verified;
        },

        getBlock:function(blockId){
            if(this.verified && this.buffer){
                return this.buffer
            }else
                return false
        },

        setBlock:function(data){
            if(this.verified && data.length == this.blockSize){
                this.buffer = data;
            }
        },

//        getBlockChunks:function(blockId){
//            if(this.verified){
//                var bufferDict = {};
//                for(var i=0;i<this.length;++i){
//                    bufferDict[blockId*peer5.config.BLOCK_SIZE/peer5.config.CHUNK_SIZE+i] = this.getChunk(i);
//                }
//                return bufferDict;
//            }
//        },

        getChunk:function(chunkOffset){
            if(this.verified){
                    if(this.buffer){
                        var startOffset = chunkOffset*peer5.config.CHUNK_SIZE; //inclusive
                        var endOffset = (1+chunkOffset)*peer5.config.CHUNK_SIZE; //exclusive
                        return this.buffer.subarray(startOffset,endOffset);
                    }else return true;
            }else
                return false;
        },

        hasChunk:function(chunkOffset){
            return this.chunkMap[chunkOffset];
        },

        setChunk:function(chunkOffset,chunkData){
            if(!this.buffer){
                this.buffer = new Uint8Array(this.blockSize);
                this.chunkMap = [];
            }
            var chunkDataViewer = new Uint8Array(chunkData);
            var byteOffset = chunkOffset*peer5.config.CHUNK_SIZE;
            this.buffer.set(chunkDataViewer,byteOffset);
            this.chunkMap[chunkOffset] = true;
        },

        setChunkOn:function(chunkOffset){
            if(!this.chunkMap)
                this.chunkMap = [];
            this.chunkMap[chunkOffset] = true;
        },

        getNumOfChunks:function(){
            return this.length;
        },

        removeBlockData:function(){
            delete this.buffer;
        },


        //returns number of new verified blocks
        verifyBlock:function(extData){
            if(this.verified)
                return 0;
            for(var i=0;i<this.length;++i){
                if(!this.chunkMap[i]){
                    return 0;
                }
            }

            //TODO: add hash function
            //TODO: if extData, use hash function on it
//            if (this.hash == null)
            this.verified = true;
            return 1;
        }
    })
})();
