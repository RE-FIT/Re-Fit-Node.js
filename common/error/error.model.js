export class CustomException extends Error {
  constructor(message, code) {
    super(message);
    this.code = code;
  }
}
