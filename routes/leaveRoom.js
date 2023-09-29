import express from "express";
import axios from "axios";
import { chat, chatroom } from "../schemas.js";

const router = express.Router();
const resource_url = process.env.OAUTH_URL;

//채팅방 떠나기 API
router.delete("/:roomId/leave", async (req, res) => {
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

    // Chatroom 찾기
    chatroom
      .findOne({ roomId: roomId })
      .then((chatroomToLeave) => {
        if (chatroomToLeave) {
          // 해당 채팅방의 participants에 me가 있다면 삭제
          if (chatroomToLeave.participants.includes(me)) {
            chatroomToLeave.participants.pull(me);
            // participants가 비어있다면 채팅방 삭제
            if (chatroomToLeave.participants.length == 0) {
              Promise.all([
                chatroom.deleteOne({ _id: chatroomToLeave._id }), // 채팅방 삭제
                chat.deleteMany({ roomId: roomId }), // 해당 roomId의 모든 채팅 삭제
              ])
                .then(() => {
                  res.json({
                    message: `Room with id ${roomId} deleted successfully`,
                  }); // 채팅방 삭제 성공 메시지 전송
                })
                .catch((err) => {
                  res.status(500).json({
                    message: "채팅방을 삭제할 수 없습니다.",
                    code: 50002,
                  });
                });
            } else {
              chatroomToLeave
                .save()
                .then(() => {
                  res.json({
                    message: `User with id ${me} left the room successfully`,
                  }); // 참여자 리스트에서 제거 성공 메시지 전송
                })
                .catch((err) => {
                  res.status(500).json({
                    message: "채팅방을 나가지 못했습니다.",
                    code: 50003,
                  });
                });
            }
          } else {
            res.status(400).json({
              message: "채팅방에 참여하고 있지 않습니다.",
              code: 60002,
            }); // 참여자 리스트에 없는 경우
          }
        } else {
          res
            .status(400)
            .json({ message: "채팅방을 찾을 수 없습니다.", code: 60002 }); // roomId에 해당하는 방이 없는 경우
        }
      })
      .catch((err) => {
        res
          .status(500)
          .json({ message: "채팅방을 찾을 수 없습니다.", code: 50004 });
      });
  } catch (error) {
    res
      .status(400)
      .json({ message: "유효하지 않은 JWT Token 입니다.", code: 10101 });
  }
});

export default router;
