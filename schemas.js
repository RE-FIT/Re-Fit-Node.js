const mongoose = require('mongoose');

// 카운터 스키마 설정
const counterSchema = mongoose.Schema({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 }
});

const counter = mongoose.model('counter', counterSchema);

// 채팅방 스키마 설정
const roomSchema = new mongoose.Schema({
  roomId: { type: Number, unique: true },
  participants: [String],
  postId: Number,
  postType: Number,
  buyer: String,
  seller: String,
  buyer_enter: Date,
  seller_enter: Date,
  buyer_out: Date,
  seller_out: Date
});

// 채팅 스키마 설정
const chatSchema = new mongoose.Schema({
  content: String,
  roomId: Number,
  username: String,
  time : Date
});

roomSchema.pre('save', async function(next) {
  if (this.isNew) {
    var doc = this;
    try {
      const counterDoc = await counter.findByIdAndUpdate(
        {_id: 'roomId'},
        {$inc: {seq: 1}},
        {new: true, upsert: true}
      );

      doc.roomId = counterDoc.seq;
      next();
    } catch (error) {
      return next(error);
    }
  } else {
    next();
  }
});

// 스키마 생성
const chat = mongoose.model('chat', chatSchema);
const chatroom = mongoose.model('chatroom', roomSchema);

module.exports = { chat, chatroom };