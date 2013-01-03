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
                thi$.socket.on('disconnect', function () {
                });
                thi$.socket.on('message',function(msg){
                    //console.log(msg)
                    thi$.socket.emit('offer', 'offer');
                });
                thi$.socket.on('offer',function(msg){
                    console.log(msg)
                });
            });
        },

        sendSDP:function(message){
            this.socket.emit('SDP',message);
        }


    };
})();