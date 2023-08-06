const express = require('express'); //RESTful API 기능을 제공
const axios = require('axios'); //Promise를 사용하여 비동기적으로 데이터를 처리
const sockets = require('./socket');
const connectDB = require('./db');

//환경 변수를 .env 파일에서 로드하여 Node.js 애플리케이션에서 사용할 수 있게 해주는 라이브러리
require('dotenv').config()

const app = express();
const port = process.env.PORT;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

connectDB();

// Socket IO 패키지 추가
const http = require('http');
const socketIo = require('socket.io');

// 기존의 'app.listen' 대신에 다음 코드를 사용합니다.
const server = http.createServer(app);
const io = socketIo(server);
sockets(io)

const finAllRoom = require('./routes/finAllRoom');
const createRoom = require('./routes/createRoom');
const findRoom = require('./routes/findRoom');
const leaveRoom = require('./routes/leaveRoom');

app.use('/chat/room/all', finAllRoom);
app.use('/chat/room/create', createRoom);
app.use('/chat/room', findRoom);
app.use('/chat/room', leaveRoom);

server.listen(port, () => {
  console.log(`App listening at http://localhost:${port}`)
});