(function () {
    describe("DoublyLinkedList tests", function () {

        it('some init stuff', function() {
//            peer5.setLogLevel(5);
        });

        it('add a few elements', function () {
            var numElems = 10;
            var cacheSize = 10;
            var cache = new peer5.core.dataStructures.LRU(cacheSize,
                function(key,value){console.log("deleting: " + key + " " + value)});
            for(var i=0;i<numElems;++i){
                cache.set(i,i);
            }
            cache.get(0);
            for(var i=numElems;i<2*numElems;++i){
                cache.set(i,i);
            }
            expect(cache.get(0)).toEqual(false);
        });
    });
})();

