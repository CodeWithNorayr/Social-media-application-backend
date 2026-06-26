import { v2 as cloudinary } from "cloudinary";
import mongoose from "mongoose";
import Message from "../../Model/Message/Message.js";
import User from "../../Model/User/User.js";
import { io, userSocketMap } from "../../server.js";

/* ================================
   GET UNSEEN MESSAGES
================================ */
const unseenMessages = async (req, res) => {
  try {
    const userId = req.user._id;

    const unseen = await Message.aggregate([
      {
        $match: {
          receiverId: new mongoose.Types.ObjectId(userId),
          seen: false
        }
      },
      {
        $group: {
          _id: "$senderId",
          count: { $sum: 1 }
        }
      }
    ]);

    const result = {};
    unseen.forEach(item => {
      result[item._id.toString()] = item.count;
    });

    return res.json({ success: true, unseenMessages: result });

  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};

/* ================================
   GET CHAT MESSAGES
================================ */
const getUserMessages = async (req, res) => {
  try {
    const userId = req.user._id;
    const { id } = req.params;

    const messages = await Message.find({
      $or: [
        { senderId: userId, receiverId: id },
        { senderId: id, receiverId: userId }
      ]
    }).sort({ createdAt: 1 });

    await Message.updateMany(
      { senderId: id, receiverId: userId, seen: false },
      { seen: true }
    );

    return res.json({ success: true, messages });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/* ================================
   MARK SEEN
================================ */
const markMessagesSeen = async (req, res) => {
  try {
    const userId = req.user._id;
    const { id } = req.params;

    await Message.updateMany(
      { senderId: id, receiverId: userId, seen: false },
      { seen: true }
    );

    return res.json({ success: true, message: "Seen updated" });

  } catch (error) {
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/* ================================
   SEND MESSAGE (FIXED SOCKET SAFE)
================================ */
const sendMessage = async (req, res) => {
  try {
    const senderId = req.user._id;
    const receiverId = req.params.id;
    const text = req.body.text?.trim();
    const image = req.file;

    if (!text && !image) {
      return res.status(400).json({
        success: false,
        message: "Text or image required"
      });
    }

    let imageUrl = null;

    if (image) {
      const upload = await cloudinary.uploader.upload(image.path, {
        folder: "messages/images"
      });
      imageUrl = upload.secure_url;
    }

    const message = await Message.create({
      senderId,
      receiverId,
      text,
      image: imageUrl
    });

    // SOCKET SAFE
    const receiverSocket = userSocketMap[receiverId];
    const senderSocket = userSocketMap[senderId];

    if (receiverSocket) io.to(receiverSocket).emit("newMessage", message);
    if (senderSocket) io.to(senderSocket).emit("newMessage", message);

    return res.status(201).json({ success: true, message });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export {
  unseenMessages,
  getUserMessages,
  markMessagesSeen,
  sendMessage
};
