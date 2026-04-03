import { v2 as cloudinary } from "cloudinary";
import mongoose from "mongoose";
import Message from "../../Model/Message/Message.js";
import User from "../../Model/User/User.js";
import { io, userSocketMap } from "../../server.js";

/* ================================
   GET UNSEEN MESSAGES (OPTIMIZED)
================================ */
const unseenMessages = async (req, res) => {
  try {
    const userId = req.user._id;

    const userExists = await User.findById(userId);
    if (!userExists) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

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

    return res.json({
      success: true,
      unseenMessages: result
    });

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

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID"
      });
    }

    const messages = await Message.find({
      $or: [
        { senderId: userId, receiverId: id },
        { senderId: id, receiverId: userId }
      ]
    }).sort({ createdAt: 1 });

    // Mark messages as seen (from other user → current user)
    await Message.updateMany(
      { senderId: id, receiverId: userId, seen: false },
      { seen: true }
    );

    return res.json({
      success: true,
      messages
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};

/* ================================
   MARK ALL MESSAGES AS SEEN (BETTER UX)
================================ */
const markMessagesSeen = async (req, res) => {
  try {
    const userId = req.user._id;
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID"
      });
    }

    await Message.updateMany(
      { senderId: id, receiverId: userId, seen: false },
      { seen: true }
    );

    return res.status(200).json({
      success: true,
      message: "Messages marked as seen"
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};

/* ================================
   SEND MESSAGE (TEXT + IMAGE)
================================ */
const sendMessage = async (req, res) => {
  try {
    const text = req.body.text?.trim();
    const image = req.file;
    const receiverId = req.params.id;
    const senderId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(receiverId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid receiver ID"
      });
    }

    if (!text && !image) {
      return res.status(400).json({
        success: false,
        message: "Text or image is required"
      });
    }

    const receiverUser = await User.findById(receiverId);
    if (!receiverUser) {
      return res.status(404).json({
        success: false,
        message: "Receiver not found"
      });
    }

    let imageUrl = null;

    if (image) {
      if (!image.mimetype.startsWith("image/")) {
        return res.status(400).json({
          success: false,
          message: "Only images are allowed"
        });
      }

      const upload = await cloudinary.uploader.upload(image.path, {
        folder: "messages/images"
      });

      imageUrl = upload.secure_url;
    }

    const newMessage = await Message.create({
      text,
      senderId,
      receiverId,
      image: imageUrl
    });

    /* ========= SOCKET.IO ========= */
    const receiverSocketId = userSocketMap[receiverId.toString()];
    const senderSocketId = userSocketMap[senderId.toString()];

    if (receiverSocketId) {
      io.to(receiverSocketId).emit("newMessage", newMessage);
    }

    if (senderSocketId) {
      io.to(senderSocketId).emit("newMessage", newMessage);
    }

    return res.status(201).json({
      success: true,
      data: newMessage
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};

export {
  unseenMessages,
  getUserMessages,
  markMessagesSeen,
  sendMessage
};