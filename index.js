hosting = false;
playing = false;
rows = [];

$(function () {
    $('.alert').alert()
    var socket = io();

    socket.on('host', function (allowed) {
        if (allowed) {
            $('#host-container').removeClass('d-none');
            $('#init-container').addClass('d-none');
            initialize_host();
            hosting = true;
            playing = true;
        } else {
            login_alert('There is currently another host. Try again later or join the current game.', 5000);
        }

    });
    socket.on('join', function (players, allowed) {
        if (allowed) {
            $('#join-container').removeClass('d-none');
            $('#init-container').addClass('d-none');
            playing = true;
            initialize_join(players);
        } else {
            login_alert('There was a problem with joining the game. Try again later or go outside.', 5000);
        }
    });

    socket.on('newPlayer', function (name) {
        if(name === $('#username').html().substr(1) || !playing){
            return;
        }
        if (hosting) {
            var row = $('<tr><th class="username-row" scope="row">' + name + '</th><td class="score">0</td><td class="buzz-place">0</td><td><button class="btn btn-primary plus-btn" type="button">+1</button><button class="btn btn-danger minus-btn" type="button">-1</button></td></tr>');
            rows.push(row);
            $('#host-table > tbody:last-child').append(row);
        } else {
            var row = $('<tr><th class="username-row" scope="row">' + name + '</th><td class="score">0</td><td class="buzz-place">0</td></tr>');
            rows.push(row);
            $('#player-table > tbody:last-child').append(row);
        }
    });

    socket.on('changeScore', function (name, score) {
        rows.forEach(function (row) {
            if ($(row).find('.username-row').text() === name) {
                $(row).find('.score').html(score);
            }
        });
    });

    socket.on('updateBuzzers', function (buzzers) {
        rows.forEach(function (row) {
            var place = $(row).find('.buzz-place');
            var name = $(row).find('.username-row').text();
            console.log($(buzzers));
            $(place).html(buzzers[name]);
        });
    });

    $('#host-btn').click(function (e) {
        let username = $('#username-input').val().trim();
        if (username === '') {
            login_alert('Invalid username', 5000);
        } else {
            socket.emit('host', $('#username-input').val());
        }
        return false;
    });
    $('#join-btn').click(function (e) {
        let username = $('#username-input').val().trim();
        if (username === '') {
            login_alert('Invalid username', 5000);
        } else {
            socket.emit('join', username);
        }
        return false;
    });

    $('#buzz-btn').click(function (e) {
        var username = $('#username').html();
        username = username.substr(1);
        socket.emit('buzz-in', username);
    });

    $('#reset-buzz-btn').click(function (e) {
        socket.emit('resetBuzzIn');
    });

    $('body').on('click', '.plus-btn', function () {
        var username = $(this).closest('tr').find('.username-row').text();
        socket.emit('incrementScore', username);
        return false;
    });
    $('body').on('click', '.minus-btn', function () {
        var username = $(this).closest('tr').find('.username-row').text();
        socket.emit('decrementScore', username);
        return false;
    });
});

function initialize_join(players) {
    $('#username').text('@' + $('#username-input').val());
    var table = hosting ? $('#host-table > tbody:last-child') : ('#player-table > tbody:last-child');
    console.log($(players));
    for(var player in players){
        if(hosting){
            var row = $('<tr><th class="username-row" scope="row">' + player + '</th><td class="score">' + players[player] + '</td><td class="buzz-place">0</td><td><button class="btn btn-primary plus-btn" type="button">+1</button><button class="btn btn-danger minus-btn" type="button">-1</button></td></tr>');
            rows.push(row);
            $(table).append(row)
        } else{
            var row = $('<tr><th class="username-row" scope="row">' + player + '</th><td class="score">' + players[player] + '</td><td class="buzz-place">0</td></tr>');
            rows.push(row);
            $(table).append(row);
        }
    }
}

function initialize_host() {

}

/*
 * This function shows an alert on the login page
 * @param message - The message to show in the alert box
 * @param time - The time before hiding the alert
 * @return null
 */
function login_alert(message, time) {
    $('#host-warning').html(message);
    $('#host-warning').addClass('show');
    setTimeout(function () { $('#host-warning').removeClass('show') }, time);
}