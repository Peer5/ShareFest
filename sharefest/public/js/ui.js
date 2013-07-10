var stupidMessage =
    ['Still loading',
        'Making some more coffee',
        'Watching my plants grow',
        'Trying to solve Goldbach problem',
        'Creating some random js code',
        'Waiting for something to happen',
        'Abracadabra',
        'Come on',
        'Wow you chose a big file',
        'zZzZZzZZz...',
        'Sorry!',
        'Sorry!!',
        'Sorry!!!',
        'Not sure if you want to share files, or stress test the platform',
        'Korim leze shagaat, korim leze tarefet',
        'You just wanna read all my nonsense, huh?',
        'OK, this is my last message for today. See ya!'
    ];


var stupidMsgId;
function describeNonsense() {
    $('#box-text').text(stupidMessage[stupidMsgId++] + '...');
}


function showErrorAlert(Msg) {
    $("#notificationDiv").attr('class', 'alert alert-error');
    $("#notificationDiv").html(Msg).show();
}

function showWarningAlert(Msg) {
    $("#notificationDiv").attr('class', 'alert');
    $("#notificationDiv").html(Msg).show();
}

function showSuccessAlert(Msg) {
    $("#notificationDiv").attr('class', 'alert alert-success');
    $("#notificationDiv").html(Msg).show();
}

function showInfoAlert(Msg) {
    $("#notificationDiv").attr('class', 'alert alert-info');
    $("#notificationDiv").html(Msg).show();
}

function hideAlert() {
    $('.alert-error').hide();
}

var nonsenseId;
function startNonsense() {
    stupidMsgId = 0
    nonsenseId = setInterval(describeNonsense, 2000);
}

function stopNonsense() {
    clearInterval(nonsenseId);
}

function disableUI() {
    $('#files').remove();
    $('#box-info').remove();

}