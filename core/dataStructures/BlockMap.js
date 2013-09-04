(function () {
    peer5.core.dataStructures.BlockMap = Object.subClass({
        name:'peer5.core.dataStructures.BlockMap',

        /** @Public Methods*/
        ctor:function (fileSize,resourceId) {
            /** @Private members*/
            this.resourceId = resourceId;
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
            this.fs = false;
            this._registerEvents();
            if(peer5.config.USE_FS){
                this.lruMap = new peer5.core.dataStructures.LRU(Math.floor(peer5.config.CACHE_SIZE/peer5.config.BLOCK_SIZE)
                    ,this._lruRemoveCb);
                this._initiateFileSystem();
            }

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

        //TODO: change to work with filesystem (asynch)
        getBlock:function (blockId) {
            if (this.privateBlockMap[blockId])
                return this.privateBlockMap[blockId].getBlock();
            else
                return false;
        },

//        getBlockChunks:function (blockId) {
//            if (this.privateBlockMap[blockId].verified)
//                return  this.privateBlockMap[blockId].getBlockChunks(blockId);
//            else
//                return false;
//        },

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

        //cb(data)
        getChunk:function (chunkId,cb) {
            var thi$ = this;
            var indices = this.calcBlockIdChunkOffset(chunkId);
            if (this.privateBlockMap[indices.block]){
                var retval = this.privateBlockMap[indices.block].getChunk(indices.chunk);
                if(peer5.config.USE_FS){
                    if(!retval) return false; //not verified
                    if(retval == true){
                        //read from fs
                        var blockOffset = indices.block*peer5.config.BLOCK_SIZE;
                        peer5.core.data.FSio.read(this.resourceId,blockOffset,blockOffset+peer5.config.BLOCK_SIZE
                            ,function(succ,data){
                                if(succ){
                                    var block = thi$.privateBlockMap[indices.block];
                                    block.setBlock(data);
                                    thi$.lruMap.set(indices.block,block);
                                    thi$.getChunk(chunkId,cb);
                                }
                            });
                    }else{ //data in cache
                        this.lruMap.get(indices.block); //updating the lruMap
                        cb(true,retval); //maintaining the same asynch interface
                    }
                }else{
                    return retval;
                }

            }
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

        getRandomMissingBlock:function() {
            for (var i=0;i<1000;i++) { //1000 tries to find a missing block
                var size = this.numOfBlocks - this.firstMissingBlock;
                var guess = this.firstMissingBlock + Math.floor(Math.random() * size);
                if (!(guess in this.privateBlockMap)) {
                    return guess; //found an empty space!
                }
            }

            return this.firstMissingBlock; //last resort
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
                    //writing to Filesystem:
                    var thi$ = this;
                    if (peer5.config.USE_FS && this.fs) {
                        peer5.core.data.FSio.write(thi$.resourceId,new Blob([thi$.getBlock(blockId)]),blockId*peer5.config.BLOCK_SIZE,function(succ){
                            if(succ){
                                //adding the block to the lruMap
                                thi$.lruMap.set(blockId,thi$.privateBlockMap[blockId]);
                                peer5.debug("successfully wrote block " + blockId + " to filesystem ");
                            }else{
                                peer5.warn("couldn't write block " + blockId + " to filesystem");
                            }
                        });
                    }
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

        initiateFromLocalData:function(cb,blockId,endBlockId){
            var thi$ = this;
            if(!endBlockId && endBlockId != 0) {
                peer5.core.data.FSio.getResourceDetails(this.resourceId,function(succ,details){
                   var endBlockId = Math.floor(details.size/peer5.config.BLOCK_SIZE);
                   thi$.initiateFromLocalData(cb,blockId,endBlockId);
                });
            }else{
                peer5.core.data.FSio.read(thi$.resourceId,blockId*peer5.config.BLOCK_SIZE,(blockId+1)*peer5.config.BLOCK_SIZE,function(succ,data){
                    if(succ){ //the block is read now we need to verify it against corruptions
                        if(thi$.initiateBlockFromLocalData(blockId,data)){
                            peer5.log("successfully initiated block " + blockId + " from filesystem " + Date.now());
                        }else{
                            peer5.log("couldnt verify block " + blockId + " from filesystem " + Date.now());
                        }
                        if(blockId < endBlockId)
                        {
                            blockId++
                            thi$.initiateFromLocalData(cb,blockId,endBlockId);
                        }else{
                            peer5.info("finished initiating from filesystem");
                            cb(true);
                        }
                    }else{
                        peer5.warn("couldn't initiate block " + blockId + " from filesystem");
                    }
                });
            }

        },

        initiateBlockFromLocalData:function(blockId,data){
            var blockSize = (blockId == this.numOfBlocks - 1) ? this.sizeOfLastBlock : (peer5.config.BLOCK_SIZE);
            this.privateBlockMap[blockId] = new peer5.core.Block(blockSize);
            for(var i=0; i<Math.ceil(data.length/peer5.config.CHUNK_SIZE);++i)
                this.privateBlockMap[blockId].setChunkOn(i);
            if(this.privateBlockMap[blockId].verifyBlock(data)){
                this.numOfVerifiedBlocks++;
                //find the first missing block again
                while (this.has(this.firstMissingBlock)) {
                    this.firstMissingBlock++;
                }
                for(var i=0; i<Math.ceil(data.length/peer5.config.CHUNK_SIZE);++i)
                    radio('peer5_received_fs_chunk').broadcast(blockId*this.numOfChunksInBlock+i,this.resourceId);
                if(this.isFull()) radio('transferFinishedEvent').broadcast(this); //only call when a new block is completed
                this.availabilityMap.set(blockId);
                return true;
            }else{
                delete this.privateBlockMap[blockId];
                return false;
            }
        },

        saveLocally:function(){
            //if we have file system api we should save the file using it instead of saving it again on the memory
            //this helps us to achieve higher file size.
            //the right way in the future will be to use file system to save to blocks from the beginning
            if (peer5.config.USE_FS) {
                peer5.info('saving file via file system api ')
                this._saveLocallyUsingFSio();
            } else {
                this._saveLocally();
                peer5.info('saving file without file system api ')
            }
        },

        changeResourceId:function(newResourceId,cb){
            var thi$ = this;
            peer5.core.data.FSio.renameResource(this.resourceId,newResourceId,function(succ){
                if(succ){
                    thi$.resourceId = newResourceId;
                }
                cb(succ);
            });
        },
        /** @private functions*/
        _registerEvents:function(){
            var thi$ = this;
            this._lruRemoveCb = function(blockId,block){
                thi$._removeBlockData(blockId);
            };
        },

        _initiateFileSystem:function(){
            var thi$ = this;
            var resourceId = this.resourceId;
            peer5.core.data.FSio.requestQuota(this.fileSize,function(succ,freeSpace){
                if(succ){ //success to create filesystem
                    peer5.core.data.FSio.isExist(resourceId,function(succ){
                        if(succ){ //file exists
                            peer5.info("Resource " + resourceId + " exists already in the filesystem.");
                            thi$.fs = true;
                            thi$.initiateFromLocalData(function(succ){
                                if(succ){ //initiated from local data
                                    var fileSizeLeft = (thi$.numOfBlocks - thi$.numOfVerifiedBlocks)*peer5.config.BLOCK_SIZE;
                                    if(freeSpace > fileSizeLeft){ //we hav enough space
                                        radio('filesystemInitiated').broadcast();
                                        radio('resourceInit').broadcast(thi$.metadata);
                                    }else{ //we don't hav enough space, try #1
                                        peer5.warn("We don't have enough space for the file");
                                        peer5.config.USE_FS = false;
                                        radio('resourceInit').broadcast(thi$.metadata);
                                        radio('filesystemInitiated').broadcast();
                                        //TODO: remove other files
                                        //TODO: ask for more quota
                                        //TODO: fallback to no filesystem
                                    }
                                } else{ //problem initiating from local data
                                    //TODO: delete resource and go to file doesn't exist usecase.
                                    peer5.warn("There was a problem initiating from filesystem");
                                }
                            },0);
                            //TODO: verify that freeSpace > amount of file left to download
                        }else{ //file doesn't exist
                            peer5.info("Resource " + resourceId + " doesn't exist in the filesystem.");
                            if(freeSpace > thi$.fileSize){ //we have enough space let's create the resource
                                peer5.core.data.FSio.createResource(resourceId,function(succ){
                                    if(succ){
                                        thi$.fs = true;
                                    }else{
                                        thi$.fs = false;
                                    }
                                    radio('resourceInit').broadcast(thi$.metadata);
                                    radio('filesystemInitiated').broadcast();
                                });
                            }else{ //we don't have enough space, try #1
                                peer5.core.data.FSio.removeRootDir(function(){
                                    peer5.core.data.FSio.queryQuota(function(succ,usage,quota){
                                        if(quota - usage > thi$.fileSize){ //we have enough space let's create the resource
                                            peer5.core.data.FSio.createResource(resourceId,function(succ){
                                                if(succ){
                                                    thi$.fs = true;
                                                }else{
                                                    thi$.fs = false;
                                                }
                                                radio('resourceInit').broadcast(thi$.metadata);
                                                radio('filesystemInitiated').broadcast();
                                            });
                                        }else{ //we don't have enough space, try #2
                                            peer5.core.data.FSio.requestQuota(thi$.fileSize + usage,function(succ,freeSpace){
                                                if(succ){
                                                    if(freeSpace > thi$.fileSize){ //we have enough space let's create the resource
                                                        peer5.core.data.FSio.createResource(resourceId,function(succ){
                                                            if(succ){
                                                                thi$.fs = true;
                                                            }else{
                                                                thi$.fs = false;
                                                            }
                                                            radio('resourceInit').broadcast(thi$.metadata);
                                                            radio('filesystemInitiated').broadcast();
                                                        });
                                                    }else{ //we don't have enough space, try #3
                                                        peer5.warn("We don't have enough space for the file");
                                                        peer5.config.USE_FS = false;
                                                        radio('resourceInit').broadcast(thi$.metadata);
                                                        radio('filesystemInitiated').broadcast();
                                                        //TODO: fallback to no filesystem
                                                    }
                                                }
                                            });
                                        }
                                    })
                                });
                            }
                        }
                    })
                }else{ //failed to create filesystem
                    peer5.warn("failed to create the filesystem");
                    peer5.config.USE_FS = false;
                    radio('resourceInit').broadcast(thi$.metadata);
                    radio('filesystemInitiated').broadcast();
                }
            })
        },

        _removeBlockData:function(blockId){
            if(this.privateBlockMap[blockId])
                this.privateBlockMap[blockId].removeBlockData();
        },

        _saveLocallyUsingFSio:function(){
            peer5.debug("saveLocally called");
            var thi$ = this;
            peer5.core.data.FSio.createObjectURL(this.resourceId,function(succ,url){
                if(!succ) return;
                var a = document.createElement('a');
                a.setAttribute('download', thi$.metadata.name);
                a.setAttribute('href', url);
                document.body.appendChild(a);
                a.click();
                //removing the resource disrupts the saving of the file
                //peer5.core.data.FSio.removeResource(name);
            })
        },

        _saveLocally:function(){
            var array = [];
            for (var i = 0; i < this.getNumOfBlocks(); ++i) {
//                array.set(this.getBlock(i), i * peer5.config.BLOCK_SIZE);
                array.push(this.getBlock(i));
            }
//            var blob = new Blob([array], {type: "application/octet-binary"});
            var blob = new Blob(array, {type:"application/octet-binary"});
            if (!window.URL && window.webkitURL)
                window.URL = window.webkitURL;
            var a = document.createElement('a');
            a.setAttribute('download', this.metadata.name);
            a.setAttribute('href', window.URL.createObjectURL(blob));
            document.body.appendChild(a);
            a.click();
        },

        calcBlockIdChunkOffset:function (chunkId) {
            var blockId = Math.floor(chunkId / this.numOfChunksInBlock);
            var chunkOffset = chunkId % this.numOfChunksInBlock;
            return {block:blockId, chunk:chunkOffset};
        }
    })
})();
