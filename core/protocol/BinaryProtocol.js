(function (exports) {
    var BinaryProtocol = {};
    var protocol = require('./ProtocolMessages.js') || peer5.core.protocol;

    // to help node compatibility
    //TODO: change node buffer instead of browsers' Uint8Array
    if (typeof Uint8Array == 'function' && Uint8Array.prototype.subarray)
        Uint8Array.prototype.slice = Uint8Array.prototype.subarray;

    var base64 = (require('./../util/base64.js') || peer5.core.util).base64;

    //TLV: tag 1 byte length 4 bytes value X bytes
    var TAG_SIZE = 1;
    var LENGTH_SIZE = 4;

    //taken from http://stackoverflow.com/questions/6965107/converting-between-strings-and-arraybuffers
    function ab2str(uint8) {
        //use node.js native buffer manipulation if possible
        if (typeof(Buffer)=="function" && Buffer.isBuffer(uint8)) return uint8.toString('ucs2');
        return String.fromCharCode.apply(null, new Uint16Array(uint8.buffer.slice(uint8.byteOffset))).trim();
//        return String.fromCharCode.apply(null, uint8).trim();
    }

    function str2ab(str) {
        //use node.js native buffer manipulation if possible
        if (typeof(Buffer)=="function") return new Buffer(str,'ucs2');
        var buf = new ArrayBuffer(str.length*2); // 2 bytes for each char
        var bufView = new Uint16Array(buf);
        for (var i=0, strLen=str.length; i<strLen; i++) {
            bufView[i] = str.charCodeAt(i);
        }
//        return buf;
        return new Uint8Array(buf);
    }

    //taken from http://stackoverflow.com/questions/6965107/converting-between-strings-and-arraybuffers
//    var ab2str = function(arr8) {
//        var arr16 = new Uint16Array(arr8.buffer); // view the byte array as 16bit
//        return String.fromCharCode.apply(null, arr16).trim();
//    }
//
//    var str2ab = function(str) {
//        var bufView = new Uint16Array(str.length);// 2 bytes for each char
//        for (var i=0, strLen=str.length; i<strLen; i++) {
//            bufView[i] = str.charCodeAt(i);
//        }
//        return bufView;
//    }

    var ab2ascii = function (buf) {
        return String.fromCharCode.apply(null, buf).trim();
    };

    var ascii2ab = function (str, padding) {
        var buf = new Uint8Array(str.length);
        for (var i = 0; i < str.length; i++) {
            buf[i] = str.charCodeAt(i);
        }

        if (padding) {
            for (var j = str.length; j < padding; j++) {
                buf[j] = ' ';
            }
        }
        return buf; // was return buf
    };

    var UInt8ArrayToInt32 = function (array, index) {
        if (!index) index = 0;
        var n = 0;
        n += array[index++] << 24;
        n += array[index++] << 16;
        n += array[index++] << 8;
        n += array[index];
        return n;
    };

    var UInt32ToUInt8Array = function (integers) {
        var index = 0;
        if (typeof(integers.length) != "number") {
            integers = Array.prototype.slice.call(arguments);
        }
        var array = new Uint8Array(integers.length * 4);
        for (var i = 0; i < integers.length; i++) {
            var n = integers[i];
            array[index++] = (n & 0xFF000000) >> 24;
            array[index++] = (n & 0x00FF0000) >> 16;
            array[index++] = (n & 0x0000FF00) >> 8;
            array[index++] = (n & 0x000000FF);
        }
        return array;
    }

    var BoolToUInt8Array = function (b) {
        return (b) ? new Uint8Array([1]) : new Uint8Array([0]);
    };

    var UInt8ArrayToBool = function (array, index) {
        return (array[index] != 0);
    };

    var p2p_data_encode = function (message) {
        var swarmId = ascii2ab(BinaryProtocol.shortenSwarmId(message.swarmId));
        var chunkId = UInt32ToUInt8Array(message.chunkId);
        return BinaryProtocol.concat([swarmId, chunkId, message.payload]);
    };

    var p2p_request_encode = function (message) {
        var buffers = [];
        var swarmId = ascii2ab(BinaryProtocol.shortenSwarmId(message.swarmId));
        buffers.push(swarmId);
        var encodedChunkId = UInt32ToUInt8Array(message.chunkIds);
        buffers.push(encodedChunkId);
        return BinaryProtocol.concat(buffers);
    };


    var p2p_cancel_encode = function (message) {
        var buffers = [];
        var swarmId = ascii2ab(BinaryProtocol.shortenSwarmId(message.swarmId));
        buffers.push(swarmId);
        var encodedChunkIds = UInt32ToUInt8Array(message.chunkIds);
        buffers.push(encodedChunkIds);
        return BinaryProtocol.concat(buffers);
    };

    var p2p_have_encode = function (message) {
        var buffers = [];
        var swarmId = ascii2ab(BinaryProtocol.shortenSwarmId(message.swarmId));
        buffers.push(swarmId);
        var seeder = BoolToUInt8Array(message.seeder);
        buffers.push(seeder);
        var complete = BoolToUInt8Array(message.complete);
        buffers.push(complete);
        if (message.complete) {
            buffers.push(message.availabilityMap);
        } else {
            var blockIdsEncoded = UInt32ToUInt8Array(message.blockIds);
            buffers.push(blockIdsEncoded);
        }

        return BinaryProtocol.concat(buffers);
    };

    var p2p_data_decode = function (buffer, index, length) {
        var swarmId = ab2ascii(buffer.slice(index, index + BinaryProtocol.transferedSwarmIdSize));
        index += BinaryProtocol.transferedSwarmIdSize;
        var chunkId = UInt8ArrayToInt32(buffer, index);
        index += 4;
        var payload = buffer.slice(index, index + length);
        return new protocol.Data(swarmId, chunkId, payload);
    };

    var p2p_request_decode = function (buffer, index, length) {
        var swarmId = ab2ascii(buffer.slice(index, index + BinaryProtocol.transferedSwarmIdSize));
        index += BinaryProtocol.transferedSwarmIdSize;
        length -= BinaryProtocol.transferedSwarmIdSize;
        var chunkIds = [];
        while (length > 0) {
            chunkIds.push(UInt8ArrayToInt32(buffer, index));
            length -= 4;
            index += 4;
        }

        return new protocol.Request(swarmId, chunkIds);
    };

    var p2p_cancel_decode = function (buffer, index, length) {
        var swarmId = ab2ascii(buffer.slice(index, index + BinaryProtocol.transferedSwarmIdSize));
        index += BinaryProtocol.transferedSwarmIdSize;
        length -= BinaryProtocol.transferedSwarmIdSize;
        var chunkIds = [];
        while (length > 0) {
            chunkIds.push(UInt8ArrayToInt32(buffer, index));
            length -= 4;
            index += 4;
        }

        return new protocol.Cancel(swarmId, chunkIds);
    };

    var p2p_have_decode = function (buffer, index, length) {
        var blockIds;
        var availabilityMap;
        var swarmId = ab2ascii(buffer.slice(index, index + BinaryProtocol.transferedSwarmIdSize));
        index += BinaryProtocol.transferedSwarmIdSize;
        length -= BinaryProtocol.transferedSwarmIdSize;

        var seeder = UInt8ArrayToBool(buffer, index);
        index++;
        length--;

        if (!seeder) {
            var complete = UInt8ArrayToBool(buffer, index);
            index++;
            length--;
            if (complete) {
                availabilityMap = buffer.slice(index, index + length);
            } else { //update
                blockIds = [];
                while (length > 0) {
                    blockIds.push(UInt8ArrayToInt32(buffer, index));
                    index += 4;
                    length -= 4;
                }
            }
        }
        return new protocol.Have(swarmId, seeder, availabilityMap, blockIds);
    };

    /*
     var report_encode = function (message) {
     var buffers = [];
     buffers.push(ascii2ab(message.swarmId)); //        swarmId full (20bytes)
     buffers.push(ascii2ab(message.ua.vendor)); //        char of vendor (1byte)
     buffers.push(ascii2ab(message.ua.version, 15)); // version number
     buffers.push(UInt32ToUInt8Array(message.browser)); //        last requested blockId (not random) (uint)
     buffers.push(UInt32ToUInt8Array(message.lastRequestedBlockId)); //        last requested blockId (not random) (uint)
     buffers.push(UInt32ToUInt8Array(message.totalBytesDown)); //        total bytes dl
     buffers.push(UInt32ToUInt8Array(message.totalBytesUp)); //        total bytes up
     buffers.push(UInt32ToUInt8Array(message.speedDown.max)); //        dl speed kbs max
     buffers.push(UInt32ToUInt8Array(message.speedDown.min)); //        dl speed kbs min
     buffers.push(UInt32ToUInt8Array(message.speedDown.avg)); //        dl speed kbs avg
     buffers.push(UInt32ToUInt8Array(message.speedUp.max)); //        up speed kbs max
     buffers.push(UInt32ToUInt8Array(message.speedUp.min)); //        up speed kbs min
     buffers.push(UInt32ToUInt8Array(message.speedUp.avg)); //        up speed kbs avg
     buffers.push(UInt32ToUInt8Array(message.connections.length)); //    connections
     message.connections.forEach(function(connection) {
     buffers.push(UInt32ToUInt8Array(connection.totalBytesDown)); //        total bytes dl
     buffers.push(UInt32ToUInt8Array(connection.totalBytesUp)); //        total bytes up
     buffers.push(UInt32ToUInt8Array(connection.speedDown.max)); //        dl speed kbs max
     buffers.push(UInt32ToUInt8Array(connection.speedDown.min)); //        dl speed kbs min
     buffers.push(UInt32ToUInt8Array(connection.speedDown.avg)); //        dl speed kbs avg
     buffers.push(UInt32ToUInt8Array(connection.speedUp.max)); //        up speed kbs max
     buffers.push(UInt32ToUInt8Array(connection.speedUp.min)); //        up speed kbs min
     buffers.push(UInt32ToUInt8Array(connection.speedUp.avg)); //        up speed kbs avg
     buffers.push(UInt32ToUInt8Array(connection.chunksDropped)); //            chunk drop % (expiration)
     buffers.push(UInt32ToUInt8Array(connection.blockVerificationFailures)); //#blocks failed hash verification
     buffers.push(UInt32ToUInt8Array(connection.latency)); // best latency
     });

     return binary.concat(buffers);

     }*/

    var json_encode = function (message) {
        var json = JSON.stringify(message);
        return ascii2ab(json);
    };

    var json_decode = function (buffer, index, length) {
        try {
            var json = ab2ascii(buffer.slice(index, index + length));
            return JSON.parse(json);
        }catch(e){
            peer5.error(e);
            peer5.error('printing out the buggy json');
            peer5.error(json);


        }

    };

    var json_encode16 = function (message) {
        var json = JSON.stringify(message);
        return str2ab(json);
    };

    var json_decode16 = function (buffer, index, length) {
        var json = ab2str(buffer.slice(index, index + length));
        return JSON.parse(json);
    };

    //simple binary serializer using json
    var json_decoder = { encode:json_encode, decode:json_decode };
    var json_decoder16 = { encode:json_encode16, decode:json_decode16 };

    var dict = {};

    dict[protocol.P2P_DATA] = { encode:p2p_data_encode, decode:p2p_data_decode };
    dict[protocol.P2P_REQUEST] = { encode:p2p_request_encode, decode:p2p_request_decode };
    dict[protocol.P2P_CANCEL] = { encode:p2p_cancel_encode, decode:p2p_cancel_decode };
    dict[protocol.P2P_HAVE] = { encode:p2p_have_encode, decode:p2p_have_decode };
    dict[protocol.REPORT] = json_decoder;
    dict[protocol.MATCH] = json_decoder;
    dict[protocol.SDP] = json_decoder;
    dict[protocol.FILE_INFO] = json_decoder16;
    dict[protocol.SWARM_HEALTH] = json_decoder;
    dict[protocol.SWARM_ERROR] = json_decoder;
    dict[protocol.JOIN] = json_decoder;

    var put_tlv = function (index, tag, plainValue, encode) {
        var value = plainValue;
        if (encode && tag in dict && dict[tag].encode) {
            value = dict[tag].encode(plainValue);
        }
        var array = new Uint8Array(5 + value.length); //tag1 + length4 + value.length
        var length = value.length;
        array[index++] = tag;
        array.set(UInt32ToUInt8Array(length), index);
        index += LENGTH_SIZE;

        array.set(value, index);
        return array;
    };

    var get_tlv = function (array, index) {
        //get tag
        var tag = array[index++];
        var length = UInt8ArrayToInt32(array, index);
        index += LENGTH_SIZE;

        var data = array.slice(index, index + length);
        return [tag, data];
    };

    BinaryProtocol.concat = function (arrays) {
        var length = 0;
        arrays.map(function (arr) {
            length += arr.length;
        });

        var result = new Uint8Array(length);
        var index = 0;
        arrays.map(function (arr) {
            result.set(arr, index);
            index += arr.length;
        });
        return result;
    };

    BinaryProtocol.encode = function (messages) {
        var buffers = [];
        messages.forEach(function (message) {
            if (message && message.tag && dict[message.tag] && dict[message.tag].encode) {
                var encoded = dict[message.tag].encode(message); //value
                buffers.push(put_tlv(0, message.tag, encoded));
            }
        });
        return BinaryProtocol.concat(buffers);

    };

    BinaryProtocol.decode = function (buffer) {
        // iterate TLV messages inside the buffer
        var index = 0;
        var result = [];
        while (index < buffer.length) {
            var curr_tlv = get_tlv(buffer, index);
            var tag = curr_tlv[0];
            var v = curr_tlv[1];
            index += TAG_SIZE + LENGTH_SIZE;

            var tag_translation = dict[tag];
            if (tag_translation && tag_translation.decode) {
                result.push(tag_translation.decode(buffer, index, v.length));
            } else {
                return null;
            }
            index += v.length;

        }

        return result;


    };

    BinaryProtocol.transferedSwarmIdSize = 20;
    BinaryProtocol.shortenSwarmId = function (s) {
        var str = s.substr(0, BinaryProtocol.transferedSwarmIdSize);
        return (new Array(BinaryProtocol.transferedSwarmIdSize - s.length + 1)).join(" ").concat(s);
    };

    exports.shortenSwarmId = BinaryProtocol.shortenSwarmId;
    exports.concat = BinaryProtocol.concat;
    exports.decode = BinaryProtocol.decode;
    exports.encode = BinaryProtocol.encode;

})(typeof exports === 'undefined' ? peer5.core.protocol.BinaryProtocol = {} : exports);
