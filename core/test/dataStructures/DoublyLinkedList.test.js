(function () {
    describe("DoublyLinkedList tests", function () {

        it('some init stuff', function() {
//            peer5.setLogLevel(5);
        });

        it('add a few elements and print them', function () {
            var numElems = 10;
            var list = new peer5.core.dataStructures.DoublyLinkedList();
            for(var i=0;i<numElems;++i){
                list.insert(i);
            }
            list.toString();
            expect(list.length).toEqual(numElems);
            expect(list.head.value).toEqual(0);
            expect(list.tail.value).toEqual(numElems-1);
        });

        it('add a few elements and delete them', function () {
            var numElems = 10;
            var list = new peer5.core.dataStructures.DoublyLinkedList();
            for(var i=0;i<numElems;++i){
                list.insert(i);
            }
            list.delete(list.head);
            expect(list.head.value).toEqual(1);
            expect(list.length).toEqual(numElems-1);
            list.delete(list.tail);
            expect(list.tail.value).toEqual(numElems-2);
            expect(list.length).toEqual(numElems-2);
            var iter = list.head;
            for(var i= 0;i<list.length/2;++i){
                iter = iter.next;
            }
            list.delete(iter);
            list.toString();
            while(list.head){
                list.delete(list.head);
            }
            expect(list.length).toEqual(0);
            list.toString();
        });
    });
})();
