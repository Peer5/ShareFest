(function () {

    peer5.core.apiValidators.ApiValidatorBase = Object.subClass({

        //juset so we'll know what is the name of the class we are (nameSpace) in if we need
        name:'peer5.core.apiValidators.ApiValidatorBase',

        /*
         * ctor will be called when instantiating a class with for example here new peer5.client.MediaElementWrapper(x,y,z);
         * to call super function we do this._super();
         * Param: gets an object of validators classes to run .validate function
         * */
        ctor:function (validators) {

        },

        detectBrowser:function () {
            var N = navigator.appName, ua = navigator.userAgent, tem;
            var M = ua.match(/(opera|chrome|safari|firefox|msie)\/?\s*(\.?\d+(\.\d+)*)/i);
            if (M && (tem = ua.match(/version\/([\.\d]+)/i)) != null) M[2] = tem[1];
            M = M ? [M[1], M[2]] : [N, navigator.appVersion, '-?'];
            return M;
        },

        getMajorVersionNumber:function (fullVersion) {
            var arr = fullVersion.split('.');
            var number = parseInt(arr[0]);
            return number;
        },

        validate:function () {
            //must be implemented by inheritors
            throw 'unimplemented method';
        }

    })

})();

