$(function () {
    var code = -1;
    var rows = [];
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
     * Function in response to the host of a game ending the game/leaving. Will reset every player's view as well as the host. 
     */
    socket.on('gameDeleted', function () {
        window.location.href = ('/');
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
            if (username in buzzers) {
                var place = $(row).find('.buzz-place');
                $(place).html(buzzers[username]);
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
    $('#next-btn').click(function (e) {
        socket.emit('nextQuestion', code);
        socket.emit('resetBuzzIn', code);
    });

    /**
     * Function that sends a request to the server to reveal the current question to all players
     */
    $('#reveal-question-btn').click(function (e) {
        socket.emit('revealQuestion', code);
    });

    /**
     * Function that sends a request to the server to reveal the answer to the current question to all players
     */
    $('#reveal-answer-btn').click(function (e) {
        socket.emit('revealAnswer', code);
    });

    /**
     * Function that sends a request to the server to reset the buzz ins
     */
    $('#reset-buzz-btn').click(function (e) {
        socket.emit('resetBuzzIn', code);
    });

    /**
     * Function that sends a request to the server to end the current game
     */
    $('#end-game-btn').click(function (e) {
        socket.emit('deleteGame', code);
    });

});