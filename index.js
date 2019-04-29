$(function () {
    var socket = io();
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

    /**
     * Function in response to a request to host a game. Will either permit hosting and set up necessary view and data or deny and notify user.
     * @param {boolean} allowed - A boolean sent by the server indicating permission to host a game
     */
    socket.on('host', function (allowed) {
        if (allowed) {
            $('#host-container').removeClass('d-none');
            $('#init-container').addClass('d-none');
            hosting = true;
            playing = true;
            show_alert('Successfully created the game!', 2500, $('#host-alert'), priorities.SUCCESS);
        } else {
            show_alert('There is currently another host. Try again later or join the current game.', 5000, $('#login-alert'), priorities.WARNING);
        }
    });

    /**
     * Function in response to a request to join a game. Will either permit joining and set up necessary view and data or deny and notify user.
     * @param {object} players - Object containing information of players currently in the game the user is attempting to join
     * @param {boolean} allowed - A boolean sent by the sever indicating permission to join a game
     */
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

    /**
     * Function in response to a new player joining the game. Will update game view to reflect new player and notify with an alert that the player has joined.
     * @param {string} username - The name of the user who joined the game
     */
    socket.on('newPlayer', function (username) {
        if (username === $('#username').html().substr(1) || !playing) {
            return;
        }
        if (hosting) {
            var row = $('<tr><th class="username-row" scope="row">' + username + '</th><td class="score">0</td><td class="buzz-place"></td><td><button class="btn btn-primary plus-btn" type="button">+1</button><button class="btn btn-danger minus-btn" type="button">-1</button></td></tr>');
            rows.push(row);
            $('#host-table > tbody:last-child').append(row);
            show_alert(username + ' joined the game!', 2500, $('#host-alert'), priorities.INFO);
        } else {
            var row = $('<tr><th class="username-row" scope="row">' + username + '</th><td class="score">0</td><td class="buzz-place"></td></tr>');
            rows.push(row);
            $('#player-table > tbody:last-child').append(row);
            show_alert(username + ' joined the game!', 2500, $('#join-alert'), priorities.INFO);
        }
    });

    /**
     * Function in response to the server updating a player's scores. Will update game view to reflect change in scores.
     * @param {string} username - Name of player whose score was updated
     * @param {number} score - New score value
     * @param {boolean} increased - Boolean to indicate whether the score was increased or decreased
     */
    socket.on('changeScore', function (username, score, increased) {
        rows.forEach(function (row) {
            if ($(row).find('.username-row').text() === username) {
                $(row).find('.score').html(score);
            }
        });
        if (username == name) {
            $('#score').html('Score: ' + score);
        }
        if (!hosting) {
            if (increased) {
                show_alert(username + ' got a point.', 3000, $('#join-alert'), priorities.INFO);
            } else {
                show_alert(username + ' lost a point.', 3000, $('#join-alert'), priorities.INFO);
            }
        }

    });

    /**
     * Function in response to a player buzzing in to answer a question. Will update game view to reflect updated buzz in ordering as well as notify the host that someone buzzed in.
     * @param {object} buzzers - object containing a mapping of player usernames who have buzzed in to their place in the buzz in ordering
     */
    socket.on('updateBuzzers', function (buzzers) {
        rows.forEach(function (row) {
            var username = $(row).find('.username-row').text();
            if (username in buzzers) {
                var place = $(row).find('.buzz-place');
                $(place).html(buzzers[username]);
            }
        });
        if (hosting) {
            show_alert('BUZZ', 1000, $('#host-alert'), priorities.DANGER);
        }
    });

    /**
     * Function in response to the server sending in a new question. Will display new question and answer to host and reset questiona and answer views for players.
     * @param {object} question - object that contains the question and corresponding answer
     */
    socket.on('nextQuestion', function (question) {
        rows.forEach(function (row) {
            $(row).find('.buzz-place').html('');
        });
        if (hosting) {
            $('#current-question-host').html(question['q']);
            $('#current-answer-host').html(question['a']);
        } else {
            $('#current-question').html('Hidden by Host');
            $('#current-answer').html('Hidden by Host');
        }
    });

    /**
     * Function in response to the host revealing the current question. Will update the player game views to show the current question
     * @param {string} question - The current question
     */
    socket.on('incomingQuestion', function (question) {
        if (hosting) {
            show_alert('Question Revealed', 2500, $('#host-alert'), priorities.SUCCESS);
        } else {
            show_alert('Question Revealed', 2500, $('#join-alert'), priorities.INFO);
            $('#current-question').html(question);
        }
    });

    /**
     * Function in response to the host revealing the answer to the current question. Will update the player game views to show the answer.
     * @param {string} answer - The answer to the current question
     */
    socket.on('incomingAnswer', function (answer) {
        if (hosting) {
            show_alert('Answer Revealed', 2500, $('#host-alert'), priorities.SUCCESS);
        } else {
            show_alert('Answer Revealed', 2500, $('#join-alert'), priorities.INFO);
            $('#current-answer').html(question);
        }
    });

    /**
     * Function in response to the host clearing the buzzers for the game. Will update the buzz in places on everyone's game view.
     */
    socket.on('clearBuzzers', function () {
        rows.forEach(function (row) {
            $(row).find('.buzz-place').html('');
        });
        show_alert('Buzzers have been cleared', 2500, $('#host-alert'), priorities.SUCCESS);
        show_alert('Buzzers have been cleared', 2500, $('#join-alert'), priorities.INFO);
        $('#buzz-btn').addClass('btn-danger').removeClass('btn-light');
    });

    /**
     * Function in response to the host of a game ending the game/leaving. Will reset every player's view as well as the host. 
     */
    socket.on('gameDeleted', function () {
        resetGame();
        show_alert('Game has ended', 5000, $('#login-alert'), priorities.INFO);
    });

    /**
     * Function in response to a player leaving a game. Will notify members of the game and reset the player's gameview.
     * @param {string} username - Name of the player who left the game
     */
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
                    if (hosting) {
                        show_alert(username + ' has left the game', 3000, $('#host-alert'), priorities.DANGER);
                    } else {
                        show_alert(username + ' has left the game', 3000, $('#join-alert'), priorities.DANGER);
                    }
                    return;
                }
            }
        }
    })

    /**
     * Function that sends request to the server for a user to host a game
     */
    $('#host-btn').click(function (e) {
        name = $('#username-input').val().trim();
        if (name === '') {
            show_alert('Invalid username', 5000, $('#login-alert'), priorities.WARNING);
        } else if (name.length > 14) {
            show_alert('Username must be less than 14 characters long', 5000, $('#login-alert'), priorities.WARNING);
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
        } else if (name.length > 14) {
            show_alert('Username must be less than 14 characters long', 5000, $('#login-alert'), priorities.WARNING);
        } else {
            socket.emit('join', name);
        }
        return false;
    });

    $('#next-btn').click(function (e) {
        socket.emit('nextQuestion');
    });

    $('#reveal-question-btn').click(function (e) {
        socket.emit('revealQuestion');
    })

    $('#reveal-answer-btn').click(function (e) {
        socket.emit('revealAnswer');
    })

    $('#buzz-btn').click(function (e) {
        var username = $('#username').html();
        username = username.substr(1);
        socket.emit('buzz-in', username);
        $('#buzz-btn').removeClass('btn-danger').addClass('btn-light');
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

    /**
    * Initializes the player's view of the game they join including other player information
    * @param {object} players 
    */
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


    /**
     * Resets the game information client side as well as resets the application view
     */
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
        $('#score').html('Score: 0');
        $('#current-question').html('Hidden by Host');

    }

    /**
     * Shows an alert for a specified amount of time
     * @param {string} message - The message to show in the alert box
     * @param {number} time - The time before hiding the alert
     * @param {object} element - Alert element passed into function
     * @param {number} priorityLevel - Level of priority to assign to alert
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
        }
    }
});