$(function () {
    // eslint-disable-next-line no-undef
    var socket = io('/join');
    var rows = []
    var code = -1;
    var username = '';

    /**
     * Function in response to a denial to join a game from the server
     * @param {string} reason - The reason for the server denying the join request
     */
    socket.on('invalid join', function (reason) {
        show_alert(reason, 5000, $('#join-alert'), priorities.DANGER);
    });

    /**
     * Function in response to a request to join a game. Will either permit joining and set up necessary view and data or deny and notify user.
     * @param {object} players - Object containing information of players currently in the game the user is attempting to join
     */
    socket.on('valid join', function (players) {
        $('#join-container').removeClass('d-none');
        $('#init-container').addClass('d-none');
        code = $('#gamecode-input').val();
        username = $('#username-input').val().trim();
        initialize_join(players);
        show_alert('Successfully joined the game!', 2500, $('#join-alert'), priorities.SUCCESS);
    });

    /**
     * Function in response to the host of a game ending the game/leaving. Will reset every player's view as well as the host. 
     */
    socket.on('gameDeleted', function () {
        show_alert('Game has ended you will be redirected to the home page in 10 seconds...', 10000, $('#join-alert'), priorities.INFO);
        setTimeout(function(){
            window.location.href = '/';
        }, 10000);

    });

    /**
     * Function in response to the server sending in a new question. Will display new question and answer to host and reset questiona and answer views for players.
     * @param {object} question - object that contains the question and corresponding answer
     */
    socket.on('nextQuestion', function () {
        rows.forEach(function (row) {
            $(row).find('.buzz-place').html('');
        });
        $('#current-question').html('Hidden by Host');
        $('#current-answer').html('Hidden by Host');
    });

    /**
     * Function in response to the host revealing the current question. Will update the player game views to show the current question
     * @param {string} question - The current question
     */
    socket.on('incomingQuestion', function (question) {
        show_alert('Question Revealed', 2500, $('#join-alert'), priorities.INFO);
        $('#current-question').html(question);
        $('#buzz-btn').prop('disabled', false);
    });

    /**
     * Function in response to the host revealing the answer to the current question. Will update the player game views to show the answer.
     * @param {string} answer - The answer to the current question
     */
    socket.on('incomingAnswer', function (answer) {
        show_alert('Answer Revealed', 2500, $('#join-alert'), priorities.INFO);
        $('#current-answer').html(answer);
        $('#buzz-btn').prop('disabled', true);
    });

    /**
     * Function in response to a new player joining the game. Will update game view to reflect new player and notify with an alert that the player has joined.
     * @param {string} username - The name of the user who joined the game
     */
    socket.on('newPlayer', function (username) {
        if (username === $('#username').html().substr(1)) {
            return;
        }
        var row = $('<tr><th class="username-row" scope="row">' + username + '</th><td class="score">0</td><td class="buzz-place"></td></tr>');
        rows.push(row);
        $('#player-table > tbody:last-child').append(row);
        show_alert(username + ' joined the game!', 2500, $('#join-alert'), priorities.INFO);
    });

    /**
     * Function in response to a player buzzing in to answer a question. Will update game view to reflect updated buzz in ordering as well as notify the host that someone buzzed in.
     * @param {object} buzzers - object containing a mapping of player usernames who have buzzed in to their place in the buzz in ordering
     */
    socket.on('updateBuzzers', function (buzzers) {
        rows.forEach(function (row) {
            var username = $(row).find('.username-row').text();
            if (username in buzzers['players']) {
                var place = $(row).find('.buzz-place');
                $(place).html(buzzers['players'][username]);
            }
        });
    });

    /**
     * Function in response to the host clearing the buzzers for the game. Will update the buzz in places on everyone's game view.
     */
    socket.on('clearBuzzers', function () {
        rows.forEach(function (row) {
            $(row).find('.buzz-place').html('');
        });
        show_alert('Buzzers have been cleared', 2500, $('#join-alert'), priorities.INFO);
    });

    /**
     * Function in response to a player leaving a game. Will notify members of the game and reset the player's gameview.
     * @param {string} username - Name of the player who left the game
     */
    socket.on('removePlayer', function (name) {
        if (username === name) {
            window.location.href = ('/');
        } else {
            let length = rows.length;
            for (var i = 0; i < length; i++) {
                var row = rows[i];
                if ($(row).find('.username-row').text() === name) {
                    $(row).remove();
                    rows.splice(i, 1);
                    show_alert(name + ' has left the game', 3000, $('#join-alert'), priorities.DANGER);
                    return;
                }
            }
        }
    });

    /**
     * Function in response to the server updating a player's scores. Will update game view to reflect change in scores.
     * @param {object} obj - contains the information to update a player's score
     * @param {string} obj.username - Name of player whose score was updated
     * @param {number} obj.score - New score value
     * @param {boolean} obj.increment - Boolean to indicate whether the score was increased or decreased
     */
    socket.on('changeScore', function (obj) {
        var name = obj['username'];
        var score = obj['score'];
        var increment = obj['increment'];
        rows.forEach(function (row) {
            if ($(row).find('.username-row').text() === name) {
                $(row).find('.score').html(score);
            }
        });
        if (username == name) {
            $('#score').html('Score: ' + score);
        }
        if (increment) {
            show_alert(name + ' earned a point.', 3000, $('#join-alert'), priorities.INFO);
        } else {
            show_alert(name + ' lost a point.', 3000, $('#join-alert'), priorities.INFO);
        }

    });

    /**
     * Function that asks the server if the player can join the intended game
     */
    $('#join-btn').click(function () {
        var username = $('#username-input').val().trim();
        var gameCode = $('#gamecode-input').val();
        if (username.lenth > 14) {
            show_alert('The username must be less than 14 characters long', 2500, $('#init-alert'), priorities.WARNING);
        } else if (username == '') {
            show_alert('The username must be filled out', 2500, $('#init-alert'), priorities.WARNING);
        } else {
            socket.emit('join', {
                'username': username,
                'code': gameCode
            });
        }
    });

    /**
     * Function that sends a buzz in to the server
     */
    $('#buzz-btn').click(function () {
        socket.emit('buzz-in', {
            'username': username,
            'code': code
        });
        $('#buzz-btn').prop('disabled', true);
    });

    /**
     * Function that sends a request to the server to leave the current game
     */
    $('#leave-btn').click(function () {
        window.location.href = ('/');
    });

    /**
    * Initializes the player's view of the game they join including other player information
    * @param {object} players 
    */
    function initialize_join(players) {
        $('#username').text('@' + $('#username-input').val());
        var table = ('#player-table > tbody');
        for (var player in players) {
            var row = $('<tr><th class="username-row" scope="row">' + player + '</th><td class="score">' + players[player] + '</td><td class="buzz-place"></td></tr>');
            rows.push(row);
            $(table).append(row);
        }
    }

    /**
     * Toggles dark mode
     */
    $('#dark-switch').click(function() {
        if($('#dark-switch').is(':checked')) {
            $('body').addClass("bg-dark");
            $('body').addClass("text-white");
            $('tr').addClass("text-white");
            $('#question-answer-div').removeClass('bg-dark');
            $('#score-div').removeClass('bg-dark');
            $('#question-answer-div').addClass('bg-secondary');
            $('#score-div').addClass('bg-secondary');
            $('thead').removeClass('thead-dark');
            $('thead').addClass('thead-light');
        } else {
            $('body').removeClass("bg-dark");
            $('body').removeClass("text-white");
            $('tr').removeClass("text-white");
            $('#question-answer-div').removeClass('bg-secondary');
            $('#score-div').removeClass('bg-secondary');
            $('#question-answer-div').addClass('bg-dark');
            $('#score-div').addClass('bg-dark');
            $('thead').addClass('thead-dark');
            $('thead').removeClass('thead-light');
        }
    });

    /**
     * Binds the space bar to the buzz-btn
     */
    $(document).on('keypress' ,function(e){
        if(e.which == 32) {
            $('#buzz-btn').click();
        }
    });

});

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
