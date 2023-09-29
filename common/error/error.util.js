import { CustomException } from "./error.model.js";

const ErrorTypes = {
  TOKEN_INVALID: new CustomException("유효하지 않은 토큰입니다.", 70000),
  TOKEN_EXPIRED: new CustomException("토큰이 만료되었습니다.", 70001),
  TOKEN_NOT_FOUND: new CustomException("토큰이 존재하지 않습니다.", 70002),

  OTHER_ID_INVALID: new CustomException("유효하지 않은 상대 ID입니다.", 70003),
  POST_ID_INVALID: new CustomException("유효하지 않은 게시글 ID입니다.", 70004),
  POST_TYPE_INVALID: new CustomException(
    "유효하지 않은 게시글 타입입니다.",
    70005
  ),
};

export default ErrorTypes;
