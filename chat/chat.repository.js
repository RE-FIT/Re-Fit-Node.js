class ChatRepository {
  static #instance;

  static getInstance() {
    if (!ChatRepository.#instance) {
      ChatRepository.#instance = new ChatRepository();
    }
    return ChatRepository.#instance;
  }
}

export default ChatRepository.getInstance();
