const express = require('express'); //RESTful API 기능을 제공
const axios = require('axios'); //Promise를 사용하여 비동기적으로 데이터를 처리
const sockets = require('./socket');
const connectDB = require('./db');

const { chat, chatroom } = require('./schemas');

//환경 변수를 .env 파일에서 로드하여 Node.js 애플리케이션에서 사용할 수 있게 해주는 라이브러리
require('dotenv').config()

const app = express();
const port = process.env.PORT;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

//Spring OAuth2.0 서버 URL
const resource_url = process.env.OAUTH_URL; 

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

app.use('/chat/room/all', finAllRoom);
app.use('/chat/room/create', createRoom);

server.listen(port, () => {
  console.log(`App listening at http://localhost:${port}`)
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