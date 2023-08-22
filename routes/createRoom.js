const express = require('express');
const axios = require('axios');
const { chat, chatroom } = require('../schemas');

const router = express.Router();

const resource_url = process.env.OAUTH_URL; 

//채팅방 생성 API
router.post('/', async (req, res) => {
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
    const postType = req.body.postType;

    // Chatroom 조회 (Read)
    const chatrooms = await chatroom.findOne({
      buyer: me,
      seller: you,
      postId: postId
    });

    if(chatrooms){
      if(chatrooms.participants.includes(me)){

        res.json({ roomId: chatrooms.roomId });
        return

      } else {
        // 채팅방에 참여자(me) 추가
        chatrooms.participants.push(me);
        chatrooms.buyer_enter = new Date();
        chatrooms.buyer_out = new Date();
        await chatrooms.save();

        res.json({ roomId: chatrooms.roomId });
        return
      }
    } else {
      // 채팅방이 존재하지 않으므로 생성
      const newChatroom = new chatroom({
        participants: [me, you], 
        postId: postId, 
        postType: postType,
        buyer: me,
        seller: you, 
        buyer_enter: new Date(), 
        seller_enter: new Date(),
        buyer_out: new Date(),
        seller_out: new Date()
      });
      await newChatroom.save();

      res.json({ roomId: newChatroom.roomId });
      return
    }
    
  } catch (error) {
    if (error.message === "Chatroom already exists!") {
      res.status(400).json({ message: "채팅방이 이미 존재합니다", code: 60000 });
    } else {
      res.status(400).json({ message: "유효하지 않은 JWT Token 입니다.", code: 10101 });
    }
  }
});


module.exports = router;