window.addEventListener("dragover", function (e) {
    e = e || event;
    e.dataTransfer.dropEffect = 'none';
    e.preventDefault();
}, false);
window.addEventListener("drop", function (e) {
    e = e || event;
    e.dataTransfer.dropEffect = 'none';
    e.preventDefault();
}, false);

$(document).ready(function () {
    var dropbox = document.getElementById("dropbox")

    // init event handlers
    dropbox.addEventListener("dragenter", dragEnter, false);
    dropbox.addEventListener("dragexit", dragExit, false);
    dropbox.addEventListener("dragover", dragOver, false);
    dropbox.addEventListener("drop", drop, false);

    // init the widgets
//	$("#progressbar").progressbar();
});


function disableDrag() {
    var dropbox = document.getElementById("dropbox")

    dropbox.removeEventListener("dragenter", dragEnter);
    dropbox.removeEventListener("dragexit", dragExit);
    dropbox.removeEventListener("dragover", dragOver);
    dropbox.removeEventListener("drop", drop);
}

function dragEnter(evt) {
    evt.stopPropagation();
    evt.preventDefault();
    $('.dragdrop')[0].style.opacity = 0.9;
    $('.dragdrop')[0].style.borderStyle = 'dashed';
    $('.dragdrop')[0].style.borderWidth = '5px';


    var x = 0;
    var y = 15;
    var speed = 5;

    function animate() {

        reqAnimFrame = window.mozRequestAnimationFrame ||
            window.webkitRequestAnimationFrame ||
            window.msRequestAnimationFrame ||
            window.oRequestAnimationFrame
        ;

        reqAnimFrame(animate);

        x += speed;

        if (x <= 0 || x >= 475) {
            speed = -speed;
        }

        draw();
    }


    function draw() {
        var canvas = document.getElementById("cnvs");
        var context = canvas.getContext("2d");

        context.clearRect(0, 0, 500, 170);
        context.fillStyle = "#ff00ff";
        context.fillRect(x, y, 25, 25);
    }

    animate();

}

function dragExit(evt) {
    evt.stopPropagation();
    evt.preventDefault();
    $('.dragdrop')[0].style.opacity = 0.8;
    $('.dragdrop')[0].style.borderStyle = 'solid';
    $('.dragdrop')[0].style.borderWidth = '2px';
}

function dragOver(evt) {
    evt.stopPropagation();
    evt.preventDefault();
}

function drop(evt) {
    evt.stopPropagation();
    evt.preventDefault();

    var files = evt.dataTransfer.files;
    console.log(files);
    var count = files.length;

    // Only call the handler if 1 or more files was dropped.
    addFiles(files);

    if (count > 0)
        handleFiles(files);
    else {
        $('.dragdrop')[0].style.borderStyle = 'solid';
        $('.dragdrop')[0].style.borderWidth = '2px';
    }
}


function handleFiles(files) {

//	var file = files[0];
//
//	var reader = new FileReader();
//
//	// init the reader event handlers
//	reader.onprogress = handleReaderProgress;
//	reader.onloadend = handleReaderLoadEnd;
//
//	// begin the read operation
//	reader.readAsDataURL(file);
}

function handleReaderProgress(evt) {
    if (evt.lengthComputable) {
        var loaded = (evt.loaded / evt.total);

//		$("#progressbar").progressbar({ value: loaded * 100 });
    }
}

function handleReaderLoadEnd(evt) {
//	$("#progressbar").progressbar({ value: 100 });

    var img = document.getElementById("preview");
    img.src = evt.target.result;
}