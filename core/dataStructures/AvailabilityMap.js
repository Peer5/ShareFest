(function (exports) {

    var AvailabilityMapBase=
            (require('./AvailabilityMapBase.js')|| peer5.core.dataStructures).AvailabilityMapBase;

    exports.AvailabilityMap = AvailabilityMapBase.subClass({
        name:'peer5.core.dataStructures.AvailabilityMap',
        ctor:function (numOfBlocks, seeder) {
            this._super(numOfBlocks);

            this.seeder = seeder;
            this.size = numOfBlocks; //length in bits (how many blocks)
            this.length = Math.ceil(this.size / 8); //length of the array (how many indices)
            this.bitArray = new Uint8Array(this.length);
            if (seeder) {
                for (var i =0; i<this.length; i++) {
                    this.bitArray[i] = 0xFF; //full
                }
            }
            this.numOfOnBits = 0; //4 bytes when serialized
            this.bitMask = [0x1, 0x2, 0x4, 0x8, 0x10, 0x20, 0x40, 0x80];
        },

        /** @Public Methods*/
        //query whether id is on
        has:function (id) {
            if(this.isFull()) return true;
            var offset = this.getOffsets(id);
            return this.bitArray[offset.index] & this.bitMask[offset.bit];
        },

        set:function (id) {
            if (!this.has(id)) {
                var offset = this.getOffsets(id);
                this.bitArray[offset.index] = this.bitArray[offset.index] | this.bitMask[offset.bit];
                this.numOfOnBits++;
            }
        },

        setSeeder:function (id) {
            this.numOfOnBits = this.size;
        },

        isFull:function () {
            return this.numOfOnBits == this.size;
        },

        serialize:function () {
            return this.bitArray;
        },

        deserializeAndCopy:function (bitArray) {
            this.bitArray = bitArray;
        },

        deserializeAndUpdate:function (blockIds) {
            for (var i = 0; i < blockIds; ++i) {
                this.set(blockIds[i]);
            }
        },

        /** @Private Methods*/
        getOffsets:function (id) {
            var offset = {};
            offset.index = Math.floor(id / 8);
            offset.bit = id % 8;
            return offset;
        }
    });
})(typeof exports === 'undefined' ? peer5.core.dataStructures : exports);

