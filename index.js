var hosting = false;
var playing = false;
var rows = [];
var name = '';

let priorities = {
    'PRIMARY': 0,
    'SECONDARY': 1,
    'SUCCESS': 2,
    'DANGER': 3,
    'WARNING': 4,
    'INFO': 5,
    'LIGHT': 6,
    'DARK': 7

}

$(function () {
    $('.alert').alert()
    var socket = io();

    socket.on('host', function (allowed) {
        if (allowed) {
            $('#host-container').removeClass('d-none');
            $('#init-container').addClass('d-none');
            hosting = true;
            playing = true;
            show_alert('Successfully created the game!', 2500, $('#host-alert'), priorities.SUCCESS);
        } else {
            show_alert('There is currently another host. Try again later or join the current game.', 5000, $('#login-warning'), priorities.WARNING);
        }

    });
    socket.on('join', function (players, allowed) {
        if (allowed) {
            $('#join-container').removeClass('d-none');
            $('#init-container').addClass('d-none');
            playing = true;
            initialize_join(players);
            show_alert('Successfully joined the game!', 2500, $('#join-alert'), priorities.SUCCESS);
        } else {
            show_alert('There was a problem with joining the game. Try again later or go outside.', 5000, $('#login-warning'), priorities.WARNING);
        }
    });

    socket.on('newPlayer', function (name) {
        if (name === $('#username').html().substr(1) || !playing) {
            return;
        }
        if (hosting) {
            var row = $('<tr><th class="username-row" scope="row">' + name + '</th><td class="score">0</td><td class="buzz-place">0</td><td><button class="btn btn-primary plus-btn" type="button">+1</button><button class="btn btn-danger minus-btn" type="button">-1</button></td></tr>');
            rows.push(row);
            $('#host-table > tbody:last-child').append(row);
            show_alert(name + ' joined the game!', 2500, $('#host-alert'), priorities.INFO);
        } else {
            var row = $('<tr><th class="username-row" scope="row">' + name + '</th><td class="score">0</td><td class="buzz-place">0</td></tr>');
            rows.push(row);
            $('#player-table > tbody:last-child').append(row);
            show_alert(name + ' joined the game!', 2500, $('#join-alert'), priorities.INFO);
        }
    });

    socket.on('changeScore', function (name, score, increased) {
        rows.forEach(function (row) {
            if ($(row).find('.username-row').text() === name) {
                $(row).find('.score').html(score);
            }
        });
        if(!hosting){
            if(increased){
                show_alert(name + ' got a point.', 3000, $('#join-alert'), priorities.INFO);
            } else{
                show_alert(name + ' lost a point.', 3000, $('#join-alert'), priorities.INFO);
            }
        }
        
    });

    socket.on('updateBuzzers', function (buzzers) {
        rows.forEach(function (row) {
            var place = $(row).find('.buzz-place');
            var name = $(row).find('.username-row').text();
            $(place).html(buzzers[name]);
        });
    });

    socket.on('nextQuestion', function (question) {
        if (hosting) {
            $('#current-question-host').html(question['q']);
            $('#current-answer-host').html(question['a']);
        } else {
            $('#current-quesiton').html('Hidden by Host');
        }
    });

    socket.on('incomingQuestion', function (question) {
        if (hosting) {
            show_alert('Question Revealed', 2500, $('#host-alert'), priorities.SUCCESS);
        } else {
            $('#current-question').html(question['q']);
        }
    });

    socket.on('clearBuzzers', function () {
        rows.forEach(function (row) {
            $(row).find('.buzz-place').html(0);
        });
        show_alert('Buzzers have been cleared', 2500, $('#host-alert'), priorities.SUCCESS);
        show_alert('Buzzers have been cleared', 2500, $('#join-alert'), priorities.INFO);
    });

    socket.on('gameDeleted', function (name) {
        resetGame();
        show_alert('Game has ended', 5000, $('#login-alert'), priorities.INFO);
    });

    socket.on('removePlayer', function (username) {
        if (username === name) {
            resetGame();
            show_alert('You have left the game', 5000, $('#login-alert'), priorities.DANGER);
        } else {
            let length = rows.length;
            for (var i = 0; i < length; i++) {
                var row = rows[i];
                if ($(row).find('.username-row').text() === username) {
                    $(row).remove();
                    rows.splice(i, 1);
                    if(hosting){
                        show_alert(username + ' has left the game', 3000, $('#host-alert'), priorities.DANGER);
                    } else {
                        show_alert(username + ' has left the game', 3000, $('#join-alert'), priorities.DANGER);
                    }
                    return;
                }
            }
        }
    })

    $('#host-btn').click(function (e) {
        name = $('#username-input').val().trim();
        if (name === '') {
            show_alert('Invalid username', 5000, $('#login-alert'), priorities.WARNING);
        } else {
            name = $('#username-input').val();
            socket.emit('host', name);
        }
        return false;
    });

    $('#join-btn').click(function (e) {
        name = $('#username-input').val().trim();
        if (name === '') {
            show_alert('Invalid username', 5000, $('#login-alert'), priorities.WARNING);
        } else {
            socket.emit('join', name);
        }
        return false;
    });

    $('#next-btn').click(function (e) {
        socket.emit('nextQuestion');
    });

    $('#reveal-btn').click(function (e) {
        socket.emit('revealQuestion');
    })

    $('#buzz-btn').click(function (e) {
        var username = $('#username').html();
        username = username.substr(1);
        socket.emit('buzz-in', username);
    });

    $('#reset-buzz-btn').click(function (e) {
        socket.emit('resetBuzzIn');
    });

    $('#leave-btn').click(function (e) {
        socket.emit('leaveGame', $('#username-input').val());
    });

    $('#end-game-btn').click(function (e) {
        socket.emit('deleteGame');
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
    var table = hosting ? $('#host-table > tbody') : ('#player-table > tbody');
    for (var player in players) {
        if (hosting) {
            var row = $('<tr><th class="username-row" scope="row">' + player + '</th><td class="score">' + players[player] + '</td><td class="buzz-place">0</td><td><button class="btn btn-primary plus-btn" type="button">+1</button><button class="btn btn-danger minus-btn" type="button">-1</button></td></tr>');
            rows.push(row);
            $(table).append(row)
        } else {
            var row = $('<tr><th class="username-row" scope="row">' + player + '</th><td class="score">' + players[player] + '</td><td class="buzz-place">0</td></tr>');
            rows.push(row);
            $(table).append(row);
        }
    }
}

function resetGame() {
    if (hosting) {
        $('#host-container').addClass('d-none');
        $('#init-container').removeClass('d-none');
    } else {
        $('#join-container').addClass('d-none');
        $('#init-container').removeClass('d-none');
    }
    hosting = false;
    playing = false;
    rows = [];
    name = '';
    $('#host-table > tbody').html('');
    $('#player-table > tbody').html('');
    $('#current-question-host').html('');
    $('#current-answer-host').html('');
    $('#current-question').html('Hidden by Host');
    
}

/*
 * This function shows an alert
 * @param message - The message to show in the alert box
 * @param time - The time before hiding the alert
 * @param element - Alert element passed into function
 * @param priorityLevel - Level of priority to assign to alert
 * @return null
 */
function show_alert(message, time, element, priorityLevel) {
    switch (priorityLevel) {
        case priorities.PRIMARY:
            $(element).html(message);
            $(element).addClass('show alert-primary');
            setTimeout(function () { $(element).removeClass('show alert-primary') }, time);
            break;
        case priorities.SECONDARY:
            $(element).html(message);
            $(element).addClass('show alert-secondary');
            setTimeout(function () { $(element).removeClass('show alert-secondary') }, time);
            break;
        case priorities.SUCCESS:
            $(element).html(message);
            $(element).addClass('show alert-success');
            setTimeout(function () { $(element).removeClass('show alert-success') }, time);
            break;
        case priorities.DANGER:
            $(element).html(message);
            $(element).addClass('show alert-danger');
            setTimeout(function () { $(element).removeClass('show alert-danger') }, time);
            break;
        case priorities.WARNING:
            $(element).html(message);
            $(element).addClass('show alert-warning');
            setTimeout(function () { $(element).removeClass('show alert-warning') }, time);
            break;
        case priorities.INFO:
            $(element).html(message);
            $(element).addClass('show alert-info');
            setTimeout(function () { $(element).removeClass('show alert-info') }, time);
            break;
        case priorities.DARK:
            $(element).html(message);
            $(element).addClass('show alert-dark');
            setTimeout(function () { $(element).removeClass('show alert-dark') }, time);
            break;
    }
}
