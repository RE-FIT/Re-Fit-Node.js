import express from "express";
import axios from "axios";
import { chat, chatroom } from "../schemas.js";

const router = express.Router();
const resource_url = process.env.OAUTH_URL;

//특정 채팅방의 모든 채팅 내용 조회 API
router.get("/:roomId", async (req, res) => {
  const token = req.headers.authorization; // 헤더에서 액세스 토큰 추출
  const roomId = req.params.roomId; // route parameter로부터 roomId를 추출

  //엑세스 토큰이 존재하지 않을 경우
  if (!token) {
    res
      .status(400)
      .json({ message: "JWT Token이 존재하지 않습니다.", code: 10100 });
    return;
  }

  //리소스에 접급
  try {
    const response = await axios.get(resource_url, {
      headers: {
        Authorization: `${token}`,
      },
    });

    // 유저 정보 수집
    const me = response.data.userId;

    // 채팅방 참여 여부 확인
    const room = await chatroom.findOne({ roomId: roomId, participants: me });

    if (room) {
      // buyer 또는 seller에 따른 enter time 설정
      let enter_time;
      if (me === room.buyer) {
        enter_time = room.buyer_enter;
      } else if (me === room.seller) {
        enter_time = room.seller_enter;
      }

      // enter_time 이후의 채팅 내용 조회
      chat
        .find({ roomId: roomId, time: { $gte: enter_time } })
        .then((chats) => {
          const reducedChats = chats.map((chat) => {
            return {
              content: chat.content,
              username: chat.username,
              time: chat.time,
              isMy: chat.username == me,
              notificationId: chat.notificationId,
            };
          });
          res.json(reducedChats); // 조회된 chat들을 응답으로 전송
        })
        .catch((err) => {
          res
            .status(500)
            .json({ message: "채팅 내용을 불러올 수 없습니다.", code: 50001 });
        });
    } else {
      res
        .status(400)
        .json({ message: "채팅방이 존재하지 않습니다.", code: 60001 }); // roomId에 해당하는 방이 없거나, 사용자가 참여하지 않은 방인 경우
    }
  } catch (error) {
    res
      .status(400)
      .json({ message: "유효하지 않은 JWT Token 입니다.", code: 10101 });
  }
});

export default router;
