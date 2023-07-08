const express = require('express'); //RESTful API 기능을 제공
const axios = require('axios'); //Promise를 사용하여 비동기적으로 데이터를 처리

//환경 변수를 .env 파일에서 로드하여 Node.js 애플리케이션에서 사용할 수 있게 해주는 라이브러리
require('dotenv').config()

const app = express();
const port = process.env.PORT;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

//Spring OAuth2.0 서버 URL
const resource_url = process.env.OAUTH_URL; 

//Mongoose
const mongoose = require('mongoose'); //MongoDB를 쉽게 사용하게 해주는 

//mongoDB Connect
mongoose.connect(process.env.MONGO_DB, {useNewUrlParser: true, useUnifiedTopology: true});

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function() {
  // 연결이 성공적으로 이루어졌을 때의 콜백
  console.log("Connected to MongoDB!");
});

//카운터 스키마 설정
const counterSchema = mongoose.Schema({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 }
});

const counter = mongoose.model('counter', counterSchema);

//채팅방 스키마 설정
const roomSchema = new mongoose.Schema({
  roomId: { type: Number, unique: true },
  participants: [String],
  postId: Number,
  buyer: String,
  seller: String,
  buyer_enter: Date,
  seller_enter: Date
});

//채팅 스키마 설정
const chatSchema = new mongoose.Schema({
  content: String,
  roomId: Number,
  username: String,
  time : Date
});

//pre와 save 이벤트를 사용해 DB에 채팅방이 저장되기 전에 실행되는 hook
roomSchema.pre('save', async function(next) { //async를 통해 비동기 함수 선언
  // 채팅방이 새로 생성되는 채팅방일때만 roomId를 부여
  if (this.isNew) {
    var doc = this;
    try {
      //await을 통해 counter.findByIdAndUpdate()을 기다림, 즉 counterDoc가 반환되면 비동기 작업이 실행됨
      const counterDoc = await counter.findByIdAndUpdate(
        {_id: 'roomId'},
        {$inc: {seq: 1}},
        {new: true, upsert: true}
      );
  
      doc.roomId = counterDoc.seq;
      next();
    } catch (error) {
      return next(error);
    }
  } else {
    next();
  }
});

//스키마 생성
const chat = mongoose.model('chat', chatSchema);
const chatroom = mongoose.model('chatroom', roomSchema);

// Socket IO 패키지 추가
const http = require('http');
const socketIo = require('socket.io');

// 기존의 'app.listen' 대신에 다음 코드를 사용합니다.
const server = http.createServer(app);
const io = socketIo(server);

// Socket.IO 이벤트 핸들러 설정, 클라이언트와 서버가 연결되면 connection 이벤트가 발생
io.on('connection', (socket) => {

  console.log("connect success")

  // //클라이언트가 joinRoom 이벤트를 보내면(즉 특정 방에 참여하면) 처리하는 핸들러
  // //사용자가 특정 채팅방에 참여하려고할때 클라이언트에서 발생함, 이때 roomId와 userId를 매개변수로 전달
  socket.on('joinRoom', (roomId, userId) => {
    socket.join(roomId); //소켓을 roomId에 지정된 방에 조인
    console.log(`User ${userId} joined room ${roomId}`);
  });

  //사용자가 메시지 보내면 일어나는 이벤트
  //사용자가 채팅 메시지를 보낼때 클라이언트에서 발생함, 이때 매개변수로 roomId, userId, message 전달
  socket.on('message', async (roomId, userId, otherId, message) => {
    console.log(`Message from user ${userId} in room ${roomId}: ${message}`);

    // 채팅방 참여자 확인 및 추가
    const room = await chatroom.findOne({ roomId: roomId });
    if (room) {
      if (!room.participants.includes(otherId)) {
        room.participants.push(otherId);

        // otherId가 buyer일 경우
        if (otherId == room.buyer) {
          room.buyer_enter = new Date();
        }
        // otherId가 seller일 경우
        else if (otherId == room.seller) {
          room.seller_enter = new Date();
        }

        await room.save();
      }
    } else {
      console.log(`Room ${roomId} does not exist`);
      return;
    }

    // 새로운 메시지 생성
    const newMessage = new chat({
      content: message,
      roomId: roomId,
      username: userId,
      time: new Date()
    });

    // 메시지 저장
    await newMessage.save(); //저장 메시지 생성

    // 같은 채팅방에 있는 모든 클라이언트에게 메시지 전송
    io.to(roomId).emit('message', {
      content: newMessage.content,
      username: newMessage.username,
      time: newMessage.time,
    });
  });

  // 클라이언트가 방을 나갈 때 실행할 이벤트 핸들러
  socket.on('leaveRoom', (roomId, userId) => {
    socket.leave(roomId);
    console.log(`User ${userId} left room ${roomId}`);
  });

  socket.on('disconnect', () => {
    console.log('user disconnected');
  });
});

server.listen(port, () => {
  console.log(`App listening at http://localhost:${port}`)
});

/*chat room api*/
//모든 채팅방 조회 API
app.get('/chat/room/all', async (req, res) => {
  const token = req.headers.authorization;  // 헤더에서 액세스 토큰 추출

  //엑세스 토큰이 존재하지 않을 경우
  if (!token) {
    res.status(400).json({ message: "JWT Token이 존재하지 않습니다.", code: 10100 });
    return;
  }

  //리소스에 접급
  //await을 통해 해당 요청이 마무리될 때까지 함수 실행을 멈춤
  try {
    const response = await axios.get(resource_url, {
      headers: {
        'Authorization': `${token}`
      }
    });

    // 유저 정보 수집
    const me = response.data.userId

    // Chatroom 조회 (Read)
    chatroom.find({ participants: me })
    .then(async (chatrooms) => {
      //Promise.all과 map을 통해 각 chatroom에 대해 반환값을 가져오는 것을 병렬로 실행
      const reducedChatrooms = await Promise.all(chatrooms.map(async (chatroom) => {
        // Define other
        let other = (chatroom.buyer == me) ? chatroom.seller : chatroom.buyer;

        // Fetch the last chat
        let lastChat = await chat.findOne({ roomId: chatroom.roomId }).sort({ time: -1 });

        return {
          roomId: chatroom.roomId,
          participants: chatroom.participants,
          username: me,
          other: other,
          message: lastChat ? lastChat.content : null, // Returns null if no chat exists
        }
      }));
      res.json(reducedChatrooms);  // 조회된 chatrooms을 응답으로 전송
    })
    .catch((err) => {  
      res.status(500).json({ message: "채팅방을 불러올 수 없습니다.", code: 50000 });
    });
  } catch (error) {
    res.status(400).json({ message: "유효하지 않은 JWT Token 입니다.", code: 10101 });
  }
});

//채팅방 생성 API
app.post('/chat/room/create', async (req, res) => {
  const token = req.headers.authorization;  // 헤더에서 액세스 토큰 추출

  //엑세스 토큰이 존재하지 않을 경우
  if (!token) {
    res.status(400).json({ message: "JWT Token이 존재하지 않습니다.", code: 10100 });
    return;
  }

  //리소스에 접급
  try {
    const response = await axios.get(resource_url, {
      headers: {
        'Authorization': `${token}`
      }
    });

    // 유저 정보 수집
    const me = response.data.userId;
    const you = req.body.other;
    const postId = req.body.postId;

    // Chatroom 조회 (Read)
    const chatrooms = await chatroom.findOne({
      buyer: me,
      seller: you,
      postId: postId
    });

    if(chatrooms){
      if(chatrooms.participants.includes(me)){
        // 채팅방에 이미 참여자(me)가 있으므로 오류 발생
        throw new Error("Chatroom already exists!");
      } else {
        // 채팅방에 참여자(me) 추가
        chatrooms.participants.push(me);
        chatrooms.buyer_enter = new Date();
        await chatrooms.save();
      }
    } else {
      // 채팅방이 존재하지 않으므로 생성
      const newChatroom = new chatroom({
        participants: [me, you], 
        postId: postId, 
        buyer: me, 
        seller: you, 
        buyer_enter: new Date(), 
        seller_enter: new Date()
      });
      await newChatroom.save();
    }
    
    res.send(response.data);
    
  } catch (error) {
    if (error.message === "Chatroom already exists!") {
      res.status(400).json({ message: "채팅방이 이미 존재합니다", code: 60000 });
    } else {
      res.status(400).json({ message: "유효하지 않은 JWT Token 입니다.", code: 10101 });
    }
  }
});

//특정 채팅방의 모든 채팅 내용 조회 API
app.get('/chat/room/:roomId', async (req, res) => {
  const token = req.headers.authorization;  // 헤더에서 액세스 토큰 추출
  const roomId = req.params.roomId;  // route parameter로부터 roomId를 추출

  //엑세스 토큰이 존재하지 않을 경우
  if (!token) {
    res.status(400).json({ message: "JWT Token이 존재하지 않습니다.", code: 10100 });
    return;
  }

  //리소스에 접급
  try {
    const response = await axios.get(resource_url, {
      headers: {
        'Authorization': `${token}`
      }
    });

    // 유저 정보 수집
    const me = response.data.userId

    // 채팅방 참여 여부 확인
    const room = await chatroom.findOne({ roomId: roomId, participants: me });

    if(room) {
      // buyer 또는 seller에 따른 enter time 설정
      let enter_time;
      if (me === room.buyer) {
        enter_time = room.buyer_enter;
      } else if (me === room.seller) {
        enter_time = room.seller_enter;
      }

      // enter_time 이후의 채팅 내용 조회
      chat.find({ roomId: roomId, time: { $gte: enter_time } })
      .then((chats) => {
        const reducedChats = chats.map(chat => {
          return {
            content: chat.content,
            username: chat.username,
            time: chat.time,
            isMy: chat.username == me
          }
        });
        res.json(reducedChats);  // 조회된 chat들을 응답으로 전송
      })
      .catch((err) => {
        res.status(500).json({ message: "채팅 내용을 불러올 수 없습니다.", code: 50001 });
      });
    } else {
      res.status(400).json({ message: "채팅방이 존재하지 않습니다.", code: 60001 });  // roomId에 해당하는 방이 없거나, 사용자가 참여하지 않은 방인 경우
    }
  } catch (error) {
    res.status(400).json({ message: "유효하지 않은 JWT Token 입니다.", code: 10101 });
  }
});

//채팅방 떠나기 API
app.delete('/chat/room/:roomId/leave', async (req, res) => {
  const token = req.headers.authorization;  // 헤더에서 액세스 토큰 추출
  const roomId = req.params.roomId;  // route parameter로부터 roomId를 추출

  //엑세스 토큰이 존재하지 않을 경우
  if (!token) {
    res.status(400).json({ message: "JWT Token이 존재하지 않습니다.", code: 10100 });
    return;
  }
  
  //리소스에 접급
  try {
    const response = await axios.get(resource_url, {
      headers: {
        'Authorization': `${token}`
      }
    });

    // 유저 정보 수집
    const me = response.data.userId

    // Chatroom 찾기
    chatroom.findOne({ roomId: roomId })
    .then((chatroomToLeave) => {
      if(chatroomToLeave) {
        // 해당 채팅방의 participants에 me가 있다면 삭제
        if(chatroomToLeave.participants.includes(me)) {
          chatroomToLeave.participants.pull(me);
          // participants가 비어있다면 채팅방 삭제
          if(chatroomToLeave.participants.length == 0) {
            Promise.all([
              chatroom.deleteOne({ _id: chatroomToLeave._id }), // 채팅방 삭제
              chat.deleteMany({ roomId: roomId })  // 해당 roomId의 모든 채팅 삭제
            ])
            .then(() => {
              res.json({message: `Room with id ${roomId} deleted successfully`});  // 채팅방 삭제 성공 메시지 전송
            })
            .catch((err) => {
              res.status(500).json({ message: "채팅방을 삭제할 수 없습니다.", code: 50002 });
            });
          } else {
            chatroomToLeave.save()
            .then(() => {
              res.json({message: `User with id ${me} left the room successfully`});  // 참여자 리스트에서 제거 성공 메시지 전송
            })
            .catch((err) => {
              res.status(500).json({ message: "채팅방을 나가지 못했습니다.", code: 50003 });
            });
          }
        } else {
          res.status(400).json({ message: "채팅방에 참여하고 있지 않습니다.", code: 60002 });  // 참여자 리스트에 없는 경우
        }
      } else {
        res.status(400).json({ message: "채팅방을 찾을 수 없습니다.", code: 60002 });  // roomId에 해당하는 방이 없는 경우
      }
    })
    .catch((err) => {
      res.status(500).json({ message: "채팅방을 찾을 수 없습니다.", code: 50004 });
    });
  } catch (error) {
    res.status(400).json({ message: "유효하지 않은 JWT Token 입니다.", code: 10101 });
  }
});