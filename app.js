var express = require('express');
var app = express();
var http = require('http').createServer(app);
var io = require('socket.io')(http);

var host = '';
var players = {};
var buzzers = {};
var buzzerPlace = 0;
app.use(express.static(__dirname));


app.get('/', function (req, res) {
    res.sendFile(__dirname + '/index.html');
});

io.on('connection', function (socket) {
    socket.on('host', function (name) {
        if (host === '') {
            host = name;
            socket.emit('host', true);
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
        io.emit('changeScore', name, players[name]);

    });

    socket.on('decrementScore', function (name) {
        players[name] -= 1;
        io.emit('changeScore', name, players[name]);
    });

    socket.on('buzz-in', function (name) {
        if(!(name in buzzers)) {
            buzzers[name] = ++buzzerPlace;
            io.emit('updateBuzzers', buzzers);
        }
    });

    socket.on('resetBuzzIn', function(){
        buzzers = {};
        io.emit('updateBuzzers', buzzers);
    });
});

http.listen(3000, function () {
    console.log('listening on 3000');
});



