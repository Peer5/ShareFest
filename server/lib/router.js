var rooms = require('./rooms.js');

exports.configure = function (app, rootdir) {
    app.get('/browser', function (req, res) {
        res.sendfile(rootdir + '/public/browser.html');
    });

    app.get('/faq', function (req, res) {
        res.sendfile(rootdir + '/public/faq.html');
    });


    app.get('/press', function (req, res) {
        res.sendfile(rootdir + '/public/press.html');
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