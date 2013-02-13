(function () {

    ApiValidator = function (videoElement) {
        var browserDetails = this.detectBrowser();
        this.browserName = browserDetails[0].toLowerCase();
        this.browserVersion = browserDetails[1];
        this.videoTag = videoElement;




        this.browserVersionSupprotDataChannels = {
            chrome:26, //just so it'll work with current version of chrome and websockets
            firefox:19,
            msie:11,
            opera:15,
            safari:1000
        }
    };

    ApiValidator.prototype = {

        detectBrowser:function () {
            var N = navigator.appName, ua = navigator.userAgent, tem;
            var M = ua.match(/(opera|chrome|safari|firefox|msie)\/?\s*(\.?\d+(\.\d+)*)/i);
            if (M && (tem = ua.match(/version\/([\.\d]+)/i)) != null) M[2] = tem[1];
            M = M ? [M[1], M[2]] : [N, navigator.appVersion, '-?'];
            return M;
        },

        getMajorVersionNumber:function (fullVersion) {
            var arr = fullVersion.split('.');
            var number = parseInt(arr[0]);
            return number;
        },

        validateBrowser:function () {
            return ( this.validateWebRtc() && this.validateDataChannel() )
        },

        validateWebRtc:function () {
            //todo: for now since we are using websocket anyway we will not use this - we'll have to use it later on
            var RTCPeerConnection = true || window.RTCPeerConnection || window.webkitRTCPeerConnection || window.mozRTCPeerConnection;

            return (!!RTCPeerConnection && this.getMajorVersionNumber(this.browserVersion) >= this.browserVersionSupprotDataChannels[this.browserName]);


        },

        validateDataChannel:function () {
            //todo implement
            return ((this.getMajorVersionNumber(this.browserVersion) >= this.browserVersionSupprotDataChannels[this.browserName] ));



        }

    }
})();