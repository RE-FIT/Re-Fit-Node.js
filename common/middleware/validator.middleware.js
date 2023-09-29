import validator from "../validator/validator.js";

export const validateCreateRoom = async (req, res, next) => {
  try {
    const otherId = req.body.other;
    const postId = req.body.postId;
    const postType = req.body.postType;

    validator.validateOtherId(otherId);
    validator.validatePostId(postId);
    validator.validatePostType(postType);
    next();
  } catch (error) {
    next(error);
  }
};
