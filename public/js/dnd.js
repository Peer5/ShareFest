window.addEventListener("dragover",function(e){
    e = e || event;
    e.dataTransfer.dropEffect = 'none';
    e.preventDefault();
},false);
window.addEventListener("drop",function(e){
    e = e || event;
    e.dataTransfer.dropEffect = 'none';
    e.preventDefault();
},false);

$(document).ready(function() {
	var dropbox = document.getElementById("dropbox")

	// init event handlers
	dropbox.addEventListener("dragenter", dragEnter, false);
	dropbox.addEventListener("dragexit", dragExit, false);
	dropbox.addEventListener("dragover", dragOver, false);
	dropbox.addEventListener("drop", drop, false);

	// init the widgets
//	$("#progressbar").progressbar();
});

function dragEnter(evt) {
	evt.stopPropagation();
	evt.preventDefault();
    $('.dragdrop')[0].style.opacity = 0.9;
}

function dragExit(evt) {
	evt.stopPropagation();
	evt.preventDefault();
    $('.dragdrop')[0].style.opacity = 0.8;
}

function dragOver(evt) {
	evt.stopPropagation();
	evt.preventDefault();
}

function drop(evt) {
	evt.stopPropagation();
	evt.preventDefault();

	var files = evt.dataTransfer.files;
	var count = files.length;

	// Only call the handler if 1 or more files was dropped.
    addFiles(files);

    if (count > 0)
		handleFiles(files);
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