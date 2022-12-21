// const express = require('express');
// const app = express();

// const http = require('http').Server(app);

// const io = require('socket.io')(http, {
//     cors: {
//         origin: '*',
//         methods: ['GET', 'POST'],
//     },
// });

// app.use(cors())
// app.use(express.urlencoded({ limit: '10mb', extended: true }))
// app.use(express.json({ limit: '10mb', extended: true }))
// app.use(express.static('../dist/'));

// app.get('/', function (req, res) {
//     res.sendFile(__dirname + '../../dist/index.html');
// });

// let players = {};

// (() => {
    
// })();

const { readFileSync } = require("fs");
const { createServer } = require("https");
const { Server } = require("socket.io");

const httpsServer = createServer({
  key: readFileSync("/cert/key.pem"),
  cert: readFileSync("/cert/cert.pem")
});

const io = new Server(httpsServer, { /* options */ });

setup();

// Update player position, roughly matches 120 refresh
setInterval(function () {
    io.sockets.emit('playerPositions', players);
}, 8);


httpsServer.listen(3000);

function setup() {
    io.on('connection', function (socket) {
        // Client connect...
        console.log(`User ${socket.id} connected`);

        // Add to server players object
        players[socket.id] = {
            pos: [0, 0, 0],
            rotate: [0, 0, 0],
            moveState: 'idle',
        };

        // We give all clients notice of new player and their ID..
        socket.broadcast.emit(
            'player connect',
            socket.id,
            io.engine.clientsCount
        );

        // We give client their ID, playerCount and playerIDs
        socket.emit(
            'initPlayer',
            { id: socket.id },
            io.engine.clientsCount,
            Object.keys(players)
        );

        // We give clients notice of disconnection and the their ID
        socket.on('disconnect', function () {
            console.log(`User ${socket.id} disconnected`);
            socket.broadcast.emit(
                'player disconnect',
                socket.id,
                io.engine.clientsCount
            );
            // Delete from players object
            delete players[socket.id];
        });

        // On chat message emit it to everyone
        socket.on('chat message', function (username, message) {
            io.emit('chat message', username, message);
        });

        socket.on('kill message', function (shooter, killed) {
            io.emit('kill message', shooter, killed);
        });

        // Data every client uploads
        socket.on('updateClientPos', (pos, rotate, moveState) => {
            if (players[socket.id]) {
                players[socket.id].pos = pos;
                players[socket.id].rotate = rotate;
                players[socket.id].moveState = moveState;
            }
        });

        socket.on('triggerRemoteRocket', () => {
            socket.broadcast.emit(
                'shootSyncRocket',
                players[socket.id],
                socket.id
            );
        });
    });

    let port = process.env.PORT;
    if (port == null || port == '') {
        port = 3000;
    }

    http.listen(port, function () {
        console.log(`Listening on port ${port}`);
    });
}
