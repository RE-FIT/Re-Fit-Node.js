import express from "express";
import auth from "../common/middleware/auth.middleware.js";
import { validateCreateRoom } from "../common/middleware/validator.middleware.js";
import service from "../chatroom/chatroom.service.js";
import ReqSaveRoomDto from "../chatroom/dto/reqCreateRoomDto.js";

const router = express.Router();

router.post("/", auth, validateCreateRoom, async (req, res) => {
  const userId = req.userId;
  const otherId = req.body.other;
  const postId = req.body.postId;
  const postType = req.body.postType;

  try {
    const roomDto = new ReqSaveRoomDto(userId, otherId, postId, postType);
    const room = await service.save(roomDto);
    res.json({ roomId: room.roomId });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: error, code: 80000 });
  }
});

export default router;
