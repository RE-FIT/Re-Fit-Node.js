import mongoose from "mongoose";

const chatSchema = new mongoose.Schema({
  content: String,
  roomId: Number,
  username: String,
  time: Date,
  notificationId: String,
});

const chat = mongoose.model("chat", chatSchema);

export default chat;
