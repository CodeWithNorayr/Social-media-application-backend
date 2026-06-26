import express from "express";
import protectUser from "../../Middleware/AuthMiddleware/AuthMiddleware.js";
import {
  getUserMessages,
  markMessagesSeen,
  sendMessage,
  unseenMessages
} from "../../Controller/messageController/messageController.js";

import upload from "../../Config/multer.js";

const messageRouter = express.Router();

// ==============================
// MESSAGES
// ==============================

// GET unseen messages
messageRouter.get(
  "/messages/unseen",
  protectUser,
  unseenMessages
);

// GET chat messages with a user
messageRouter.get(
  "/chat/messages/:id",
  protectUser,
  getUserMessages
);

// MARK messages as seen
messageRouter.post(
  "/messages/:id/seen",
  protectUser,
  markMessagesSeen
);

// SEND message (TEXT + IMAGE)
// ⚠️ protectUser MUST run BEFORE upload
messageRouter.post(
  "/send/messages/:id",
  protectUser,
  upload.single("image"),
  sendMessage
);

export default messageRouter;
