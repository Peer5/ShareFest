var rooms = require('./rooms.js');

exports.configure = function(app, rootdir) {
    app.get('/browser', function (req, res) {
        res.sendfile(rootdir + '/public/browser.html');
    });

    app.get('/about', function (req, res) {
        res.redirect("https://github.com/peer5/sharefest");
    });

    app.get('/contact', function (req, res) {
        res.redirect("https://github.com/peer5/sharefest");
    });


    app.get('/:id', function (req, res) {
//        var roomId = req.params.id;
//        var room = rooms.getRoom(roomId);
//    displayRoom(room);

        //todo: bind the room info to the page and output
        res.sendfile(rootdir + '/public/index.html');
        //res.send(room);
    });
};