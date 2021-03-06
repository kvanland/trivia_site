$(function () {
    var code = -1;
    var rows = [];
    // eslint-disable-next-line no-undef
    var socket = io('/host');

    socket.emit('create game');

    /**
     * Function in response to the server sending the game code associated with this instance of the game
     * @param {number} code - the game code associated with this host's instance of the game
     */
    socket.on('game code', function (gameCode) {
        code = gameCode;
        $('#game-code').html("Game Code: " + code);
        show_alert('Successfully created the game!', 2500, $('#host-alert'), priorities.SUCCESS);
    });

    /**
     * Function in response to a new player joining the game. Will update game view to reflect new player and notify with an alert that the player has joined.
     * @param {string} username - The name of the user who joined the game
     */
    socket.on('newPlayer', function (username) {
        var row = $('<tr><th class="username-row" scope="row">' + username + '</th><td class="score">0</td><td class="buzz-place"></td><td><button class="btn btn-primary plus-btn" type="button">+1</button><button class="btn btn-danger minus-btn" type="button">-1</button></td></tr>');
        rows.push(row);
        $('#host-table > tbody:last-child').append(row);
        show_alert(username + ' joined the game!', 2500, $('#host-alert'), priorities.INFO);
    });

    /**
     * Function in response to a player leaving a game. Will notify members of the game and reset the player's gameview.
     * @param {string} username - Name of the player who left the game
     */
    socket.on('removePlayer', function (username) {
        let length = rows.length;
        for (var i = 0; i < length; i++) {
            var row = rows[i];
            if ($(row).find('.username-row').text() === username) {
                $(row).remove();
                rows.splice(i, 1);
                show_alert(username + ' has left the game', 3000, $('#host-alert'), priorities.DANGER);
                return;
            }
        }
    });

    /**
     * Function in response to the server sending in a new question. Will display new question and answer to host
     * @param {object} question - object that contains the question and corresponding answer
     */
    socket.on('nextQuestion', function (question) {
        rows.forEach(function (row) {
            $(row).find('.buzz-place').html('');
        });
        $('#current-question').html(question['q']);
        $('#current-answer').html(question['a']);
        $('#reveal-question-btn').prop('disabled', false);
        $('#reveal-answer-btn').prop('disabled', true);
    });

    /**
     * Function in response to the host revealing the current question
     */
    socket.on('incomingQuestion', function () {
        show_alert('Question Revealed', 2500, $('#host-alert'), priorities.SUCCESS);
        
    });

    /**
     * Function in response to the host revealing the answer to the current question
     */
    socket.on('incomingAnswer', function () {
        show_alert('Answer Revealed', 2500, $('#host-alert'), priorities.SUCCESS);
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
        show_alert('BUZZ', 1000, $('#host-alert'), priorities.DANGER);
    });

    /**
     * Function in response to the host clearing the buzzers for the game. Will update the buzz in places on everyone's game view.
     */
    socket.on('clearBuzzers', function () {
        rows.forEach(function (row) {
            $(row).find('.buzz-place').html('');
        });
        show_alert('Buzzers have been cleared', 2500, $('#host-alert'), priorities.SUCCESS);
    });

    /**
     * Function in response to the server updating a player's scores. Will update game view to reflect change in scores.
     * @param {object} obj - contains the information to update a player's score
     * @param {string} obj.username - Name of player whose score was updated
     * @param {number} obj.score - New score value
     */
    socket.on('changeScore', function (obj) {
        var username = obj['username'];
        var score = obj['score'];
        rows.forEach(function (row) {
            if ($(row).find('.username-row').text() === username) {
                $(row).find('.score').html(score);
            }
        });
    });

    /**
     * Binds function to +1 buttons that tells server to increase a player's score
     */
    $('body').on('click', '.plus-btn', function () {
        var username = $(this).closest('tr').find('.username-row').text();
        socket.emit('incrementScore', {
            'username': username,
            'code': code
        });
        return false;
    });

    /**
     * Binds function to the -1 buttons that tells the server to decrease a player's score
     */
    $('body').on('click', '.minus-btn', function () {
        var username = $(this).closest('tr').find('.username-row').text();
        socket.emit('decrementScore', {
            'username': username,
            'code': code
        });
        return false;
    });

    /**
     * Function that sends a request to the server for the next question 
     */
    $('#next-btn').click(function () {
        socket.emit('nextQuestion', code);
    });

    /**
     * Function that sends a request to the server to reveal the current question to all players
     */
    $('#reveal-question-btn').click(function () {
        socket.emit('revealQuestion', 
        {
            code: code,
            question: $('#current-question').html()
        });
        socket.emit('resetBuzzIn', code);
        $('#reveal-question-btn').prop('disabled', true);
        $('#reveal-answer-btn').prop('disabled', false);
    });

    /**
     * Function that sends a request to the server to reveal the answer to the current question to all players
     */
    $('#reveal-answer-btn').click(function () {
        socket.emit('revealAnswer', 
        {
            code : code,
            answer: $('#current-answer').html()
        });
        socket.emit('resetBuzzIn', code);
        $('#reveal-answer-btn').prop('disabled', true);
    });

    /**
     * Function that sends a request to the server to end the current game
     */
    $('#end-game-btn').click(function () {
        window.location.href = ('/');
    });

    /**
     * Toggles dark mode
     */
    $('#dark-switch').click(function() {
        if($('#dark-switch').is(':checked')) {
            $('body').addClass("bg-dark");
            $('body').addClass("text-white");
            $('tr').addClass("text-white");
            $('#question-div').removeClass('bg-dark');
            $('#answer-div').removeClass('bg-dark');
            $('#question-div').addClass('bg-secondary');
            $('#answer-div').addClass('bg-secondary');
            $('thead').removeClass('thead-dark');
            $('thead').addClass('thead-light');
        } else {
            $('body').removeClass("bg-dark");
            $('body').removeClass("text-white");
            $('tr').removeClass("text-white");
            $('#question-div').addClass('bg-dark');
            $('#answer-div').addClass('bg-dark');
            $('#question-div').removeClass('bg-secondary');
            $('#answer-div').removeClass('bg-secondary');
            $('thead').addClass('thead-dark');
            $('thead').removeClass('thead-light');
        }
    });

    /**
     * Binds a,s,d to next question, reveal question, reveal answer
     */
    $(document).on('keypress', function(e){
        if (e.key == 'a') {
            $('#next-btn').click();
        } else if (e.key == 's') {
            $('#reveal-question-btn').click();
        } else if (e.key == 'd') {
            $('#reveal-answer-btn').click();
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
