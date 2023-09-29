import { CustomException } from "../error/error.model.js";

export function errorHandler(err, req, res, next) {
  if (err instanceof CustomException) {
    return res.status(400).json({ message: err.message, code: err.code });
  }
  res.status(500).json({ message: err.message, code: 500 });
}
