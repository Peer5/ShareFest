(function () {
    peer5.core.data.FSio = Object.subClass({
        ctor:function () {
            this.writeQueue = new Queue();
            this.registerEvents();
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
                            if(cb) cb(true,evt.target.result);
                        };
                    }

                    var blob = file.slice(startPosition,endPosition);
                    reader.readAsArrayBuffer(blob);

                }, function(e){thi$.errorHandler(e);if(cb) cb(false);});
            }, function(e){thi$.errorHandler(e);if(cb) cb(false);});
        },

        //cb(success,objectUrl)
        createObjectURL:function(resourceId,cb){
            var thi$ = this;
            this.fs.root.getFile(peer5.config.FS_ROOT_DIR + resourceId, {}, function(fileEntry) {
                if(cb) cb(true,fileEntry.toURL());
            }, function(e){thi$.errorHandler(e);if(cb) cb(false);});
        },

        _writeAvailable:function(){
            return (this.writeQueue.isEmpty())
        },

        _write:function(resourceId,data,position,cb){
            var thi$ = this;
            this.fs.root.getFile(peer5.config.FS_ROOT_DIR + resourceId,{create:false},function(fileEntry){
                fileEntry.createWriter(function (fileWriter) {
                    fileWriter.onwriteend = function (e) {
                        thi$.writeQueue.dequeue(); //dequeue the finished command
                        if(cb) cb(true);
                        if(!thi$.writeQueue.isEmpty()){
                            var writeCommand = thi$.writeQueue.peek(); //getting the next command
                            thi$._write(writeCommand.resourceId,writeCommand.data,writeCommand.position,writeCommand.cb);
                        }else{
                            peer5.debug("finished writing all the commands in command queue");
                        }
                    };
                    if(position > fileWriter.length)
                        fileWriter.truncate(position);
                    fileWriter.seek(position);
                    fileWriter.write(data); //assuming data is of type blob
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
