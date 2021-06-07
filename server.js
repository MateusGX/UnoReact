const next = require("next");
const { Cards, Colors, Deck } = require("./game/uno");

const cardNames = Object.keys(Cards);

const shuffle = require("shuffle-array");

const app = require("express")();
const server = require("http").Server(app);
const { Server } = require("socket.io");

const io = new Server(server);

const nextApp = next({ dev: process.env.NODE_ENV != "production" });
const nextHandler = nextApp.getRequestHandler();

nextApp
  .prepare()
  .then(() => {
    app.get("*", (req, res) => {
      return nextHandler(req, res);
    });

    server.listen(process.env.PORT || 3000, (err) => {
      if (err) throw err;

      console.log("Server started!");
    });
  })
  .catch(console.error);

const rooms = {};

io.on("connection", (socket) => {
  socket.on("check", (room) => {
    const players =
      io.sockets.adapter.rooms.get(room) == undefined
        ? 0
        : io.sockets.adapter.rooms.get(room).size;

    socket.emit(
      "valid",
      !(players == 10 || (players != 0 && rooms[room].started))
    );
  });
  socket.on("join", (room, username) => {
    const players =
      io.sockets.adapter.rooms.get(room) == undefined
        ? 0
        : io.sockets.adapter.rooms.get(room).size;

    if (players == 10 || (players != 0 && rooms[room].started)) {
      socket.emit("valid", false);
    } else {
      socket.isMaster = players == 0;
      socket.username = username;
      socket.room = room;
      socket.join(room);
      if (username == undefined || room == undefined) return;

      console.log(`${username} >> (${room})`);
      socket.emit("joined", socket.isMaster);
      io.to(room).emit("playerJoined", players + 1);
      if (socket.isMaster) {
        rooms[room] = {
          started: false,
          deck: shuffle(Deck, { copy: true }),
          currentPlayer: null,
          direction: "right",
          boardCard: null,
          boardPlayers: {
            [socket.id]: {
              socket,
              hand: [],
            },
          },
        };
      } else {
        rooms[room].boardPlayers[socket.id] = {
          socket,
          hand: [],
        };
      }
    }
  });
  socket.on("startGame", () => {
    if (socket.isMaster) {
      rooms[socket.room].started = true;
      let players = Object.keys(rooms[socket.room].boardPlayers);
      for (let i = 0; i < players.length; i++) {
        for (let j = 0; j < 7; j++) {
          let card =
            rooms[socket.room].deck[
              Math.floor(Math.random() * rooms[socket.room].deck.length)
            ];
          rooms[socket.room].boardPlayers[players[i]].hand.push(Cards[card]);
          rooms[socket.room].deck.splice(
            rooms[socket.room].deck.indexOf(card),
            1
          );
        }
        rooms[socket.room].boardPlayers[players[i]].socket.emit(
          "getCards",
          rooms[socket.room].boardPlayers[players[i]].hand
        );
      }
      let cardNameSafe = rooms[socket.room].deck;
      cardNameSafe.splice(cardNameSafe.indexOf("drawFour"), 1);
      cardNameSafe.splice(cardNameSafe.indexOf("wild"), 1);

      for (let i = 0; i < Colors.length; i++) {
        cardNameSafe.splice(cardNameSafe.indexOf(`${Colors[i]}Skip`), 1);
        cardNameSafe.splice(cardNameSafe.indexOf(`${Colors[i]}Reverse`), 1);
        cardNameSafe.splice(cardNameSafe.indexOf(`${Colors[i]}DrawTwo`), 1);
      }
      let card = cardNameSafe[Math.floor(Math.random() * cardNameSafe.length)];
      rooms[socket.room].boardCard = Cards[card];
      rooms[socket.room].deck.splice(rooms[socket.room].deck.indexOf(card), 1);

      sendPlayersInfo(socket.room);
      nextPlayer(socket.room);
      io.to(socket.room).emit("boardCard", rooms[socket.room].boardCard);
    }
  });
  socket.on("playCard", (card) => {
    if (rooms[socket.room] == undefined) return;
    if (socket.id != rooms[socket.room].currentPlayer) return;

    let cardIndex = findCard(
      rooms[socket.room].boardPlayers[socket.id].hand,
      card
    );

    if (cardIndex == -1) return;

    if (card.hasNumber == false && card.action == "wild") {
      playCard(card, socket);
      return;
    }

    if (card.hasNumber == false && card.action == "drawFour") {
      playCard(card, socket);
      if (rooms[socket.room].deck.length != 0) {
        for (let j = 0; j < 4; j++) {
          let card =
            rooms[socket.room].deck[
              Math.floor(Math.random() * rooms[socket.room].deck.length)
            ];
          rooms[socket.room].boardPlayers[
            rooms[socket.room].currentPlayer
          ].hand.push(Cards[card]);
          rooms[socket.room].deck.splice(
            rooms[socket.room].deck.indexOf(card),
            1
          );
        }
        rooms[socket.room].boardPlayers[
          rooms[socket.room].currentPlayer
        ].socket.emit(
          "getCards",
          rooms[socket.room].boardPlayers[rooms[socket.room].currentPlayer].hand
        );
      }
      nextPlayer(socket.room);
      return;
    }

    if (
      card.hasNumber == false &&
      card.color == rooms[socket.room].boardCard.color &&
      card.action == "skip"
    ) {
      playCard(card, socket);
      nextPlayer(socket.room);
      return;
    }

    if (
      card.hasNumber == false &&
      card.color == rooms[socket.room].boardCard.color &&
      card.action == "reverse"
    ) {
      rooms[socket.room].direction =
        rooms[socket.room].direction == "right" ? "left" : "right";
      playCard(card, socket);
      return;
    }
    if (
      card.hasNumber == false &&
      card.color == rooms[socket.room].boardCard.color &&
      card.action == "drawTwo"
    ) {
      playCard(card, socket);
      if (rooms[socket.room].deck.length != 0) {
        for (let j = 0; j < 2; j++) {
          let card =
            rooms[socket.room].deck[
              Math.floor(Math.random() * rooms[socket.room].deck.length)
            ];
          rooms[socket.room].boardPlayers[
            rooms[socket.room].currentPlayer
          ].hand.push(Cards[card]);
          rooms[socket.room].deck.splice(
            rooms[socket.room].deck.indexOf(card),
            1
          );
        }
        rooms[socket.room].boardPlayers[
          rooms[socket.room].currentPlayer
        ].socket.emit(
          "getCards",
          rooms[socket.room].boardPlayers[rooms[socket.room].currentPlayer].hand
        );
      }
      nextPlayer(socket.room);
      return;
    }

    if (card.color == rooms[socket.room].boardCard.color) {
      playCard(card, socket);
      return;
    }
    if (
      card.hasNumber == true &&
      card.number == rooms[socket.room].boardCard.number
    ) {
      playCard(card, socket);
      return;
    }
  });
  socket.on("disconnect", () => {
    const players =
      io.sockets.adapter.rooms.get(socket.room) == undefined
        ? 0
        : io.sockets.adapter.rooms.get(socket.room).size;

    if (players == 0) {
      delete rooms[socket.room];
    } else if (players == 1) {
      io.to(socket.room).emit("win", socket.username);
    } else {
      delete rooms[socket.room].boardPlayers[socket.id];
    }
    sendPlayersInfo(socket.room);

    if (socket.username != undefined && socket.room != undefined) {
      console.log(`${socket.username} << (${socket.room})`);
    }
    io.to(socket.room).emit("playerLeave", players);
  });

  socket.on("drawCard", () => {
    if (rooms[socket.room] == undefined) return;
    if (socket.id != rooms[socket.room].currentPlayer) return;
    if (rooms[socket.room].deck.length == 0) return;

    rooms[socket.room].boardPlayers[socket.id].hand.push(
      Cards[cardNames[Math.floor(Math.random() * cardNames.length)]]
    );
    rooms[socket.room].boardPlayers[socket.id].socket.emit(
      "getCards",
      rooms[socket.room].boardPlayers[socket.id].hand
    );
    sendPlayersInfo(socket.room);
  });

  function sendPlayersInfo(room) {
    if (rooms[room] == undefined) return;

    let players = Object.keys(rooms[room].boardPlayers);
    let playersContent = [];
    for (let i = 0; i < players.length; i++) {
      playersContent.push({
        id: rooms[room].boardPlayers[players[i]].socket.id,
        username: rooms[room].boardPlayers[players[i]].socket.username,
        handSize: rooms[room].boardPlayers[players[i]].hand.length,
      });
    }
    io.to(socket.room).emit("getPlayers", playersContent);
  }
  function findCard(hand, card) {
    let result = -1;
    for (let i = 0; i < hand.length; i++) {
      if (hand[i].id == card.id) {
        result = i;
        break;
      }
    }
    return result;
  }
  function nextPlayer(room) {
    const playersIDs = Object.keys(rooms[room].boardPlayers);
    if (rooms[room].currentPlayer == null) {
      rooms[room].currentPlayer =
        rooms[room].boardPlayers[
          playersIDs[Math.floor(Math.random() * playersIDs.length)]
        ].socket.id;

      io.to(room).emit("currentPlayer", rooms[room].currentPlayer);
      return;
    }

    if (rooms[room].direction == "right") {
      if (
        playersIDs.indexOf(rooms[room].currentPlayer) ==
        playersIDs.length - 1
      ) {
        rooms[room].currentPlayer =
          rooms[room].boardPlayers[playersIDs[0]].socket.id;
      } else if (playersIDs.indexOf(rooms[room].currentPlayer) >= 0) {
        rooms[room].currentPlayer =
          rooms[room].boardPlayers[
            playersIDs[playersIDs.indexOf(rooms[room].currentPlayer) + 1]
          ].socket.id;
      }
    } else {
      if (
        playersIDs.indexOf(rooms[room].currentPlayer) ==
        playersIDs.length - 1
      ) {
        rooms[room].currentPlayer =
          rooms[room].boardPlayers[playersIDs[playersIDs.length - 2]].socket.id;
      } else if (playersIDs.indexOf(rooms[room].currentPlayer) == 0) {
        rooms[room].currentPlayer =
          rooms[room].boardPlayers[playersIDs[playersIDs.length - 1]].socket.id;
      } else if (playersIDs.indexOf(rooms[room].currentPlayer) > 0) {
        rooms[room].currentPlayer =
          rooms[room].boardPlayers[
            playersIDs[playersIDs.indexOf(rooms[room].currentPlayer) - 1]
          ].socket.id;
      }
    }
    sendPlayersInfo(socket.room);
    io.to(room).emit("currentPlayer", rooms[room].currentPlayer);
  }
  function playCard(card, socket) {
    let cardIndex = findCard(
      rooms[socket.room].boardPlayers[socket.id].hand,
      card
    );
    rooms[socket.room].deck.push(rooms[socket.room].boardCard.id);
    shuffle(rooms[socket.room].deck);

    rooms[socket.room].boardCard = card;
    rooms[socket.room].boardPlayers[socket.id].hand.splice(cardIndex, 1);
    socket.emit("getCards", rooms[socket.room].boardPlayers[socket.id].hand);
    sendPlayersInfo(socket.room);
    io.to(socket.room).emit("boardCard", rooms[socket.room].boardCard);
    if (rooms[socket.room].boardPlayers[socket.id].hand.length == 0) {
      io.to(socket.room).emit("win", socket.username);
    } else {
      nextPlayer(socket.room);
    }
  }
});
