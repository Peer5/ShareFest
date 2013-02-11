//$(document).ready(function () {
//window.onload  = function() {
//    document.querySelector('input[type="file"]').addEventListener('change', function (e) {
//        var blob = this.files[0];
//
//        const BYTES_PER_CHUNK = 1024 * 1024 * 1024; // 1GB chunk sizes.
//        const SIZE = blob.size;
//
//        var start = 0;
//        var end = BYTES_PER_CHUNK;
//
//        while (start < SIZE) {
//            upload(blob.slice(start, end));
//
//            start = end;
//            end = start + BYTES_PER_CHUNK;
//        }
//    }, false);
//};

function upload(blob) {
    console.log('sending blob ' + blob.size);
    if(user == 1) {
        dc1.send(blob);
    } else {
        dc2.send(blob);
    }
}

function saveLocally(blob, name) {
    if (!window.URL && window.webkitURL)
        window.URL = window.webkitURL;
    var a = document.createElement('a');
    a.download = name;
    a.setAttribute('href', window.URL.createObjectURL(blob));
    document.body.appendChild(a);
    a.click();
}

function bytesToSize(bytes) {
    var sizes = ['b', 'KB', 'MB', 'GB', 'TB'];
    if (bytes == 0) return 'n/a';
    var i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
    return Math.round(bytes / Math.pow(1024, i)) + '' + sizes[i];
};