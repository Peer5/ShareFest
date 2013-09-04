(function () {
    peer5.core.dataStructures.DoublyLinkedList = Object.subClass({
        name:'peer5.core.dataStructures.DoublyLinkedList',

        /** @Public Methods*/
        ctor:function () {
            this.length = 0;
            this.tail = null;
            this.head = null;
        },

        insert:function(val){
            var e = {prev:this.tail,next:null,value:val};
            if(this.tail)
                this.tail.next = e;
            this.tail = e;
            if(this.length == 0)
                this.head = e;
            this.length++;
        },

        delete:function(elem){
            if(elem.prev)
                elem.prev.next = elem.next;
            if(elem.next)
                elem.next.prev = elem.prev;
            if(this.tail == elem) //TODO: verify that this equality works iff they are pointing at the same object
                this.tail = elem.prev;
            if(this.head == elem)
                this.head = elem.next;
            if(!this.head)
                debugger;
            this.length--;
        },

        toString:function(){
            var iter = this.head;
            while(iter){
                console.log(iter.value);
                iter = iter.next;
            }
        }
        /** @private functions*/

    })
})();
