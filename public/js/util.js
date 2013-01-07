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

function saveLocally(blob) {
    if (!window.URL && window.webkitURL)
        window.URL = window.webkitURL;

//    var blob = new Blob(oblob.buffer, {type:"application/octet-stream"});

    var a = document.createElement('a');
    a.setAttribute('download', 'file');
    a.setAttribute('target', '_blank');
    a.setAttribute('href', window.URL.createObjectURL(blob));
    document.body.appendChild(a);
    setTimeout(actuateLink, 1000, a);
}

function actuateLink(link) {
    var allowDefaultAction = true;

    if (link.click) {
        link.click();
        return;
    }
    else if (document.createEvent) {
        var e = document.createEvent('MouseEvents');
        e.initEvent(
            'click'     // event type
            , true      // can bubble?
            , true      // cancelable?
        );
        allowDefaultAction = link.dispatchEvent(e);
    }

    if (allowDefaultAction) {
        var f = document.createElement('form');
        f.action = link.href;
        document.body.appendChild(f);
        f.submit();
    }
}

function bytesToSize(bytes) {
    var sizes = ['b', 'KB', 'MB', 'GB', 'TB'];
    if (bytes == 0) return 'n/a';
    var i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
    return Math.round(bytes / Math.pow(1024, i)) + '' + sizes[i];
};