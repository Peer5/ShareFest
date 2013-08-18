(function () {
    peer5.core.data.FSio = Object.subClass({
        ctor:function () {
            this.writeQueue = new Queue();
            this.registerEvents();
            this.pendingObjectUrlCb = {};
//            this.removeAll(function(){window.webkitRequestFileSystem(window.TEMPORARY, peer5.config.FS_SIZE, this.onInitFs, this.errorHandler);});
            window.webkitRequestFileSystem(window.TEMPORARY, peer5.config.FS_SIZE, this.onInitFs, this.errorHandler);
        },

        createResource:function(resourceId,cb,single){ //single:true - single file, :false a directory
            peer5.log("Adding resource " + resourceId + " to the filesystem.");
            var thi$ = this;
            this.fs.root.getFile(peer5.config.FS_ROOT_DIR + resourceId,{create:true},function(fileEntry){
                if(cb) cb(true);
            },function(e){thi$.errorHandler(e);if(cb) cb(false);});
        },

        removeResource:function(resourceId,cb){ //implementation supports single file only
            peer5.log("Removing resource " + resourceId + " from the filesystem.");
            var thi$ = this;
            this.fs.root.getFile(peer5.config.FS_ROOT_DIR + resourceId,{create:false},function(fileEntry){
                fileEntry.remove(function(){
                    if(cb) cb(true);
                },function(e){thi$.errorHandler(e);if(cb) cb(false);})
            },function(e){thi$.errorHandler(e);if(cb) cb(false);})
        },

        write:function(resourceId,data,position, cb){    //implementation supports single file only
            peer5.debug("Writing to resource " + resourceId);
            if(this._writeAvailable()){
                this._write(resourceId,data,position,cb);
            }
            this._addWriteCommand(resourceId,data,position,cb);
        },

        //supports only a TBD:max size, (reading more than 100MB at a time crashes the browser)
        //cb(success,data), data is Uint8Array
        read:function(resourceId,startPosition,endPosition,cb){
            var thi$ = this;
            this.fs.root.getFile(peer5.config.FS_ROOT_DIR + resourceId, {}, function(fileEntry) {

                // Get a File object representing the file,
                // then use FileReader to read its contents.
                fileEntry.file(function(file) {
                    var reader = new FileReader();

                    reader.onloadend = function(evt) {
                        if (evt.target.readyState == FileReader.DONE) { // DONE == 2
                            if(cb) cb(true,new Uint8Array(evt.target.result));
                        };
                    }

                    var blob = file.slice(startPosition,endPosition);
                    reader.readAsArrayBuffer(blob);

                }, function(e){thi$.errorHandler(e);if(cb) cb(false);});
            }, function(e){thi$.errorHandler(e);if(cb) cb(false);});
        },

        //cb(succ,details)
        //details = {size:#}
        getResourceDetails:function(resourceId,cb){
            var thi$ = this;
            this.fs.root.getFile(peer5.config.FS_ROOT_DIR + resourceId, {}, function(fileEntry) {
                // Get a File object representing the file,
                fileEntry.file(function(file) {
                    cb(true,{size:file.size});
                }, function(e){thi$.errorHandler(e);if(cb) cb(false);});
            }, function(e){thi$.errorHandler(e);if(cb) cb(false);});
        },

        //cb(success,objectUrl)
        createObjectURL:function(resourceId,cb){
            var thi$ = this;
            if(this.writeQueue.getLength() > 0)
                this.pendingObjectUrlCb[resourceId] = cb;
            else{
                this.fs.root.getFile(peer5.config.FS_ROOT_DIR + resourceId, {}, function(fileEntry) {
                    peer5.log("queue size: " + thi$.writeQueue.getLength());
                    if(cb) cb(true,fileEntry.toURL());
                }, function(e){thi$.errorHandler(e);if(cb) cb(false);});
            }
        },

        isExist:function(resourceId,cb){
            peer5.log("Checking if resource " + resourceId + " exists in the filesystem.");
            var thi$ = this;
            this.fs.root.getFile(peer5.config.FS_ROOT_DIR + resourceId,{create:false},function(fileEntry){
                if(cb) cb(true);
            },function(e){thi$.errorHandler(e);if(cb) cb(false);});
        },

        listFiles:function(cb){
            var thi$ = this;
            var dirReader = this.fs.root.createReader();
            dirReader.readEntries(function(entries) {
                if (!entries.length) {
                    peer5.debug("Filesystem is empty")
                } else {
                    peer5.debug("Filesystem files: " + entries);
                }
                cb(true,entries);
            }, function(e){thi$.errorHandler(e);if(cb) cb(false);});
        },

        removeAll:function(cb){
            var thi$ = this;
            var dirReader = this.fs.root.createReader();
            dirReader.readEntries(function(entries) {
                for (var i = 0, entry; entry = entries[i]; ++i) {
                    if (entry.isDirectory) {
                        entry.removeRecursively(function() {}, function(e){thi$.errorHandler(e);if(cb) cb(false);});
                    } else {
                        entry.remove(function() {}, function(e){thi$.errorHandler(e);if(cb) cb(false);});
                    }
                }
                peer5.debug('Directory emptied.');
            },function(e){thi$.errorHandler(e);if(cb) cb(false);} );
        },

        queryQuota:function(cb){
            navigator.webkitTemporaryStorage.queryUsageAndQuota(function(usage, quota) {
                peer5.info('Using: ' + (usage / quota) * 100 + '% of temporary storage');
                if(cb)
                    cb(true,usage,quota);
            }, function(e) {
                peer5.error('Error', e);
                if(cb)
                    cb(false);
            });
        },

        _writeAvailable:function(){
            return (this.writeQueue.isEmpty())
        },

        _write:function(resourceId,data,position,cb){
            var thi$ = this;
            this.fs.root.getFile(peer5.config.FS_ROOT_DIR + resourceId,{create:false},function(fileEntry){
                fileEntry.createWriter(function (fileWriter) {
                    if(position > fileWriter.length){
                        peer5.debug("truncating: filewriter length = " + fileWriter.length + " position = " + position)
                        fileWriter.truncate(position);
                        thi$._write(resourceId,data,position,cb); //after truncate a new fileWriter need to be created
                    }else{
                        fileWriter.onwriteend = function (evt) {
                            if(evt.currentTarget.error)
                                thi$.errorHandler(evt.currentTarget.error);
                            thi$.writeQueue.dequeue(); //dequeue the finished command
                            peer5.debug("onwriteend: writeQueue length = " + thi$.writeQueue.getLength());
                            if(cb) cb(true);
                            if(!thi$.writeQueue.isEmpty()){
                                var writeCommand = thi$.writeQueue.peek(); //getting the next command
                                thi$._write(writeCommand.resourceId,writeCommand.data,writeCommand.position,writeCommand.cb);
                            }else{
                                peer5.debug("finished writing all the commands in command queue");
                                peer5.debug("writeQueue is empty, pendingObjectUrlCb = " + thi$.pendingObjectUrlCb[resourceId]);
                                if(thi$.pendingObjectUrlCb[resourceId]){
                                    thi$.createObjectURL(resourceId,thi$.pendingObjectUrlCb[resourceId]);
                                    delete thi$.pendingObjectUrlCb[resourceId];
                                }
                            }
                        };

                        fileWriter.onerror = function (evt){
                            peer5.error("write error " + evt);
                        };
                        peer5.debug("data size = " + data.size + " fileWriter.length = " + fileWriter.length + " position = " + position);
                        fileWriter.seek(position);
                        fileWriter.write(data); //assuming data is of type blob
                    }
                },function(e){thi$.errorHandler(e);if(cb) cb(false);});
            });
        },

        _addWriteCommand:function(resourceId,data,position,cb){
            var writeCommand = {resourceId:resourceId,data:data,position:position,cb:cb};
            this.writeQueue.enqueue(writeCommand);
        },

        registerEvents:function(){
            var thi$ = this;
            this.onInitFs = function(fs){
                thi$.fs = fs;
                fs.root.getDirectory(peer5.config.FS_ROOT_DIR,{create:true},function(dirEntry){
                    peer5.info("initiate filesystem");
                },thi$.errorHandler)
            };

            this.errorHandler = function (e) {
                var msg = '';
                switch (e.code) {
                    case FileError.QUOTA_EXCEEDED_ERR:
                        msg = 'QUOTA_EXCEEDED_ERR';
                        break;
                    case FileError.NOT_FOUND_ERR:
                        msg = 'NOT_FOUND_ERR';
                        break;
                    case FileError.SECURITY_ERR:
                        msg = 'SECURITY_ERR';
                        break;
                    case FileError.INVALID_MODIFICATION_ERR:
                        msg = 'INVALID_MODIFICATION_ERR';
                        break;
                    case FileError.INVALID_STATE_ERR:
                        msg = 'INVALID_STATE_ERR';
                        break;
                    default:
                        msg = 'Unknown Error';
                        break;
                };
                peer5.warn('File system error: ' + msg);
            };
        }
    });

    peer5.core.data.FSio = new peer5.core.data.FSio();

})();
