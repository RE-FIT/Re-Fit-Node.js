import ErrorTypes from "../error/error.util.js";

class Validator {
  static instance = null;

  static getInstance() {
    if (!Validator.instance) {
      Validator.instance = new Validator();
    }
    return Validator.instance;
  }

  validateOtherId(otherId) {
    if (!otherId || typeof otherId !== "string" || !otherId.trim()) {
      throw ErrorTypes.OTHER_ID_INVALID;
    }
  }

  validatePostId(postId) {
    if (typeof postId !== "number" || !Number.isInteger(postId)) {
      throw ErrorTypes.POST_ID_INVALID;
    }
  }

  validatePostType(postType) {
    if (typeof postType !== "number" || !Number.isInteger(postType)) {
      throw ErrorTypes.POST_TYPE_INVALID;
    }
  }
}

export default Validator.getInstance();
