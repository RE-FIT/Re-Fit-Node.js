class ChatService {
  static #instance;

  static getInstance() {
    if (!ChatService.#instance) {
      ChatService.#instance = new ChatService();
    }
    return ChatService.#instance;
  }
}

export default ChatService.getInstance();
