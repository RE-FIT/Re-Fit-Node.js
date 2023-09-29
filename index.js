import express from "express";
import sockets from "./socket.js";
import connectDB from "./db.js";
import dotenv from "dotenv";
import http from "http";
import * as socketIo from "socket.io";

import finAllRoom from "./routes/finAllRoom.js";
import createRoom from "./routes/createRoom.js";
import findRoom from "./routes/findRoom.js";
import leaveRoom from "./routes/leaveRoom.js";
import checkRoom from "./routes/checkRoom.js";

dotenv.config();

const app = express();
const port = process.env.PORT;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

connectDB();

const server = http.createServer(app);
const io = new socketIo.Server(server);
sockets(io);

app.use("/chat/room/all", finAllRoom);
app.use("/chat/room/create", createRoom);
app.use("/chat/room", findRoom);
app.use("/chat/room", leaveRoom);
app.use("/chat/room", checkRoom);

server.listen(port, () => {
  console.log(`App listening at http://localhost:${port}`);
});
