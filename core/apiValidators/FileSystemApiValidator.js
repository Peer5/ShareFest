(function () {

    peer5.core.apiValidators.FileSystemApiValidator = peer5.core.apiValidators.ApiValidatorBase.subClass({

        //juset so we'll know what is the name of the class we are (nameSpace) in if we need
        name:'peer5.core.apiValidators.FileSystemApiValidator',

        /*
         * ctor will be called when instantiating a class with for example here new peer5.client.MediaElementWrapper(x,y,z);
         * to call super function we do this._super();
         *
         * */
        ctor:function (browserName, browserVersion) {
            this.browserName = browserName
            this.browserVersion = browserVersion

            this.browserVersionSupprot = {
                chrome:26, //just so it'll work with current version of chrome and websockets
                firefox:19,
                msie:11,
                opera:12,
                safari:1000
            }
        },

        validate:function () {
            if(peer5.config.USE_FS == false){
                return true;
            }
            if (window.webkitRequestFileSystem) {
                //test func
                peer5.core.data.FSio.requestQuota(100, function (succ) {
                    if (!succ) {
                        peer5.info('changing USE_FS to false')
                        peer5.config.USE_FS = false;
                    }
                })
            }else{
                //no fileSystem
                peer5.config.USE_FS = false;

            }

            return true;
        }
    })

})
    ();

