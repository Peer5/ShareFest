/**
 * Created with JetBrains WebStorm.
 * User: Shachar
 * Date: 03/01/13
 * Time: 12:41
 * To change this template use File | Settings | File Templates.
 */
(function () {
    WsConnection = function (wsServerUrl, clientId) {
        var thi$ = this;
        this.socket;
        this.initiateWebSocket(wsServerUrl,clientId)
    };

    WsConnection.prototype = {

        initiateWebSocket:function (wsServerUrl, clientId) {
            var thi$ = this;
            this.socket = io.connect(wsServerUrl);
            console.log('new websocket');
            this.socket.on('connect',function(){
                this.socket.on('disconnect', function () {
                });
                this.socket.on('message',function(){
                });
            });
        },

        sendSDP:function(message){
            this.socket.emit('SDP',message);
        }
    };
})();