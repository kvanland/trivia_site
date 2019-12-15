$(function () {
    $('#host-btn').click(function () {
        window.location.href = '/host.html';
    });

    $('#join-btn').click(function () {
        window.location.href = '/join.html';
    });

    $('#plus-btn').click(function () {
        let currentScore = document.getElementById('score-example').innerHTML;
        document.getElementById('score-example').innerHTML = ++currentScore;
    });

    $('#minus-btn').click(function () {
        let currentScore = document.getElementById('score-example').innerHTML;
        document.getElementById('score-example').innerHTML = --currentScore;
    });
    $('#dark-switch').click(function() {
        if($('#dark-switch').is(':checked')) {
            $('body').addClass("bg-dark");
            $('body').addClass("text-white");
            $('tr').addClass("text-white");
            $('#how-to-play-link').css('color', 'white');
        } else {
            $('body').removeClass("bg-dark");
            $('body').removeClass("text-white");
            $('tr').removeClass("text-white");
            $('#how-to-play-link').css('color', 'black');
        }
    });
});
