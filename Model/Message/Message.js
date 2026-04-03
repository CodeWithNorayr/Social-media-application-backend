import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
  senderId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  receiverId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  seen: { type: Boolean, default: false },
  text: { type: String, trim: true, default: null },
  image: { type: String, default: null }
}, { timestamps: true })

const Message = mongoose.models.Message || mongoose.model("Message", messageSchema);

export default Message;