var express = require('express');
var app = express();
var http = require('http').createServer(app);
var io = require('socket.io')(http, {
    pingTimeout: 10000
});

var admin = require("firebase-admin");

var serviceAccount = require("../security/serviceAccountKey.json");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://trivia-site-9fa7d.firebaseio.com"
});

var db = admin.firestore();
var buzzers = {};
// Buzzers
// player = {} // 'joe' : 1
// buzzerPlace = 0;

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

io.of('/init').on('connection', function (socket) {
    socket.on('host', function () {
        socket.emit('redirect', '/host.html');

    });

    socket.on('join', function () {
        socket.emit('redirect', '/join.html');
    })
});

var host = io.of('/host').on('connection', function (socket) {

    socket.on('disconnect', function (reason) {
        // Delete game and socket associated with the socket
        db.collection('host-sockets').doc(socket.id).get()
            .then(doc => {
                if (doc.exists) {
                    db.collection('games').doc(doc.data().gameCode).delete();
                    db.collection('host-sockets').doc(socket.id).delete();
                    delete buzzers[doc.data().gameCode];
                    join.to(doc.data().gameCode).emit('gameDeleted');
                }
            }).catch(err => {
                console.log('Error getting gameCode to disconnect: ', err);
            });
        console.log("HOST DISCONNECTED " + reason);
    });

    socket.on('create game', function () {
        // Initialize game state
        // Auto generate game code using firebase auto-generated IDs
        let gameCode = db.collection('games').doc().id;
        const game = {
            players: {},
            questions: [],
            questionPlace: 0,
        };

        // NOTE Buzzers live in memory instead of db 
        const gameBuzzers = {
            players: {},
            buzzerPlace: 0
        }
        buzzers[gameCode] = gameBuzzers;

        // Alert host of game code and associate the socket with the code
        socket.emit('game code', gameCode);
        socket.join(gameCode);

        fetchQuestions(function (gameQuestions) {
            if (gameQuestions === null) {
                socket.emit('host reject', 'Unable to gather questions right now try again later!');
            } else {
                game['questions'] = gameQuestions;
                socket.emit('nextQuestion', gameQuestions[game['questionPlace']]);
            }

            let dbGames = db.collection('games').doc(gameCode.toString());
            dbGames.set(game);
            let dbSockets = db.collection('host-sockets').doc(socket.id);
            dbSockets.set({ gameCode : gameCode.toString() });
        });
    });

    socket.on('resetBuzzIn', function (code) {
        buzzers[code]['players'] = {};
        buzzers[code]['buzzerPlace'] = 0;
        host.emit('clearBuzzers');
        join.emit('clearBuzzers');
    });

    socket.on('decrementScore', function (obj) {
        var code = obj['code'];
        var username = obj['username'];

        db.collection('games').doc(code.toString()).get()
            .then(result => {
                // Increment user's score in db
                const players = result.data().players;
                players[username] -= 1;
                db.collection('games').doc(result.id).update({ players: players });

                host.to(code).emit('changeScore', {
                    'username': username,
                    'score': players[username],
                });
                join.to(code).emit('changeScore', {
                    'username': username,
                    'score': players[username],
                    'increment': false
                });

            })
            .catch(error => {
                console.log(error);
            });
    });

    socket.on('incrementScore', function (obj) {
        var code = obj['code'];
        var username = obj['username'];

        db.collection('games').doc(code.toString()).get()
            .then(result => {
                // Increment user's score in db
                const players = result.data().players;
                players[username] += 1;
                db.collection('games').doc(result.id).update({ players: players });

                host.to(code).emit('changeScore', {
                    'username': username,
                    'score': players[username],
                });
                join.to(code).emit('changeScore', {
                    'username': username,
                    'score': players[username],
                    'increment': true
                });

            })
            .catch(error => {
                console.log(error);
            });
    });

    socket.on('nextQuestion', function (code) {
        db.collection('games').doc(code.toString()).get()
            .then(result => {
                const game = result.data();
                socket.emit('nextQuestion', game['questions'][++game['questionPlace']]);
                join.to(code).emit('nextQuestion');
                // When the questions have been exhausted request more from api
                if (game['questionPlace'] == 19) {
                    game['questionPlace'] = -1;
                    fetchQuestions(function (gameQuestions) {
                        game['questions'] = gameQuestions;
                        db.collection('games').doc(result.id).update({ questions: gameQuestions });
                        if (gameQuestions === null) {
                            socket.emit('host reject', 'Unable to gather questions right now try again later!');
                        }
                    });
                }
                db.collection('games').doc(result.id).set(game);
            })
            .catch(error => {
                console.log(error);
            });
    });

    socket.on('revealQuestion', function (obj) {
        socket.emit('incomingQuestion');
        join.to(obj['code']).emit('incomingQuestion', obj['question']);
    });

    socket.on('revealAnswer', function (obj) {
        socket.emit('incomingAnswer');
        join.to(obj['code']).emit('incomingAnswer', obj['answer']);
    });
});

var join = io.of('/join').on('connection', function (socket) {

    socket.on('disconnect', function (reason) {
        // Delete game and socket associated with the socket
        db.collection('player-sockets').doc(socket.id).get()
            .then(doc => {
                if (doc.exists) {
                    // Delete the socket association in db 
                    db.collection('player-sockets').doc(socket.id).delete();

                    let gameCode = doc.data()['gameCode'];
                    let username = doc.data()['username'];

                    db.collection('games').doc(gameCode.toString()).get()
                        .then(result => {
                            if (result.exists) {
                                // Delete player from game db
                                const players = result.data()['players'];
                                delete players[username];
                                db.collection('games').doc(gameCode.toString()).update( {players: players} );

                                // Delete player from buzzers
                                delete buzzers[gameCode]['players'][username];

                                // Alert players / host of player disconnect
                                join.to(gameCode).emit('removePlayer', username);
                                host.to(gameCode).emit('removePlayer', username);
                            }
                        });
                }
            }).catch(error => {
                console.log('Error trying to disconnect: ', error);
            });
        console.log('Player disconnect: ' + reason);
    });

    socket.on('join', function (obj) {
        const code = obj['code'];
        const username = obj['username'];

        // Check if able to join and join if able
        db.collection('games').doc(code.toString()).get()
            .then(doc => {
                if (doc.exists) {
                    if (username in doc.data().players) {
                        socket.emit('invalid join', 'Username already in use please try another one');
                    } else {
                        socket.join(code);

                        // Update players in db
                        const players = doc.data().players;
                        players[username] = 0;
                        db.collection('games').doc(doc.id).update({ players: players });

                        // Associate socket with gamecode
                        let dbSockets = db.collection('player-sockets').doc(socket.id);
                        dbSockets.set({ 
                            gameCode : code.toString(),
                            username : username
                        });

                        // Inform other players + host about new player
                        socket.emit('valid join', players);
                        join.to(code).emit('newPlayer', username);
                        host.to(code).emit('newPlayer', username);
                    }
                } else {
                    socket.emit('invalid join', 'Invalid game code please check again');
                }
            }).catch(error => {
                console.log(error);
            });
    });

    socket.on('buzz-in', function (obj) {
        var code = obj['code'];
        var name = obj['username'];
        if (code in buzzers) {
            var players = buzzers[code]['players'];
            if (!(name in players)) {
                players[name] = ++buzzers[code]['buzzerPlace'];
                join.to(code).emit('updateBuzzers', buzzers[code]);
                host.to(code).emit('updateBuzzers', buzzers[code]);
            }
        }
    });

    socket.on('leave-game', function (obj) {
        var code = obj['code'];
        var name = obj['username'];

        db.collection('games').doc(code.toString()).get()
            .then(result => {
                // Delete player from game db
                const players = result.data()['players'];
                delete players[name];
                db.collection('games').doc(code.toString()).update( {players : players} );

                // Delete player from buzzer
                delete buzzers[code]['players'][name];

                // Alert players / host of player disconnect
                join.to(code).emit('removePlayer', name);
                host.to(code).emit('removePlayer', name);

            })
            .catch(error => {
                console.log(error);
            });
    });

});

function fetchQuestions(callback) {
    const request = require('request');
    request('http://jservice.io/api/random?count=20', function (error, response, body) {
        if (!error && response.statusCode == 200) {
            const apiResponseQuestions = JSON.parse(body);
            var processedQuestions = processQuestions(apiResponseQuestions);
            callback(processedQuestions);
        } else {
            callback(null);
        }
    });
}

function processQuestions(apiResponseQuestions) {
    const processedQuestions = [];
    apiResponseQuestions.forEach(function (q) {
        var question = 'Category: ' + q['category']['title'] + '<br><br>Question:<br>' + q['question'];
        var answer = q['answer'];
        processedQuestions.push({ q: question, a: answer });
    });
    return processedQuestions;
}


http.listen(3000, function () {
    console.log('listening on 3000');
});