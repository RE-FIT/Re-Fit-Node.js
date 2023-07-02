const express = require('express');
const axios = require('axios');

//ENV
require('dotenv').config()

const app = express();
const port = process.env.PORT;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const resource_url = process.env.OAUTH_URL;  // 스프링 서버의 보호된 리소스 URL

//mongoose
const mongoose = require('mongoose');

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
  participants: [String]
});

//채팅 스키마 설정
const chatSchema = new mongoose.Schema({
  content: String,
  roomId: Number,
  person: String
});

//채팅방 저장 전에 실행되는 pre hook
roomSchema.pre('save', async function(next) {
  var doc = this;

  try {
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
});

//스키마 생성
const chat = mongoose.model('chat', chatSchema);
const chatroom = mongoose.model('chatroom', roomSchema);

/*chat room api*/
//모든 채팅방 조회 API
app.get('/chat/room/all', async (req, res) => {
  const token = req.headers.authorization;  // 헤더에서 액세스 토큰 추출

  //리소스에 접급
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
    .then((chatrooms) => {
      const reducedChatrooms = chatrooms.map(chatroom => {
        return {
          roomId: chatroom.roomId,
          participants: chatroom.participants
        }
      });
      res.json(reducedChatrooms);  // 조회된 chatrooms을 응답으로 전송
    })
    .catch((err) => {
      console.error(err);
      res.status(500).send(err.toString());
    });
  } catch (error) {
    res.status(500).send(error.toString());
  }
});


//채팅방 생성 API
app.post('/chat/room/create', async (req, res) => {
  const token = req.headers.authorization;  // 헤더에서 액세스 토큰 추출

  //리소스에 접급
  try {
    const response = await axios.get(resource_url, {
      headers: {
        'Authorization': `${token}`
      }
    });

    // 유저 정보 수집
    const me = response.data.userId;
    const you = req.body.id;

    // Chatroom 조회 (Read)
    const chatrooms = await chatroom.find({ participants: { $all: [me, you] } });
    
    if(chatrooms.length > 0){
      // 채팅방이 존재하므로 오류 발생
      throw new Error("Chatroom already exists!");
    }
    
    // 채팅방이 존재하지 않으므로 생성
    const newChatroom = new chatroom({participants: [me,you] });
    await newChatroom.save();
    
    res.send(response.data);
  } catch (error) {
    if (error.message === "Chatroom already exists!") {
      res.status(400).json({ message: "채팅방이 이미 존재합니다", code: 50000 });
    } else {
      res.status(500).json({ message: error.toString(), code: "INTERNAL_SERVER_ERROR" });
    }
  }
});

//채팅방 조회 API
app.get('/chat/room/:roomId', async (req, res) => {
  const token = req.headers.authorization;  // 헤더에서 액세스 토큰 추출
  const roomId = req.params.roomId;  // route parameter로부터 roomId를 추출

  //리소스에 접급
  try {
    const response = await axios.get(resource_url, {
      headers: {
        'Authorization': `${token}`
      }
    });

    // 유저 정보 수집
    const me = response.data.userId

    // Chatroom 조회 (Read)
    chatroom.findOne({ roomId: roomId, participants: me })
    .then((chatroom) => {
      if(chatroom) {
        const reducedChatroom = {
          roomId: chatroom.roomId,
          participants: chatroom.participants
        };
        res.json(reducedChatroom);  // 조회된 chatroom을 응답으로 전송
      } else {
        res.status(404).send('Room not found');  // roomId에 해당하는 방이 없거나, 사용자가 참여하지 않은 방인 경우
      }
    })
    .catch((err) => {
      console.error(err);
      res.status(500).send(err.toString());
    });
  } catch (error) {
    res.status(500).send(error.toString());
  }
});

//채팅방 삭제 API
app.delete('/chat/room/:roomId/leave', async (req, res) => {
  const token = req.headers.authorization;  // 헤더에서 액세스 토큰 추출
  const roomId = req.params.roomId;  // route parameter로부터 roomId를 추출

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
          if(chatroomToLeave.participants.length === 0) {
            chatroomToLeave.remove()
            .then(() => {
              res.json({message: `Room with id ${roomId} deleted successfully`});  // 채팅방 삭제 성공 메시지 전송
            })
            .catch((err) => {
              console.error(err);
              res.status(500).send(err.toString());
            });
          } else {
            chatroomToLeave.save()
            .then(() => {
              res.json({message: `User with id ${me} left the room successfully`});  // 참여자 리스트에서 제거 성공 메시지 전송
            })
            .catch((err) => {
              console.error(err);
              res.status(500).send(err.toString());
            });
          }
        } else {
          res.status(400).send('User not found in the room');  // 참여자 리스트에 없는 경우
        }
      } else {
        res.status(404).send('Room not found');  // roomId에 해당하는 방이 없는 경우
      }
    })
    .catch((err) => {
      console.error(err);
      res.status(500).send(err.toString());
    });
  } catch (error) {
    res.status(500).send(error.toString());
  }
});


app.listen(port, () => {
  console.log(`App listening at http://localhost:${port}`)
});