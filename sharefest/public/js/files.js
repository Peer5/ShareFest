function sendFileInfo(fileInfo) {
    var xhr = new XMLHttpRequest();
    xhr.open('post', '/new');
    xhr.setRequestHeader("Content-Type", "application/json");
    xhr.onload = function () {
        //TODO: check statuses 200/403/...
        radio('SwarmCreatedEvent').broadcast(xhr.response);
    }
    xhr.send(JSON.stringify(fileInfo));


};
function addFiles(client, files) {
    userState.isSeeder = true;
    var file = files[0]; // FileList object
    ga('send', 'event', 'files', 'addFile', 'fileSize', file.size);
    if (file.size > peer5.config.ALLOWED_FILE_SIZE) {
        var maxFileSize = peer5.config.ALLOWED_FILE_SIZE/(1024*1024);
        //TODO: use bootstrap alerts
        alert('Currently only files under ' + maxFileSize + 'MB are allowed');
        ga('send', 'event', 'alerts', 'addFile', 'fileTooBig', file.size);
        return;
    }
    if (files.length > 1){
        //ToDo: use bootstrap alerts
        alert('Currently only a single file can be transfered');
        ga('send', 'event','alerts', 'addFile', 'multipleFiles', files.length);
    }
        client.prepareToReadFile(file.name, file.size);
    var reader = new FileReader();
    //Reading the file in slices:
    var sliceId = 0;
    //read a slice the size min(CACHE_SIZE,100MB) since ~100MB is the limit for read size of file api (in chrome).
    var chunksPerSlice = Math.floor(Math.min(100000000,peer5.config.CACHE_SIZE)/peer5.config.CHUNK_SIZE);
    //var swID;
    var sliceSize = chunksPerSlice * peer5.config.CHUNK_SIZE;
    var blob;
    $('#box-text').text('reading ' + file.name + '...');
    startNonsense();

    reader.onloadend = function (evt) {
        if (evt.target.readyState == FileReader.DONE) { // DONE == 2
            client.addChunks(file.name, evt.target.result,function(){
                sliceId++;
                console.log(reader);
                if ((sliceId + 1) * sliceSize < file.size) {
                    blob = file.slice(sliceId * sliceSize, (sliceId + 1) * sliceSize);
                    reader.readAsArrayBuffer(blob);
                } else if (sliceId * sliceSize < file.size) {
                    blob = file.slice(sliceId * sliceSize, file.size);
                    reader.readAsArrayBuffer(blob);
                } else {
                    stopNonsense();
                    updateList(files);
                    //TODO: fix for multiple files

                    //TODO: calc and add hashes
                    //ToDo: add origin instead of 'sharefest'

                    /*
                     support for choosing a room name
                     if(swarmId && swarmId != '' ){
                     swID = swarmId;
                     }else{
                     swID = null;
                     }*/
                    var fileInfo = new peer5.core.protocol.FileInfo(null, file.size, null, null, 'sharefest',
                        file.name, file.lastModifiedDate, file.type);
                    /*radio('SwarmCreatedEvent').subscribe(function(id) {
                     //radio('roomReady').broadcast(id);
                     });*/

                    //sendFileInfo(fileInfo);
                    client.upload(fileInfo);
                }
            });
        }
    };

    blob = file.slice(sliceId * sliceSize, (sliceId + 1) * sliceSize);
    reader.readAsArrayBuffer(blob);
}

function friendlyFileInfo(fileInfo) {
    return fileInfo.name + ' (' + bytesToSize(fileInfo.size) + ') ';
}

function listFiles(files) {
    var str = '';
    for (var i = 0; i < files.length; i++) {
        var entry = files[i];
        str += entry.name + ' (' + bytesToSize(entry.size) + ') ';
    }
    return str;
}

function bytesToSize(bytes) {
    var sizes = ['b', 'KB', 'MB', 'GB', 'TB'];
    if (bytes == 0) return '0.00KB';
    var i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
    return (bytes / Math.pow(1024, i)).toFixed(2) + '' + sizes[i];
};

function saveLocally(blob, name) {
    if (!window.URL && window.webkitURL)
        window.URL = window.webkitURL;
    var a = document.createElement('a');
    a.download = name;
    a.setAttribute('href', window.URL.createObjectURL(blob));
    document.body.appendChild(a);
    a.click();
};