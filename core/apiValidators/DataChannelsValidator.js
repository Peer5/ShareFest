(function () {

    peer5.core.apiValidators.DataChannelsApiValidator = peer5.core.apiValidators.ApiValidatorBase.subClass({

        //juset so we'll know what is the name of the class we are (nameSpace) in if we need
        name:'peer5.core.apiValidators.DataChannelsApiValidator',

        /*
         * ctor will be called when instantiating a class with for example here new peer5.client.MediaElementWrapper(x,y,z);
         * to call super function we do this._super();
         *
         * */
        ctor:function (browserName, browserVersion) {
            this.browserName = browserName
            this.browserVersion = browserVersion

            this.browserVersionSupprot = {
                chrome:26, //just so it'll work with current version of chrome and websockets
                firefox:19,
                msie:11,
                opera:12,
                safari:1000
            }
        },

        /*getMajorVersionNumber:function (fullVersion) {
         var arr = fullVersion.split('.');
         var number = parseInt(arr[0]);
         return number;
         },*/


        validate:function () {
            var dc = true;
            var pc;

                try {
                    var RTCPeerConnection
                    if (window.webkitRTCPeerConnection) {
                        RTCPeerConnection = window.webkitRTCPeerConnection;
                        var SERVER = "stun:stun.l.google.com:19302";

                        servers = {iceServers:[
                            {url:"stun:" + SERVER}
                        ]};

                        pc = new RTCPeerConnection(
                            servers, { optional:[
                                { RtpDataChannels:true }
                            ]});
                        pc.createDataChannel('test_data_channels', { reliable:false })
                    } else {
                        //we are in firefox
                        if (window.mozRTCPeerConnection) {
                            RTCPeerConnection = window.mozRTCPeerConnection;
                            pc = new RTCPeerConnection();
                            var dcNotExist = !!!pc.createDataChannel
                            if(dcNotExist){
                                //data channel is not working
                                dc = false;
                            }

                        } else {
                            //no support in webrtc at all
                            dc = false;
                        }
                    }


                }
                catch
                    (e) {
                    dc = false;
                }

                if (pc) {
                    pc.close();
                    delete pc;
                }

                if (!dc) {
                    radio('browserUnsupported').broadcast(this.browserName, this.browserVersion, 'data channels');
                }
                return (/*(this.getMajorVersionNumber(this.browserVersion) >= this.browserVersionSupprot[this.browserName] ) &&*/ dc);


        }
    })

})
    ();

