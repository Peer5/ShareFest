(function () {

    peer5.core.apiValidators.ApiValidator = Object.subClass({
        //just so we'll know what is the name of the class we are (nameSpace) in if we need
        name:'peer5.core.apiValidators.ApiValidator',

        /*
         * ctor will be called when instantiating a class with for example here new peer5.client.MediaElementWrapper(x,y,z);
         * to call super function we do this._super();
         * Param: gets an object of validators classes to run .validate function - these classes inherits from ApiValidatorBase
         * */
        ctor:function (validators) {
            var browserDetails = this.detectBrowser();
            this.browserName = browserDetails[0].toLowerCase();
            this.browserVersion = browserDetails[1];
            this.validators = [];

            //fill in validators array
            for(var i = 0 ; i < validators.length ; i++){
                var validator = validators[i]
                this.validators.push(new validator(this.browserName,this.browserVersion));
            }
        },

        detectBrowser:function () {
            var N = navigator.appName, ua = navigator.userAgent, tem;
            var M = ua.match(/(opera|chrome|safari|firefox|msie)\/?\s*(\.?\d+(\.\d+)*)/i);
            if (M && (tem = ua.match(/version\/([\.\d]+)/i)) != null) M[2] = tem[1];
            M = M ? [M[1], M[2]] : [N, navigator.appVersion, '-?'];
            return M;
        },

        validate:function () {
            var result = true;
            for(var i = 0 ; i < this.validators.length ; i++){
                var validator = this.validators[i];
                result = result && validator.validate();
            }

            return result;

        }
    })
})();

