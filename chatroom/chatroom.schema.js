import mongoose from "mongoose";

const counterSchema = mongoose.Schema({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 },
});

const counter = mongoose.model("counter", counterSchema);

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
  seller_out: Date,
});

roomSchema.pre("save", async function (next) {
  if (this.isNew) {
    var doc = this;
    try {
      const counterDoc = await counter.findByIdAndUpdate(
        { _id: "roomId" },
        { $inc: { seq: 1 } },
        { new: true, upsert: true }
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

const chatroom = mongoose.model("chatroom", roomSchema);

export default chatroom;
