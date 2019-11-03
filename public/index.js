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
});
