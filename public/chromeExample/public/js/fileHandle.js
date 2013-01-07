/**
 * Created with JetBrains WebStorm.
 * User: Shachar
 * Date: 06/01/13
 * Time: 10:45
 * To change this template use File | Settings | File Templates.
 */
function handleFileSelect(evt) {
    var file = evt.target.files[0]; // FileList object
    var reader = new FileReader();
    // Closure to capture the file information.
    reader.onload = (function(theFile) {
//                        var Buffer = theFile;
        return function(e) {
            // Render thumbnail.
            var span = document.createElement('span');
            span.innerHTML = ['<img class="thumb" src="', e.target.result,
                '" title="', escape(theFile.name), '"/>'].join('');
            document.getElementById('list').insertBefore(span, null);
            $('data-channel-blob').toSend = e.target.result;

        };
    })(file);
    reader.readAsDataURL(file);
}

