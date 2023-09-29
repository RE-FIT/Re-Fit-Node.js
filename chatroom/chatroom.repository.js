import chatroom from "./chatroom.schema.js";

class ChatRoomRepository {
  static #instance;

  static getInstance() {
    if (!ChatRoomRepository.#instance) {
      ChatRoomRepository.#instance = new ChatRoomRepository();
    }
    return ChatRoomRepository.#instance;
  }

  async save(roomDto) {
    if (roomDto._id) {
      return await chatroom.findByIdAndUpdate(roomDto._id, roomDto, {
        new: true,
      });
    } else {
      const newRoom = new chatroom(roomDto);
      return await newRoom.save();
    }
  }

  async findOneByIds(roomDto) {
    return chatroom.findOne({
      buyer: roomDto.userId,
      seller: roomDto.otherId,
      postId: roomDto.postId,
    });
  }
}

export default ChatRoomRepository.getInstance();
