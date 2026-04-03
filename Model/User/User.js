import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  password: { type: String, required: true },
  email: { type: String, unique: true, required: true },
  image: { type: String, required: false },
  location: { type: String, required: false },
  dob: { type: Date, required: false },
  bio: { type: String, required: false },
  coverPhoto: { type: String, required: false },
  isAccountVerified: { type: Boolean, default: false },
  verifyOtp: { type: String, default: '' },
  verifyOtpExpireAt: { type: Number, default: 0 },
  resetOtp: { type: String, default: '' },
  resetOtpExpireAt: { type: Number, default: 0 },
  following: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  followers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  connection: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }]
}, { timestamps: true });


const User = mongoose.models.User || mongoose.model('User', userSchema);

export default User;