/**
 * Simple log wrapper
 * Currently with no log framework
 *
 * NOTE: uses (hack) global peer5 var, and no exports
 */
(function () {
    if (typeof peer5 === 'undefined') {
        peer5 = {};
    }
    var flat = false;
    var logLevel = 2; // by default we allow warnings and error
    var friendly = ['0', 'ERROR', "WARNING", "info", "log", "debug"];

    var internal_log = function (level, object, title) {
        if (level > logLevel) return; // our current log level is not verbose enough
        // just a plain object to hold the log message which prints out nice on the console
        function p5log(object, title) {
            this.title = title;
            this.severity = friendly[level];
            var d = new Date();
            this.time = d.toLocaleTimeString();
            this.content = object;
            if (level < 3) {
                var stack = new Error().stack;
                this.stack = (stack)?new Error().stack.replace("Error\n", ""):'';
            }
        }

        p5log.prototype.toString = function () {
            var arr;
            if (this.content.stack) { //good for errors
                arr = [this.title, this.severity, this.time, this.content, this.content.stack];
            } else {
                arr = [this.title, this.severity, this.time, JSON.stringify(this.content) , this.stack];
            }
            return arr.join('\t');
        };

        object = (flat) ? new p5log(object).toString() : new p5log(object);
//        logFunction[level](object);
        switch (level) {
            case 1:
                console.error(object);
                break;
            case 2:
                console.warn(object);
                break;
            case 3:
                console.info(object);
                break;
            case 4:
            case 5:
                console.log(object);
                //console.debug(object.stack);
                //console.debug('--------------------------------------------------------------------------------------------------------');
                break;
        }


//        if (window.console && window.console.log) {
//            console.log();
//        }
    };

    peer5.setLogFlat = function (b) {
        flat = b
    };

    peer5.setLogLevel = function (newLevel) {
        logLevel = newLevel;
    };

    peer5.isVerbose = function () {
        return (logLevel > 2);
    };

    peer5.isDebug = function () {
        return (logLevel == 5);
    };

    peer5.debug = function (object, title) {
        internal_log(5, object, title)
    };
    peer5.log = function (object) {
        internal_log(4, object)
    };
    peer5.info = function (object) {
        internal_log(3, object)
    };
    peer5.warn = function (object) {
        internal_log(2, object)
    };
    peer5.error = function (object) {
        internal_log(1, object)
    };
})();