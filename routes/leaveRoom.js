import express from "express";
import { chat, chatroom } from "../schemas.js";
import auth from "../common/middleware/auth.middleware.js";

const router = express.Router();

router.delete("/:roomId/leave", auth, async (req, res) => {
  const roomId = req.params.roomId;
  const me = req.userId;

  try {
    const chatroomToLeave = await chatroom.findOne({ roomId: roomId });

    if (chatroomToLeave) {
      if (chatroomToLeave.participants.includes(me)) {
        chatroomToLeave.participants.pull(me);

        if (chatroomToLeave.participants.length == 0) {
          try {
            await chatroom.deleteOne({ _id: chatroomToLeave._id });
            await chat.deleteMany({ roomId: roomId });

            res.json({
              message: `Room with id ${roomId} deleted successfully`,
            });
          } catch (err) {
            res.status(500).json({
              message: "채팅방을 삭제할 수 없습니다.",
              code: 50002,
            });
          }
        } else {
          try {
            await chatroomToLeave.save();
            res.json({
              message: `User with id ${me} left the room successfully`,
            });
          } catch (err) {
            res.status(500).json({
              message: "채팅방을 나가지 못했습니다.",
              code: 50003,
            });
          }
        }
      } else {
        res.status(400).json({
          message: "채팅방에 참여하고 있지 않습니다.",
          code: 60002,
        });
      }
    } else {
      res
        .status(400)
        .json({ message: "채팅방을 찾을 수 없습니다.", code: 60002 });
    }
  } catch (error) {
    res
      .status(500)
      .json({ message: "서버 내부 오류가 발생하였습니다.", code: 50004 });
  }
});

export default router;
