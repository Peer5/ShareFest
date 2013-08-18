exports.FULL = 100;
exports.NONE = 0;

// the order has importance!
    exports[exports.FULL] = [
        'core/util/namespaces.js',
        'sharefest/clientConfig.js',
        'core/util/logger.js',
        'core/util/lang_ext.js',
        'core/util/norequire.js',
        'core/util/radio.js',
        'core/util/uuid.js',
        'core/util/base64.js',
        'core/dataStructures/BlockMap.js',
        'core/dataStructures/Block.js',
        'core/dataStructures/AvailabilityMapBase.js',
        'core/dataStructures/Queue.compressed.js',
        'core/dataStructures/DoublyLinkedList.js',
        'core/dataStructures/LRU.js',
        'core/data/BlockCache.js',
        'core/data/FSio.js',
        'core/dataStructures/AvailabilityMap.js',
        'core/apiValidators/ApiValidatorBase.js',
        'core/apiValidators/ApiValidator.js',
        'core/apiValidators/DataChannelsValidator.js',
        'core/transport/AbstractPeerConnection.js',
        'core/transport/PeerConnectionImpl.js',
        'core/transport/WsConnection.js',
        'core/protocol/ProtocolMessages.js',
        'core/protocol/BinaryProtocol.js',
        'core/controllers/IController.js',
        'core/controllers/P2PController.js',
        'core/stats/StatsCalculator.js',
        'sharefest/public/js/sfClient.js'
    ];

