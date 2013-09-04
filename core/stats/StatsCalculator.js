(function () {

    var CONST = 'const'; // placeHolder to add static class constants
    //const UPLOAD_CAP = 100000; //100KB/s

    /*
     * here we are extending Object , because we dont really want any special inheritance
     * if we want to inherit from class A we should write A.subClass
     * */
    peer5.core.stats.StatsCalculator = Object.subClass({

        //just so we'll know what is the name of the class we are (nameSpace) in if we need
        name:'peer5.core.stats.StatsCalculator',

        /*
         * ctor will be called when instantiating a class with for example here new peer5.client.MediaElementWrapper(x,y,z);
         * to call super function we do this._super();
         *
         * */
        ctor:function (fileSize, fileName, url) {

            this.Url = url;
            this.name = fileName;
            this.size = fileSize //in bytes
            this.transferFinished = false;
            this.Report_Created_Timestamp = Date.now();
            this.Report_Timestamp = 0;
            this.Stats_Timestamp = Date.now();
            this.Total_Recv = 0;
            this.Total_Sent = 0;
            this.Total_Sent_P2P = 0;
            this.Total_Recv_P2P = 0;
            this.Total_Recv_HTTP = 0;
            this.Total_Waste_P2P = 0;
            this.Total_Waste_HTTP = 0;
            this.Total_loaded_FS = 0;
            this.numOfSenders = 0;
            this.Total_Avg_Download = 0;

            //the totals from last report
            this.Prev_Report_Timestamp = Date.now();
            this.Prev_Total_Recv = 0;
            this.Prev_Total_Sent = 0;
            this.Prev_Total_Sent_P2P = 0;
            this.Prev_Total_Recv_P2P = 0;
            this.Prev_Total_Waste_P2P = 0;
            this.Prev_Total_Waste_HTTP = 0;
            this.Prev_Total_Recv_HTTP = 0;
            this.Prev_Total_loaded_FS = 0;
            this.Avg_Sent = 0;
            this.Avg_Recv = 0;
            this.Avg_Sent_P2P = 0;
            this.Avg_Recv_P2P = 0;
            this.Avg_Loaded_FS = 0;
            this.Avg_Waste_P2P = 0;
            this.Avg_Waste_HTTP = 0;
            this.Avg_Recv_HTTP = 0;
            this.Size_Uploaded_To_Memory = 0;
            this.Total_Avg_Download = 0;
            this.numOfHttpCompletedChunks = 0;
            this.numOfHttpWasteChunks = 0;
            this.numOfP2PCompletedChunks = 0;
            this.numOfP2PWasteChunks = 0;
            this.statsTimestamp = 0; //starts at 0 the handle the special case of first download
            this.startTime = Date.now();

            this.registerEvents();
            //first to init the values.
            this.calc_avg();


        },

        addP2PRecv:function () {
            this.Total_Recv_P2P += peer5.config.CHUNK_SIZE;
        },
        addP2PWaste:function () {
            this.numOfP2PWasteChunks++;
            this.Total_Waste_P2P += peer5.config.CHUNK_SIZE;
        },
        addP2PSent:function () {
            this.Total_Sent_P2P += peer5.config.CHUNK_SIZE;
        },
        addHTTP:function () {
            this.Total_Recv_HTTP += peer5.config.CHUNK_SIZE;
        },

        calc_avg:function (forceCalc) {
            //delta: the time passed from last report
            var delta = Date.now() - this.statsTimestamp; //the time delta

            //we have to ignore the first calc because statsTimestamp is init to 0 and this will harm the calc
            if (this.statsTimestamp == 0) {
                //first update to set with initial values (0,NAN, infinity years left
                radio('peer5_state_updated').broadcast(this);
                this.statsTimestamp += delta;
                return;
            }

            //currently we forceCalc only when a calc_avg is called from sendReport
            if (delta < 1000 && !forceCalc) return;

            this.statsTimestamp += delta;

            //we want the calculations to be in bytes - therefore we will change delta to be in seconds
            delta /= 1000;

            this.Total_Recv = this.Total_Recv_HTTP + this.Total_Recv_P2P + this.Total_loaded_FS;
            this.Total_Sent = this.Total_Sent_P2P; //+this.Total_Sent_HTTP;

            this.Avg_Recv = (this.Total_Recv - this.Prev_Total_Recv) / delta
            this.Avg_Sent = (this.Total_Sent - this.Prev_Total_Sent) / delta
            this.Avg_Loaded_FS = (this.Total_loaded_FS - this.Prev_Total_loaded_FS) / delta;
            this.Avg_Sent_P2P = (this.Total_Sent_P2P - this.Prev_Total_Sent_P2P) / delta;
            this.Avg_Recv_P2P = (this.Total_Recv_P2P - this.Prev_Total_Recv_P2P) / delta;
            this.Avg_Waste_P2P = (this.Total_Waste_P2P - this.Prev_Total_Waste_P2P) / delta;
            this.Avg_Waste_HTTP = (this.Total_Waste_HTTP - this.Prev_Total_Waste_HTTP) / delta;
            this.Avg_Recv_HTTP = (this.Total_Recv_HTTP - this.Prev_Total_Recv_HTTP) / delta;
            this.Avg_Recv_WS = (this.Total_Recv_WS - this.Prev_Total_Recv_WS) / delta;
            this.Avg_Sent_WS = (this.Total_Sent_WS - this.Prev_Total_Sent_WS) / delta;
            this.Offloading = this.Total_Recv_P2P / (this.Total_Recv_HTTP + this.Total_Recv_P2P)

            this.Prev_Total_Recv = this.Total_Recv;
            this.Prev_Total_Sent = this.Total_Sent;
            this.Prev_Total_Sent_P2P = this.Total_Sent_P2P;
            this.Prev_Total_Recv_P2P = this.Total_Recv_P2P;
            this.Prev_Total_Waste_P2P = this.Total_Waste_P2P;
            this.Prev_Total_Waste_HTTP = this.Total_Waste_HTTP;
            this.Prev_Total_Recv_HTTP = this.Total_Recv_HTTP;
            this.Prev_Total_loaded_FS = this.Total_loaded_FS;

            radio('peer5_state_updated').broadcast(this);
        },


        registerEvents:function () {
            var thi$ = this;

            radio('peer5_received_fs_chunk').subscribe([function(chunkId,swarmId){
                this.Total_loaded_FS += peer5.config.CHUNK_SIZE;
            },this]);

            radio('peer5_received_http_chunk').subscribe(function (chunkId, swarmId) {
                //thi$.Total_Recv_HTTP += peer5.config.CHUNK_SIZE;
                //thi$.calc_avg(false);
            });

            radio('peer5_pending_http_chunk').subscribe(function (chunkId, swarmId) {

            });

            radio('peer5_waste_http_chunk').subscribe(function (chunkId, swarmId, originId) {
                thi$.Total_Waste_P2P += peer5.config.CHUNK_SIZE;
            });

            radio('peer5_new_p2p_chunk').subscribe(function (chunkId, swarmId, originId) {
                thi$.Total_Recv_P2P += peer5.config.CHUNK_SIZE;
                //thi$.calc_avg(false);
            });

            radio('peer5_waste_p2p_chunk').subscribe(function (chunkId, swarmId, originId) {
                thi$.numOfP2PWasteChunks++;
                thi$.Total_Waste_P2P += peer5.config.CHUNK_SIZE;
            });

            radio('peer5_p2p_pending_chunk').subscribe(function (chunkId, swarmId, originId) {

            });

            radio('chunkAddedToBlockMap').subscribe(function () {
                thi$.Size_Uploaded_To_Memory += peer5.config.CHUNK_SIZE;
            });


            radio('chunkSentEvent').subscribe([function (blockMap) {
                thi$.Total_Sent_P2P += peer5.config.CHUNK_SIZE;
            }]);

            radio('xhrBytesReceived').subscribe([function (size) {
                thi$.Total_Recv_HTTP += size;
            }]);

            radio('transferFinishedEvent').subscribe([function (blockMap) {
                thi$.transferFinished = true;
                thi$.Total_Avg_Download = thi$.size / ((Date.now() - thi$.startTime)/1000);
                //thi$.calc_avg(true);
            }]);

        }
    })
})();


