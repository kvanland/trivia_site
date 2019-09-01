var express = require('express');
var app = express();
var http = require('http').createServer(app);
var io = require('socket.io')(http, {
    pingTimeout: 10000
});

var games = {};

// Game Logic
// var players = {};
// var buzzers = {};
// var buzzerPlace = 0;
// var questions = [];
// var questionPlace = -1;

// Allows the server to serve static files such as index.js
app.use(express.static(__dirname));

// Server setup
app.get('/', function (req, res) {
    res.sendFile(__dirname + '/index.html');
});

var init = io.of('/init').on('connection', function (socket) {
    socket.on('host', function () {
        socket.emit('redirect', '/host.html');

    });

    socket.on('join', function () {
        socket.emit('redirect', '/join.html');
    })
});

var host = io.of('/host').on('connection', function (socket) {

    socket.on('disconnect', function (reason) {
        //TODO: If transport closed end game otherwise wait for reconnect
        console.log("HOST DISCONNECTED WTF " + reason);
    });

    socket.on('create game', function () {
        // Initialize game state
        var gameCode = Math.floor(Math.random() * 90000) + 10000;
        while (gameCode in games) {
            gameCode = Math.floor(Math.random() * 90000) + 10000;
        }
        games[gameCode] = {
            players: {},
            questions: [],
            questionPlace: 0,
            buzzers: {},
            buzzerPlace: 0
        };
        socket.emit('game code', gameCode);
        socket.join(gameCode);

        fetchQuestions(function (gameQuestions) {
            if (gameQuestions === null) {
                socket.emit('host reject', 'Unable to gather questions right now try again later!');
            } else {
                games[gameCode]['questions'] = gameQuestions;
                socket.emit('nextQuestion', gameQuestions[games[gameCode]['questionPlace']]);
            }
        });
    });

    socket.on('resetBuzzIn', function (code) {
        games[code]['buzzers'] = {};
        games[code]['buzzerPlace'] = 0;
        host.emit('clearBuzzers');
        join.emit('clearBuzzers');
    });

    socket.on('decrementScore', function (obj) {
        var code = obj['code'];
        var username = obj['username'];
        if(code in games){
            var players = games[code]['players'];
            if(username in players){
                players[username] -= 1;
                host.to(code).emit('changeScore', {
                    'username': username, 
                    'score': players[username],
                });
                join.to(code).emit('changeScore', {
                    'username': username, 
                    'score': players[username],
                    'increment': false
                });
            }
        }
    });

    socket.on('incrementScore', function (obj) {
        var code = obj['code'];
        var username = obj['username'];
        if(code in games){
            var players = games[code]['players'];
            if(username in players){
                players[username] += 1;
                host.to(code).emit('changeScore', {
                    'username': username, 
                    'score': players[username],
                });
                join.to(code).emit('changeScore', {
                    'username': username, 
                    'score': players[username],
                    'increment': true
                });
            }
        }
    });

    socket.on('nextQuestion', function(code){
        if(code in games){
            var game = games[code];
            socket.emit('nextQuestion', game['questions'][++game['questionPlace']]);
            join.to(code).emit('nextQuestion');

            if (game['questionPlace'] == 19) {
                game['questionPlace'] = -1;
                fetchQuestions(function (gameQuestions) {
                    if (gameQuestions === null) {
                        socket.emit('host reject', 'Unable to gather questions right now try again later!');
                    } else {
                        game['questions'] = gameQuestions;
                    }
                });
            }
        }
    });

    socket.on('revealQuestion', function(code){
        if(code in games){
            var game = games[code];
            socket.emit('incomingQuestion');
            join.to(code).emit('incomingQuestion', game['questions'][game['questionPlace']]['q']);
        }
    });

    socket.on('revealAnswer', function(code){
        if(code in games){
            var game = games[code];
            socket.emit('incomingAnswer');
            join.to(code).emit('incomingAnswer', game['questions'][game['questionPlace']]['a']);
        }
    });

    socket.on('deleteGame', function(code){
        if(code in games){
            join.to(code).emit('gameDeleted');
            socket.emit('gameDeleted');
            delete games[code];
        }
    });
    

});

var join = io.of('/join').on('connection', function (socket) {
    socket.on('join', function (obj) {
        var code = obj['code'];
        var username = obj['username'];
        if (code in games) {
            if (username in games[code]['players']) {
                socket.emit('invalid join', 'Username already in use please try another one');
            } else {
                socket.join(code);
                games[code]['players'][username] = 0;
                socket.emit('valid join', games[code]['players']);
                join.to(code).emit('newPlayer', username);
                host.to(code).emit('newPlayer', username);
            }
        } else {
            socket.emit('invalid join', 'Invalid game code please check again');
        }
    });

    socket.on('buzz-in', function (obj) {
        var code = obj['code'];
        var name = obj['username'];
        if (code in games) {
            var buzzers = games[code]['buzzers'];
            if (!(name in buzzers)) {
                buzzers[name] = ++games[code]['buzzerPlace'];
                join.to(code).emit('updateBuzzers', buzzers);
                host.to(code).emit('updateBuzzers', buzzers);
            }
        }
    });

    socket.on('leave-game', function (obj){
        var code = obj['code'];
        var name = obj['username'];
        if(code in games){
            delete games[code]['players'][name];
            delete games[code]['buzzers'][name];
        }

        join.to(code).emit('removePlayer', name);
        host.to(code).emit('removePlayer', name);
    });

});

io.on('connection', function (socket) {
    socket.on('host', function (name) {
        if (host === '') {
            host = name;
            fetchQuestions();
            socket.emit('host', true);
            const request = require('request');
            request('http://jservice.io/api/random?count=20', function (error, response, body) {
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
        if (questionsPlace == 19) {
            quesionsPlace = -1;
            fetchQuestions();
        }
    });

    socket.on('revealQuestion', function () {
        io.emit('incomingQuestion', questions[questionsPlace]['q']);
    });

    socket.on('revealAnswer', function () {
        io.emit('incomingAnswer', questions[questionsPlace]['a']);
    })

    socket.on('leaveGame', function (name) {
        delete players[name];
        delete buzzers[name];
        io.emit('removePlayer', name);
    });

    socket.on('deleteGame', function () {
        // resetGame()
        io.emit('gameDeleted');
    });
});

function fetchQuestions(callback) {
    const request = require('request');
    request('http://jservice.io/api/random?count=20', function (error, response, body) {
        if (!error && response.statusCode == 200) {
            apiResponseQuestions = JSON.parse(body);
            var boi = processQuestions(apiResponseQuestions);
            callback(boi);
        } else {
            callback(null);
        }
    });
}

function processQuestions(apiResponseQuestions) {
    processedQuestions = [];
    apiResponseQuestions.forEach(function (q) {
        var question = q['category']['title'] + ':<br>' + q['question'];
        var answer = q['answer'];
        processedQuestions.push({ q: question, a: answer });
    });
    //questions = processedQuestions;
    return processedQuestions;
}


http.listen(3000, function () {
    console.log('listening on 3000');
});