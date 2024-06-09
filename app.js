const express = require("express");
const socket = require("socket.io");
const http = require("http");
const { Chess } = require("chess.js");
const path = require("path");
const { disconnect } = require("process");

const app = express();
const server = http.createServer(app);
const io = socket(server);

const chess = new Chess();
let players = {};
let currentPlayer = "W";

app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.render("index", { title: "Chess Game" });
});

io.on("connection", function (socket) {
  // Assign player roles (white or black)
  if (!players.white) {
    players.white = socket.id;
    socket.emit("playerRole", "w");
  } else if (!players.black) {
    players.black = socket.id;
    socket.emit("playerRole", "b");
  } else {
    socket.emit("spectatorRole");
  }

  // Handle move events
  socket.emit("boardState", chess.fen());

  // Handle move events from clients
  socket.on("move", (move) => {
    try {
      // Ensure it's the current player's turn
      if (
        (chess.turn() === "w" && socket.id !== players.white) ||
        (chess.turn() === "b" && socket.id !== players.black)
      ) {
        return; // Not the current player's turn
      }

      // Make the move and update game state
      const result = chess.move(move);
      if (result) {
        // Emit move and updated game state to all clients
        io.emit("move", move);
        io.emit("boardState", chess.fen());

        // Check for checkmate
        if (chess.in_checkmate()) {
          io.emit("checkmate", chess.turn());
        }
      } else {
        // Invalid move
        console.log("Invalid move: ", move);
        socket.emit("invalidMove", move);
      }
    } catch (error) {
      // Handle errors
      console.error("Error:", error);
      socket.emit("error", error.message);
    }
  });

  // Handle disconnection
  socket.on("disconnect", () => {
    if (socket.id === players.white) {
      delete players.white;
    } else if (socket.id === players.black) {
      delete players.black;
    }
  });
});

server.listen(3000, function () {
  console.log("listening on a port 3000");
});
