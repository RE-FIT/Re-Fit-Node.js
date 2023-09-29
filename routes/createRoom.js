import express from "express";
import auth from "../common/middleware/auth.middleware.js";
import { validateCreateRoom } from "../common/middleware/validator.middleware.js";
import chatroom from "../chatroom/chatroom.schema.js";

const router = express.Router();

router.post("/", auth, validateCreateRoom, async (req, res) => {
  const me = req.userId;
  const you = req.body.other;
  const postId = req.body.postId;
  const postType = req.body.postType;

  try {
    const existingChatroom = await chatroom.findOne({
      buyer: me,
      seller: you,
      postId: postId,
    });

    if (existingChatroom) {
      if (existingChatroom.participants.includes(me)) {
        res.json({ roomId: existingChatroom.roomId });
        return;
      } else {
        existingChatroom.participants.push(me);
        existingChatroom.buyer_enter = new Date();
        existingChatroom.buyer_out = new Date();
        await existingChatroom.save();

        res.json({ roomId: existingChatroom.roomId });
        return;
      }
    } else {
      const newChatroom = new chatroom({
        participants: [me, you],
        postId: postId,
        postType: postType,
        buyer: me,
        seller: you,
        buyer_enter: new Date(),
        seller_enter: new Date(),
        buyer_out: new Date(),
        seller_out: new Date(),
      });
      await newChatroom.save();

      res.json({ roomId: newChatroom.roomId });
      return;
    }
  } catch (error) {
    if (error.message === "Chatroom already exists!") {
      res
        .status(400)
        .json({ message: "채팅방이 이미 존재합니다", code: 60000 });
    } else {
      res
        .status(500)
        .json({ message: "서버 내부 오류가 발생하였습니다.", code: 50002 });
    }
  }
});

export default router;
