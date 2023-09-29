import express from "express";
import axios from "axios";
import auth from "../common/middleware/auth.middleware.js";
import chat from "../chat/chat.schema.js";
import chatroom from "../chatroom/chatroom.schema.js";

const router = express.Router();
const resource_url = process.env.OAUTH_URL;

router.get("/", auth, async (req, res) => {
  const me = req.userId;

  try {
    chatroom
      .find({ participants: me })
      .then(async (chatrooms) => {
        const reducedChatrooms = await Promise.all(
          chatrooms.map(async (chatroom) => {
            let other = chatroom.buyer == me ? chatroom.seller : chatroom.buyer;
            let otherEncoded = encodeURIComponent(other);
            let otherImageResponse = await axios.get(
              resource_url +
                `/image?otherId=${otherEncoded}&postId=${chatroom.postId}`
            );
            let otherImage = otherImageResponse.data.otherImage;
            let postState = otherImageResponse.data.postState;

            let lastChat = await chat
              .findOne({ roomId: chatroom.roomId })
              .sort({ time: -1 });
            if (!lastChat) return null;

            let lastExit =
              me === chatroom.seller ? chatroom.seller_out : chatroom.buyer_out;

            let unreadMessagesCount = 0;
            if (lastExit) {
              unreadMessagesCount = await chat.countDocuments({
                roomId: chatroom.roomId,
                time: { $gt: lastExit },
              });
            }

            return {
              roomId: chatroom.roomId,
              postId: chatroom.postId,
              postState: postState,
              participants: chatroom.participants,
              postType: chatroom.postType,
              seller: chatroom.seller,
              username: me,
              other: other,
              otherImage: otherImage,
              message: lastChat ? lastChat.content : null,
              time: lastChat ? lastChat.time : null,
              remain: unreadMessagesCount,
            };
          })
        );

        const finalChatrooms = reducedChatrooms.filter(
          (chatroom) => chatroom !== null
        );
        finalChatrooms.sort((a, b) => (b.time || 0) - (a.time || 0));
        res.json(finalChatrooms);
      })
      .catch((err) => {
        console.log(err);
        res
          .status(500)
          .json({ message: "채팅방을 불러올 수 없습니다.", code: 50000 });
      });
  } catch (error) {
    res
      .status(500)
      .json({ message: "서버 내부 오류가 발생하였습니다.", code: 50002 });
  }
});

export default router;
