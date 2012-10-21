function saveLocally(blob) {
    if (!window.URL && window.webkitURL)
        window.URL = window.webkitURL;

//    var blob = new Blob(oblob.buffer, {type:"application/octet-stream"});

    var a = document.createElement('a');
    a.setAttribute('download', 'file');
    a.setAttribute('target','_blank');
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
