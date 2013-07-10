var url = require('url');
var binary = require('../protocol/BinaryProtocol.js');
var protocol = require('../protocol/ProtocolMessages.js');
var sessionManager = require('../util/session-manager.js');

module.exports.instance = new function () {
    this.start = function (tracker, app, port, clientTimeout) {
        var thi$ = this;
        sessionManager.monitor(clientTimeout);
        var WsServer = require('ws').Server;
        var options = (port) ? {port:port} : {server:app}; // if port is specified server is not used
        peer5.log('Starting WebSocketServer');
        var expireFunction = function (expiredId) {
            peer5.log('expired ' + expiredId);
            var socket = thi$.sockets[expiredId];
            if (socket) socket.close();
        };
        var wss = new WsServer(options);
        wss.on('connection', function (socket) {
            var queryData = url.parse(socket.upgradeReq.url, true).query;
            var ip = socket._socket.remoteAddress;
//            ip = '37.26.146.175'; //uncomment to test
            var domain = url.parse(socket.upgradeReq.headers.origin).hostname;
            var host = socket.upgradeReq.headers.host;
            if (!domain) {
                peer5.error("couldn't grab a domain from the websocket");
                return;
            }

            socket.id = queryData.id;
            socket.token = queryData.token;

            peer5.log('connection established, socket: ' + socket + ' from ' + ip + ' in domain ' + domain + ' with host ' + host + ' and got id ' + socket.id);

            socket.on('message', function (message) {
                var browserName = (socket.upgradeReq.headers['user-agent'] || 'Unknown_Browser');
                if (browserName.indexOf('Firefox') > -1) {
                    browserName = protocol.SWARM_ONLY_FIREFOX; // hack to ease send of errors later
                }
                else if (browserName.indexOf('Chrome') > -1) {
                    browserName = protocol.SWARM_ONLY_CHROME; // hack to ease send of errors later
                }
                sessionManager.notify(socket.id, expireFunction);
                if (typeof message != 'string') {
                    var decoded = binary.decode(message);
                    if (!decoded) { peer5.warn('decoded message was empty');}
                    for (var i = 0; i < decoded.length; ++i) {
                        var entry = decoded[i];
                        switch (entry.tag) {
                            case protocol.JOIN:
                                tracker.join(socket.id, entry.swarmId, browserName, thi$, socket.ip, socket.token);
                                break;
                            case protocol.FILE_INFO:
                                entry.originBrowser = browserName;
                                tracker.createSwarm(socket.id, entry, thi$);
                                break;
                            case protocol.REPORT:
                                entry.originBrowser = browserName;
                                tracker.report(socket.id, entry, thi$, socket.ip, socket.token);
                                break;
                            case protocol.SDP:
                                thi$.send(entry.destId,entry);
                                break;
                        }
                    }
                } else {
                    peer5.warn("received a string message: string/JSON messages aren't supported");
                }
            });
            socket.on('close', function () {
                thi$.onclose(socket.id);
            });

            //Mechanism for removal of sockets in case that a peer reconnects with the same id,
            //and a new instance with that same id is created before the old one is deleted.
            var oldSocket = thi$.sockets[socket.id];
            if (oldSocket) {
                peer5.warn('Already got socket id ' + socket.id + ' closing the old one');
                oldSocket.id = "todelete"; //prevent removal
                oldSocket.close();
            }
            thi$.sockets[socket.id] = socket;
        });
        this.sockets = {};
        this.sockets.find = function (id) {
            return thi$.sockets[id];
        }
        this.onclose = function (socketId) {
            if (socketId in this.sockets) { //safe to call close twice
                peer5.log('peer with Id ' + socketId + " was closed");
                tracker.leave(socketId, this);
                delete this.sockets[socketId];
            }
        };
        this.errorHandler = function (error) {
            if (error) {
                peer5.error('server socket error' + JSON.stringify(error));
            }
        };
        this.send = function (socketId, commandObject) {
            var s = this.sockets.find(socketId);
            if (s){
                if(s.readyState == 1) {
                    s.send(binary.encode([commandObject]), {binary:true, mask:false},this.errorHandler);
                }else{
                    peer5.warn("socketId: " + socketId + " isn't initialized, readyState=" + s.readyState);
                }
            }
        };
    };
};
