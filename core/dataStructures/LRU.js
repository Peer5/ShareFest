(function () {
    peer5.core.dataStructures.LRU = Object.subClass({
        name:'peer5.core.dataStructures.LRU',

        /** @Public Methods*/
        ctor:function (maxElements,deleteCB) {
            this.max = maxElements;
            this.dict = {}; //<key,<value,pointer to list>>
            this.list = new peer5.core.dataStructures.DoublyLinkedList(); //keyX <=> keyY <=> keyZ
            this.deleteCB = deleteCB;
        },

        set:function(key,value){
            peer5.debug("LRU.set with key: " + key);
            if(this.dict[key]) //already have this key
                this._delete(key); //deleting the old element matching this key - without cb since it causes a loop of set/delete
            this.list.insert(key);
            this.dict[key] = {value:value,p:this.list.tail}; //the most recent element
            if(this.list.length > this.max){
                //delete the lru element
                var lruElem = this.list.head;
                this._delete(lruElem.value,this.deleteCB); //value of the list elements are the keys in dictionary
            }
        },

        get:function(key){
            peer5.debug("LRU.get with key: " + key);
            if(this.dict[key]){
                var listElem = this.dict[key].p;
                if(listElem == this.list.tail) //already most recent
                    return this.dict[key].value;
                this.list.delete(listElem);
                this.list.insert(key); //(most recent)
                this.dict[key].p = this.list.tail;
                return this.dict[key].value;
            }else{
                return false;
            }
        },
        /** @private functions*/
        _delete:function(key,cb){
            peer5.debug("removing key " + key + " from lru");
            var delElem = this.dict[key];
            this.list.delete(delElem.p);
            delete this.dict[key];
            if(cb)
                cb(key,delElem.value);
        }
    })
})();
