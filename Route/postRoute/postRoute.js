import express from "express";
import protectUser from "../../Middleware/AuthMiddleware/AuthMiddleware.js";
import { createPost, deletePost, getPosts, postLikes, updatePost } from "../../Controller/postController/postController.js";
import upload from "../../Config/multer.js";

const postRouter = express.Router();

// @Post request for creating posts
postRouter.post('/create/post', protectUser, upload.single("image"), createPost);
// @Post request for liking posts
postRouter.post('/toggling/post/:id', protectUser, postLikes);
// @Get request for getting posts
postRouter.get('/fetching/posts', protectUser, getPosts);
// @Put request for updating posts
postRouter.put('/update/post/:id', upload.single("image"), protectUser, updatePost)
// @Post request for deleting posts
postRouter.delete('/delete/post/:id', protectUser, deletePost);

export default postRouter;