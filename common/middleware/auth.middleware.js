import axios from "axios";
import ErrorTypes from "../error/error.util.js";

const resource_url = process.env.OAUTH_URL;

const auth = async (req, res, next) => {
  const token = req.headers.authorization;

  if (!token) {
    return next(ErrorTypes.TOKEN_NOT_FOUND);
  }

  try {
    const response = await axios.get(resource_url, {
      headers: {
        Authorization: `${token}`,
      },
    });
    req.userId = response.data.userId;
    next();
  } catch (error) {
    return next(ErrorTypes.TOKEN_INVALID);
  }
};

export default auth;
