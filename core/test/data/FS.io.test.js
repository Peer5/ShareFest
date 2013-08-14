(function () {
    describe("FSio tests", function () {

        it('some init stuff', function() {
            peer5.setLogLevel(5);
        });

        it('create and remove a resource', function () {
            var resourceId = "test.txt";
            var createFlag = null;
            var removeFlag = null;
            peer5.core.data.FSio.createResource(resourceId,function(succ){createFlag = succ});
            waitsFor(function(){return createFlag!=null},'FS.io.createResource didnt finish on time',1000);
            runs(function(){
                console.log("createResource finished and was successful - " + createFlag);
                expect(createFlag).toEqual(true);
                peer5.core.data.FSio.removeResource(resourceId,function(succ){removeFlag = succ});
            })
            waitsFor(function(){return removeFlag!=null},'FS.io.removeResource didnt finish on time',1000);
            runs(function(){
                console.log("removeResource finished and was successful - " + removeFlag);
                expect(removeFlag).toEqual(true);
            });
        });

        it('write 1 chunk of data', function () {
            var resourceId = "test.txt";
            var createFlag = null;
            var removeFlag = null;
            var writeFlag = null;
            peer5.core.data.FSio.createResource(resourceId,function(succ){createFlag = succ});
            waitsFor(function(){return createFlag!=null},'FSio.createResource didnt finish on time',1000);
            runs(function(){
//                console.log("createResource finished and was successful - " + createFlag);
                expect(createFlag).toEqual(true);
                peer5.core.data.FSio.write(resourceId,new Blob(["lorem ipsum"]),0,function(succ){writeFlag = succ})
            })
            waitsFor(function(){return writeFlag!=null},'FSio.write didnt finish on time',1000);

            runs(function(){
                console.log("write finished and was successful - " + writeFlag);
                expect(writeFlag).toEqual(true);
                peer5.core.data.FSio.removeResource(resourceId,function(succ){removeFlag = succ});
            })
            waitsFor(function(){return removeFlag!=null},'FSio.removeResource didnt finish on time',1000);

            runs(function(){
//                console.log("removeResource finished and was successful - " + createFlag);
                expect(removeFlag).toEqual(true);
            });
        });

        it('write several chunks of data', function () {
            var resourceId = "test.txt";
            var createFlag = null;
            var removeFlag = null;
            var writeFlag = 0;
            var numOfChunks = 10;
            peer5.core.data.FSio.createResource(resourceId,function(succ){createFlag = succ});
            waitsFor(function(){return createFlag!=null},'FSio.createResource didnt finish on time',1000);
            runs(function(){
//                console.log("createResource finished and was successful - " + createFlag);
                expect(createFlag).toEqual(true);
                for(var i=0;i<numOfChunks;++i){
                    peer5.core.data.FSio.write(resourceId,new Blob(["lorem ipsum"]),0,function(succ){
                        if(succ) writeFlag++;
                        console.log("writing has return " + succ + " writeFlag= " + writeFlag);
                    });
                    }
            });
            waitsFor(function(){return writeFlag==(numOfChunks)},'FSio.write didnt finish on time',1000);

            runs(function(){
                console.log("write finished and was successful - " + writeFlag);
                expect(writeFlag).toEqual(numOfChunks);
                peer5.core.data.FSio.removeResource(resourceId,function(succ){removeFlag = succ});
            })
            waitsFor(function(){return removeFlag!=null},'FSio.removeResource didnt finish on time',1000);

            runs(function(){
//                console.log("removeResource finished and was successful - " + createFlag);
                expect(removeFlag).toEqual(true);
            });
        });

        it('write read', function () {
            var resourceId = "test.txt";
            var createFlag = null;
            var removeFlag = null;
            var writeFlag = null;
            var readFlag = null;
            var readData = null;
            var writeData = new Uint8Array([0,1,1,2,3,5,8,13]);
            peer5.core.data.FSio.createResource(resourceId,function(succ){createFlag = succ});
            waitsFor(function(){return createFlag!=null},'FSio.createResource didnt finish on time',1000);
            runs(function(){
//                console.log("createResource finished and was successful - " + createFlag);
                expect(createFlag).toEqual(true);
                peer5.core.data.FSio.write(resourceId,new Blob([writeData]),0,function(succ){writeFlag = succ})
            })
            waitsFor(function(){return writeFlag!=null},'FSio.write didnt finish on time',1000);

            runs(function(){
//                console.log("write finished and was successful - " + writeFlag);
                expect(writeFlag).toEqual(true);
                peer5.core.data.FSio.read(resourceId,0,writeData.length,function(succ,data){
                    readFlag = succ;
                    readData = new Uint8Array(data);
                })
            })

            waitsFor(function(){return readFlag!=null},'FSio.read didnt finish on time',1000);

            runs(function(){
                console.log("read finished and was successful - " + readFlag);
                expect(readFlag).toEqual(true);
                expect(readData).toEqual(writeData);
                peer5.core.data.FSio.removeResource(resourceId,function(succ){removeFlag = succ});
            })

            waitsFor(function(){return removeFlag!=null},'FSio.removeResource didnt finish on time',1000);
            runs(function(){
                console.log("removeResource finished and was successful - " + removeFlag);
                expect(removeFlag).toEqual(true);
            });
        });

        it('write 1 chunk of data and save', function () {
            var resourceId = "test.txt";
            var createFlag = null;
            var removeFlag = null;
            var writeFlag = null;
            var urlFlag = null;
            peer5.core.data.FSio.createResource(resourceId,function(succ){createFlag = succ});
            waitsFor(function(){return createFlag!=null},'FSio.createResource didnt finish on time',1000);
            runs(function(){
//                console.log("createResource finished and was successful - " + createFlag);
                expect(createFlag).toEqual(true);
                peer5.core.data.FSio.write(resourceId,new Blob(["lorem ipsum"]),0,function(succ){writeFlag = succ})
            })
            waitsFor(function(){return writeFlag!=null},'FSio.write didnt finish on time',1000);

            runs(function(){
//                console.log("write finished and was successful - " + writeFlag);
                expect(writeFlag).toEqual(true);
                peer5.core.data.FSio.createObjectURL(resourceId,function(succ,url){
                    urlFlag = succ;
                    var a = document.createElement('a');
                    a.download = resourceId;
                    a.setAttribute('href', url);
                    document.body.appendChild(a);
                    a.click();
                })
            })
            waitsFor(function(){return urlFlag!=null},'FSio.createObjectUrl didnt finish on time',1000);

            runs(function(){
                console.log("creating object url was successful - " + urlFlag);
                expect(urlFlag).toEqual(true);
                peer5.core.data.FSio.removeResource(resourceId,function(succ){removeFlag = succ});
            })

            waitsFor(function(){return removeFlag!=null},'FSio.removeResource didnt finish on time',1000);
            runs(function(){
//                console.log("removeResource finished and was successful - " + createFlag);
                expect(removeFlag).toEqual(true);
            });
        });
    });
})();