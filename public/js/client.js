(function () {
    client = function (wsServerUrl) {
        this.clientId;
        this.ws;
    };

    client.prototype = {
        initiateClient:function (wsServerUrl) {
            var thi$ = this;
            this.clientId; //either randomly create or get it from WsConnection
            this.ws = new WsConnection(ws_url);
            this.initiatePeerConnectionCallbacks();
            this.createDataChannel();
        },

        initiatePeerConnectionCallbacks:function(){
            replaceReturnCallback(print_);
            replaceDebugCallback(debug_);
            doNotAutoAddLocalStreamWhenCalled();
            hookupDataChannelCallbacks_();
        },

        createDataChannel:function(){
            ensureHasPeerConnection_();
            createDataChannelOnPeerConnection();
        }
    };
})();