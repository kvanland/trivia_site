var express = require('express');
var app = express();
var http = require('http').createServer(app);
var io = require('socket.io')(http);

// Game Logic
var host = '';
var players = {};
var buzzers = {};
var buzzerPlace = 0;
var questions = [];
var questionsPlace = -1;

// Allows the server to serve static files such as index.js
app.use(express.static(__dirname));

// Server setup
app.get('/', function (req, res) {
    res.sendFile(__dirname + '/index.html');
});

io.on('connection', function (socket) {

    socket.on('host', function (name) {
        if (host === '') {
            host = name;
            fetchQuestions();
            socket.emit('host', true);
            const request = require('request');
            request('http://jservice.io/api/random?count=100', function (error, response, body) {
                if (!error && response.statusCode == 200) {
                    questions = JSON.parse(body);
                    processQuestions();
                    socket.emit('nextQuestion', questions[++questionsPlace]);
                }
            });

        } else {
            socket.emit('host', false);
        }
    });

    socket.on('join', function (name) {
        if (host === '' || name in players) {
            socket.emit('join', false);
        } else {
            players[name] = 0;
            socket.emit('join', players, true);
            io.emit('newPlayer', name);
        }
    });

    socket.on('incrementScore', function (name) {
        players[name] = players[name] + 1;
        io.emit('changeScore', name, players[name], true);

    });

    socket.on('decrementScore', function (name) {
        players[name] -= 1;
        io.emit('changeScore', name, players[name], false);
    });

    socket.on('buzz-in', function (name) {
        if (!(name in buzzers)) {
            buzzers[name] = ++buzzerPlace;
            io.emit('updateBuzzers', buzzers);

        }
    });

    socket.on('resetBuzzIn', function () {
        buzzers = {};
        buzzerPlace = 0;
        io.emit('clearBuzzers');
    });

    socket.on('nextQuestion', function () {
        io.emit('nextQuestion', questions[++questionsPlace]);
        if (questionsPlace == 99) {
            quesionsPlace = -1;
            fetchQuestions();
        }
    });

    socket.on('revealQuestion', function () {
        io.emit('incomingQuestion', questions[questionsPlace]['q']);
    });

    socket.on('revealAnswer', function() {
        io.emit('incomingAnswer', questions[questionsPlace]['a']);
    })

    socket.on('leaveGame', function (name) {
        delete players[name];
        delete buzzers[name];
        io.emit('removePlayer', name);
    });

    socket.on('deleteGame', function () {
        resetGame()
        io.emit('gameDeleted');
    });
});

function fetchQuestions() {
    const request = require('request');
    request('http://jservice.io/api/random?count=100', function (error, response, body) {
        if (!error && response.statusCode == 200) {
            questions = JSON.parse(body);
            processQuestions();
        }
    });
}

function processQuestions() {
    processedQuestions = [];
    questions.forEach(function (q) {
        var question = q['category']['title'] + '<br>:' + q['question'];
        var answer = q['answer'];
        processedQuestions.push({ q: question, a: answer });
    });
    questions = processedQuestions;
}

function resetGame() {
    host = '';
    players = {};
    buzzers = {};
    buzzerPlace = 0;
    questions = [];
    questionsPlace = 0;
}


http.listen(3000, function () {
    console.log('listening on 3000');
});



