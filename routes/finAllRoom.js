const express = require('express');
const axios = require('axios');
const { chat, chatroom } = require('../schemas');

const router = express.Router();

const resource_url = process.env.OAUTH_URL; 

/*chat room api*/
//모든 채팅방 조회 API
router.get('/', async (req, res) => {
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
          
          let other = (chatroom.buyer == me) ? chatroom.seller : chatroom.buyer;
          let otherImageResponse = await axios.get(resource_url + `/image?otherId=${other}`);
          let otherImage = otherImageResponse.data.otherImage
  
          // Fetch the last chat
          let lastChat = await chat.findOne({ roomId: chatroom.roomId }).sort({ time: -1 });
  
          return {
            roomId: chatroom.roomId,
            participants: chatroom.participants,
            postType: chatroom.postType,
            seller: chatroom.seller,
            username: me,
            other: other,
            otherImage: otherImage,
            message: lastChat ? lastChat.content : null,
            time: lastChat ? lastChat.time : null,
            remain: 10
          }
        }));

        reducedChatrooms.sort((a, b) => (b.time || 0) - (a.time || 0));
        res.json(reducedChatrooms);  // 조회된 chatrooms을 응답으로 전송
      })
      .catch((err) => {  
        res.status(500).json({ message: "채팅방을 불러올 수 없습니다.", code: 50000 });
      });
    } catch (error) {
      res.status(400).json({ message: "유효하지 않은 JWT Token 입니다.", code: 10101 });
    }
  });

module.exports = router;