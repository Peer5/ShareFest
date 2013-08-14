(function () {
    peer5.core.data.BlockMaps = Object.subClass({
        ctor:function () {
            this._blockMaps = {};
            this._keys = {};
        },

        getRealKeyName: function(key) {
            return this._keys[key];
        },

        alias:function(newKey, key) {
            this._keys[newKey] = key;
        },

        add:function (key, blockMap) {
            this._keys[key] = key;
            this._blockMaps[key] = blockMap;
        },

        get:function (key) {
            key = this.getRealKeyName(key);
            return this._blockMaps[key];
        },

        remove:function (key) {
            key = this.getRealKeyName(key);
            delete this._blockMaps[key];
        },

        forEach:function(cb) {
            for (var k in this._blockMaps) {
                cb(k,this._blockMaps[k]);
            }
        }
    });

    peer5.core.data.BlockCache = new peer5.core.data.BlockMaps();

})();