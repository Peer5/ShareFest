//require lang_ext for inheritance
require('../util/lang_ext.js');
(function (exports) {
    exports.AvailabilityMapBase = Object.subClass({
        name:'peer5.core.dataStructures.AvailabilityMapBase',
        ctor:function (numOfBlocks) {

        },

        //Public Methods
        //query whether id is on
        has:function (id) {
            throw 'unimplemented method';
        },

        set:function (id) {
            throw 'unimplemented method';
        },

        isFull:function () {
            throw 'unimplemented method';
        },

        serialize:function () {
            throw 'unimplemented method';
        },

        deserializeAndCopy:function (bitArray) {
            throw 'unimplemented method';
        },

        deserializeAndUpdate:function (blockIds) {
            throw 'unimplemented method';
        }
    });
})(typeof exports === 'undefined' ? peer5.core.dataStructures : exports);

