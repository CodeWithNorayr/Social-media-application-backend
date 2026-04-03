import express from "express";
import protectUser from "../../Middleware/AuthMiddleware/AuthMiddleware.js";
import { getUserMessages, markMessagesSeen, sendMessage, unseenMessages } from "../../Controller/messageController/messageController.js";
import upload from "../../Config/multer.js";

const messageRouter = express.Router();

// ..................Messages.................

// @Get request for unseen messages
messageRouter.get('/messages/unseen', protectUser, unseenMessages);
// @Get request for chat messages
messageRouter.get('/chat/messages/:id', protectUser, getUserMessages);
// @Post request for make messages seen
messageRouter.post('/messages/:id/seen', protectUser, markMessagesSeen);
// @Post request for sending messages
messageRouter.post('/send/messages/:id', upload.single('image'), protectUser, sendMessage);

export default messageRouter;