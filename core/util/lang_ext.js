(function() {

    // The following code (inheritance) is taken from the book - Secrets of the JavaScript Ninja (John Resig).
    var initializing = false;

    // Determine if functions can be serialized
    var fnTest = /xyz/.test(function() { xyz; }) ? /\b_super\b/ : /.*/;

    // Create a new Class that inherits from this class
    Object.subClass = function(prop) {
        var _super = this.prototype;

        // Instantiate a base class (but only create the instance, don't run the init constructor)
        initializing = true;
        var proto = new this();
        initializing = false;

        var name;
        // Copy the properties over onto the new prototype
        for (name in prop) {
            // Check if we're overwriting an existing function
            var isAnExistingFunction =
                typeof prop[name] == "function" && typeof _super[name] == "function" && fnTest.test(prop[name]);

            proto[name] = isAnExistingFunction ?
                (function(name, fn) {
                    return function() {
                        var tmp = this._super;

                        // Add a new ._super() method that is the same method but on the super-class.
                        this._super = _super[name];

                        // The method only need to be bound temporarily, so we remove it when we're done executing.
                        var ret = fn.apply(this, arguments);
                        this._super = tmp;

                        return ret;
                    };
                })(name, prop[name]) :
                prop[name];
        }

        // The dummy class constructor
        function Class() {
            // All construction is actually done in the init method
            if (!initializing && this.ctor) this.ctor.apply(this, arguments);
        }

        // Handle static members
        for (name in this){
        	if (this.hasOwnProperty(name) && typeof(this[name]) != 'function')
                Class[name] = this[name];
        }

        // Populate our constructed prototype object
        Class.prototype = proto;

        // Enforce the constructor to be what we expect
        Class.constructor = Class;

        // And make this class extensible
        Class.subClass = arguments.callee;

        // Add behavior ability
        Class.addBehavior = function (behaviorAbstractClass, behaviorOverrides) {
            behaviorOverrides = behaviorOverrides || {};
            if (behaviorAbstractClass) {
                override(proto, behaviorOverrides, new behaviorAbstractClass());
            } else {
                throw 'behaviorAbstractClass must be a vaild behavior class';
            }
        };

        return Class;
    };
})();
// NO JQUERY
//
//jQuery.extend({
//    xmlToString: function(xmlObj) {
//        if (this.browser.msie) {
//            return xmlObj.xml;
//        } else {
//            return (new XMLSerializer()).serializeToString(xmlObj);
//        }
//    }
//});

