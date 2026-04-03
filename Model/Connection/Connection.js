import mongoose from "mongoose";

const connectionSchema = new mongoose.Schema({
  from_user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  to_user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  status: { type: String, enum: ['pending', 'accepted'], default: 'pending' },
}, { timestamps: true });

const Connection = mongoose.models.Connection || mongoose.model("Connection", connectionSchema);

export default Connection;

