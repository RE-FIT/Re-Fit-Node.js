import express from "express";
import { chat, chatroom } from "../schemas.js";
import auth from "../common/middleware/auth.middleware.js";

const router = express.Router();

router.get("/:roomId", auth, async (req, res) => {
  const roomId = req.params.roomId;
  const me = req.userId;

  try {
    const room = await chatroom.findOne({ roomId: roomId, participants: me });

    if (room) {
      let enter_time;
      if (me === room.buyer) {
        enter_time = room.buyer_enter;
      } else if (me === room.seller) {
        enter_time = room.seller_enter;
      }

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
          res.json(reducedChats);
        })
        .catch((err) => {
          res
            .status(500)
            .json({ message: "채팅 내용을 불러올 수 없습니다.", code: 50001 });
        });
    } else {
      res
        .status(400)
        .json({ message: "채팅방이 존재하지 않습니다.", code: 60001 });
    }
  } catch (error) {
    res
      .status(500)
      .json({ message: "서버 내부 오류가 발생하였습니다.", code: 50002 });
  }
});

export default router;
