import express from "express";
import axios from "axios";
import { chat, chatroom } from "../schemas.js";

const router = express.Router();
const resource_url = process.env.OAUTH_URL;

//메시지가 존재하는지 체크하는 메서드
router.get("/:roomId/check/message", async (req, res) => {
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
  } catch (error) {
    res
      .status(400)
      .json({ message: "유효하지 않은 JWT Token 입니다.", code: 10101 });
  }

  try {
    const chatCount = await chat.exists({ roomId: roomId });

    if (chatCount === 0) {
      await chatroom.deleteOne({ roomId: roomId });
      res.json({ message: "채팅방이 삭제되었습니다.", code: 200 });
    } else {
      res.json({ message: "채팅방에 메시지가 존재합니다.", code: 70002 });
    }
  } catch (error) {
    res
      .status(500)
      .json({ message: "서버 내부 오류가 발생하였습니다.", code: 50002 });
  }
});

export default router;
