var config = require('../../../serverConfig.json');
var modes = require('./client-includes.js');
var buildify = require('../../../core/util/buildify-peer5.js'); //our own version of buildify
var url = require('url');
var tracker = require('../../' + config.trackerPath);


exports.configure = function (app, rootdir) {

    //https redirect
//    app.get('*', function (req, res, next) {
//        if (!req.secure) {
//            return res.redirect('https://' + req.get('Host') + req.url);
//        }
//        next();
//    });

    //buildify
    app.get('/client.js', function (req, res) {
        var ua = req.headers['user-agent'];
        var referer = req.headers.referer;
        var domain = 'localhost';
        if (referer) {
            try {
                domain = url.parse(req.headers.referer).hostname;
            } catch (e) {
                peer5.error(e);
                peer5.error('printing request headers');
                peer5.error(req.headers);
            }

        }

        console.log('/client.js requested. Parsing user agent ' + ua);

	var debug = false;
        try {
            debug = (domain == 'localhost') || url.parse(req.headers.referer).query == 'debuggee';  
        } catch (err) {}
	
	//get info from IP
        var ip = null;
        ip = req.ip;
        console.log(ip + " has requested a connection");

        var mode = req.query["mode"] || modes.FULL; //default: full client
        var files = [];
        if (modes[mode]) {
            files = (modes[mode]);
        }

        var js = buildify().concat(files);
        js = js.perform(function (content) {
            return content.replace(/peer5.config.BLOCK_SIZE/g, config.blockSize);
        });
//
//        var port = req.query["port"] || process.env.WS_PORT;
//        if (port) {
//            js = js.perform(function (content) {
//                return content.replace(/peer5.config.WS_PORT/g, "\'" + port + "\'");
//            });
//        }
//        var server = req.query["server"] || process.env.WS_SERVER;
//        if (server) {
//            js = js.perform(function (content) {
//                return content.replace(/peer5.config.WS_SERVER/g, "\'" + server + "\'");
//            });
//        }

        if (!debug) {
            js = js.uglify();
        }

        res.setHeader('Content-Type', 'text/javascript');
        res.send(200, js.content);
    });

//TODO: add to ws
    app.post('/new', function (req, res) {
        peer5.info('request for a new swarm');
        var fileInfo = req.body;
        peer5.info(fileInfo);
        var swarmId = tracker.instance.createSwarm(fileInfo);
        res.send(200, swarmId);
    });

    app.get('/B', function (req, res) {
        res.sendfile(rootdir + '/public/new.html');
    });

    app.get('/browser', function (req, res) {
        res.sendfile(rootdir + '/public/browser.html');
    });

    app.get('/faq', function (req, res) {
        res.sendfile(rootdir + '/public/faq.html');
    });


    app.get('/press', function (req, res) {
        res.sendfile(rootdir + '/public/press.html');
    });

    app.get('/download', function (req, res) {
        res.sendfile(rootdir + '/public/download.html');
    });

    app.get('/demo', function (req, res) {
        res.redirect("https://www.sharefest.me/ec90ce95");
    });

    app.get('/about', function (req, res) {
        res.redirect("https://github.com/peer5/sharefest#about");
    });

    app.get('/contact', function (req, res) {
        res.redirect("mailto://sharefest@peer5.com");
    });

    app.get('/issues', function (req, res) {
        res.redirect("https://github.com/peer5/sharefest/issues?page=1&state=open");
    });

    app.get('/:id', function (req, res) {
        //todo: bind the room info to the page and output
        res.sendfile(rootdir + '/public/index.html');
    });
}
;
