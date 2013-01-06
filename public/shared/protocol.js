(function (exports) {
    //used to send and receive
    function Match(clientIds){
        this.clientIds = clientIds; //array of Id's
    }

    function Offer(sdp,targetId,originId){
        this.originId = originId;
        this.targetId = targetId;
        this.sdp = sdp;
    }

    exports.Match = Match;
    exports.Offer = Offer;

})(typeof exports === 'undefined' ? this['protocol'] = {} : exports);

