'use strict';

// Filen app.js är den enda ni skall och tillåts skriva kod i.

// ─── LABB 1: Importera kodbibliotek ──────────────────────────────────────────
const express = require('express');
const jsDOM = require('jsdom');
const cookieParser = require('cookie-parser');

// LABB 2: Importera socket.io
const io = require('socket.io');

// Importera game-modul
const globalObject = require('./servermodules/game-modul.js');

// Importera fs
const fs = require('fs');

// Skapa express-app
const app = express();

// Starta webbserver på port 3000
const server = app.listen(3000, () => {
    console.log('Servern lyssnar på port 3000');
});

// LABB 2: Koppla samman socket.io med express-servern
const socketServer = io(server);

// ─── MIDDLEWARES ──────────────────────────────────────────────────────────────
app.use(express.static('static'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());

// ─── END-POINT: GET "/" ───────────────────────────────────────────────────────
app.get('/', (req, res) => {
    if (req.cookies.nickName && req.cookies.color) {
        res.sendFile(__dirname + '/static/html/index.html');
    } else {
        res.sendFile(__dirname + '/static/html/loggain.html');
    }
});

// ─── END-POINT: GET "/reset" ──────────────────────────────────────────────────
app.get('/reset', (req, res) => {
    if (req.cookies.nickName && req.cookies.color) {
        res.clearCookie('nickName');
        res.clearCookie('color');
    }

    // Töm berörda attribut i globalObject beroende på vilken spelare som resetar
    if (req.cookies.nickName === globalObject.playerOneNick) {
        globalObject.playerOneNick = null;
        globalObject.playerOneColor = null;
        globalObject.playerOneSocketId = null;
    } else {
        globalObject.playerTwoNick = null;
        globalObject.playerTwoColor = null;
        globalObject.playerTwoSocketId = null;
    }

    res.redirect('/');
});

// ─── END-POINT: POST "/" ──────────────────────────────────────────────────────
app.post('/', (req, res) => {
    const nick_1 = req.body.nick_1;
    const color_1 = req.body.color_1;

    try {
        if (nick_1 === undefined)   throw new Error('Nickname saknas!');
        if (color_1 === undefined)  throw new Error('Färg saknas!');
        if (nick_1.length < 3)     throw new Error('Nickname ska vara minst tre tecken långt!');
        if (color_1.length !== 7)  throw new Error('Färg ska innehålla sju tecken!');
        if (color_1.toLowerCase() === '#000000' || color_1.toLowerCase() === '#ffffff') {
            throw new Error('Ogiltig färg!');
        }

        if (globalObject.playerOneNick === null) {
            globalObject.playerOneNick = nick_1;
            globalObject.playerOneColor = color_1;
        } else {
            if (nick_1 === globalObject.playerOneNick)                              throw new Error('Nickname redan taget!');
            if (color_1.toLowerCase() === globalObject.playerOneColor.toLowerCase()) throw new Error('Färg redan tagen!');
            globalObject.playerTwoNick = nick_1;
            globalObject.playerTwoColor = color_1;
        }

        const twoHoursInMs = 2 * 60 * 60 * 1000;

        res.cookie('nickName', nick_1,  { maxAge: twoHoursInMs, httpOnly: true });
        res.cookie('color',    color_1, { maxAge: twoHoursInMs, httpOnly: true });
        res.redirect('/');

    } catch (error) {
        const htmlContent = fs.readFileSync(__dirname + '/static/html/loggain.html', 'utf-8');
        const dom = new jsDOM.JSDOM(htmlContent);
        const document = dom.window.document;

        document.getElementById('errorMsg').innerHTML = `<p style="color:red;">${error.message}</p>`;

        if (nick_1 !== undefined)  document.getElementById('nick_1').value = nick_1;
        if (color_1 !== undefined) document.getElementById('color_1').value = color_1;

        res.send(dom.serialize());
    }
});

// ═════════════════════════════════════════════════════════════════════════════
//  LABB 2 – WEBSOCKETS & TIMER
// ═════════════════════════════════════════════════════════════════════════════

// ─── HJÄLPFUNKTION: Starta om timern ─────────────────────────────────────────
function startTimer() {
    // Avsluta eventuell befintlig timer
    if (globalObject.timerId !== null) {
        clearTimeout(globalObject.timerId);
        globalObject.timerId = null;
    }
    // Starta ny timer – anropar timeout() efter 5 sekunder
    globalObject.timerId = setTimeout(timeout, 5000);
}

// ─── HJÄLPFUNKTION: Avsluta timern ───────────────────────────────────────────
function stopTimer() {
    if (globalObject.timerId !== null) {
        clearTimeout(globalObject.timerId);
        globalObject.timerId = null;
    }
}

// ─── TIMEOUT-FUNKTION ────────────────────────────────────────────────────────
function timeout() {
    if (globalObject.currentPlayer === 1) {
        // Spelare 1 tog för lång tid – meddela spelare 1 om timeout
        socketServer.to(globalObject.playerOneSocketId).emit('timeout');
        // Ge draget till spelare 2
        socketServer.to(globalObject.playerTwoSocketId).emit('yourMove', { cellId: null });
        // Byt aktuell spelare
        globalObject.currentPlayer = 2;
    } else {
        // Spelare 2 tog för lång tid – meddela spelare 2 om timeout
        socketServer.to(globalObject.playerTwoSocketId).emit('timeout');
        // Ge draget till spelare 1
        socketServer.to(globalObject.playerOneSocketId).emit('yourMove', { cellId: null });
        // Byt aktuell spelare
        globalObject.currentPlayer = 1;
    }

    // Stäng ner gammal timer och starta en ny
    startTimer();
}

// ─── SOCKET.IO: CONNECTION ────────────────────────────────────────────────────
socketServer.on('connection', (socket) => {
    console.log('Klient ansluten:', socket.id);

    // Parsa kakor från socket-handshake
    const cookies = globalObject.parseCookies(socket.handshake.headers.cookie);
    const nickName = cookies.nickName;
    const color    = cookies.color;

    // Steg 5: Kakorna saknas → koppla ned
    if (!nickName || !color) {
        socket.disconnect();
        console.log('Disconnect: Kakorna saknas!');
        return;
    }

    // Steg 2: Redan två anslutna spelare → koppla ned
    if (globalObject.playerOneSocketId !== null && globalObject.playerTwoSocketId !== null) {
        socket.disconnect();
        console.log('Disconnect: Redan två spelare anslutna!');
        return;
    }

    // Steg 3: Spelare 1 ansluter
    if (nickName === globalObject.playerOneNick) {
        globalObject.playerOneSocketId = socket.id;
        console.log('Spelare 1 ansluten:', nickName);
        // Spelare 1 väntar – inget mer händer förrän spelare 2 ansluter
    }

    // Steg 4: Spelare 2 ansluter
    else if (nickName === globalObject.playerTwoNick) {
        globalObject.playerTwoSocketId = socket.id;
        console.log('Spelare 2 ansluten:', nickName);

        // Nollställ spelplanen
        globalObject.resetGameArea();

        // Skicka newGame till spelare 1
        // Spelare 1:s motståndare är spelare 2
        socketServer.to(globalObject.playerOneSocketId).emit('newGame', {
            opponentNick:  globalObject.playerTwoNick,
            opponentColor: encodeURIComponent(globalObject.playerTwoColor),
            myColor:       encodeURIComponent(globalObject.playerOneColor)
        });

        // Skicka newGame till spelare 2
        // Spelare 2:s motståndare är spelare 1
        socketServer.to(globalObject.playerTwoSocketId).emit('newGame', {
            opponentNick:  globalObject.playerOneNick,
            opponentColor: encodeURIComponent(globalObject.playerOneColor),
            myColor:       encodeURIComponent(globalObject.playerTwoColor)
        });

        // Spelare 1 börjar – sätt currentPlayer och skicka yourMove med null
        globalObject.currentPlayer = 1;
        socketServer.to(globalObject.playerOneSocketId).emit('yourMove', { cellId: null });

        // Starta timern nu när spelet börjar
        startTimer();
    }

    // ─── SOCKET.IO: newMove ───────────────────────────────────────────────────
    socket.on('newMove', (data) => {
        const cellId = parseInt(data.cellId);

        // Steg 1: Uppdatera spelplanen med aktuell spelare
        globalObject.gameArea[cellId] = globalObject.currentPlayer;

        // Steg 4b: Stoppa timern när ett drag gjorts
        stopTimer();

        // Steg 2: Byt spelare och skicka yourMove till nästa spelare
        if (globalObject.currentPlayer === 1) {
            globalObject.currentPlayer = 2;
            socketServer.to(globalObject.playerTwoSocketId).emit('yourMove', { cellId: cellId });
        } else {
            globalObject.currentPlayer = 1;
            socketServer.to(globalObject.playerOneSocketId).emit('yourMove', { cellId: cellId });
        }

        // Steg 3: Kontrollera om spelet är slut
        const result = globalObject.checkForWinner();

        if (result === 1) {
            stopTimer();
            socketServer.to(globalObject.playerOneSocketId).emit('gameover', globalObject.playerOneNick + ' vann!');
            socketServer.to(globalObject.playerTwoSocketId).emit('gameover', globalObject.playerOneNick + ' vann!');
        } else if (result === 2) {
            stopTimer();
            socketServer.to(globalObject.playerOneSocketId).emit('gameover', globalObject.playerTwoNick + ' vann!');
            socketServer.to(globalObject.playerTwoSocketId).emit('gameover', globalObject.playerTwoNick + ' vann!');
        } else if (result === 3) {
            stopTimer();
            socketServer.to(globalObject.playerOneSocketId).emit('gameover', 'Oavgjort!');
            socketServer.to(globalObject.playerTwoSocketId).emit('gameover', 'Oavgjort!');
        } else {
            // Spelet fortsätter – starta timern igen för nästa spelare
            startTimer();
        }
    });

    // ─── SOCKET.IO: disconnect ────────────────────────────────────────────────
    socket.on('disconnect', () => {
        console.log('Klient frånkopplad:', socket.id);
    });
});
