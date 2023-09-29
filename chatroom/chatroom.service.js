import repository from "./chatroom.repository.js";

class ChatRoomService {
  static #instance;

  static getInstance() {
    if (!ChatRoomService.#instance) {
      ChatRoomService.#instance = new ChatRoomService();
    }
    return ChatRoomService.#instance;
  }

  async save(roomDto) {
    const chatRoom = await repository.findOneByIds(roomDto);

    if (chatRoom) {
      if (!chatRoom.participants.includes(roomDto.userId)) {
        chatRoom.participants.push(roomDto.userId);
        chatRoom.buyer_enter = new Date();
        chatRoom.buyer_out = new Date();
        chatRoom = await repository.save(chatRoom);
      }
      return chatRoom;
    }

    const newRoom = {
      participants: [roomDto.userId, roomDto.otherId],
      postId: roomDto.postId,
      postType: roomDto.postType,
      buyer: roomDto.userId,
      seller: roomDto.otherId,
      buyer_enter: new Date(),
      seller_enter: new Date(),
      buyer_out: new Date(),
      seller_out: new Date(),
    };
    return await repository.save(newRoom);
  }
}

export default ChatRoomService.getInstance();
