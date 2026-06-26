import express from "express";
import protectUser from "../../Middleware/AuthMiddleware/AuthMiddleware.js";
import {
  createPost,
  deletePost,
  getPosts,
  postLikes,
  updatePost
} from "../../Controller/postController/postController.js";

import upload from "../../Config/multer.js";

const postRouter = express.Router();

// ==============================
// CREATE POST
// ==============================
postRouter.post(
  "/create/post",
  protectUser,
  upload.single("image"),
  createPost
);

// ==============================
// LIKE / UNLIKE POST
// ==============================
postRouter.post(
  "/toggling/post/:id",
  protectUser,
  postLikes
);

// ==============================
// GET POSTS FEED
// ==============================
postRouter.get(
  "/fetching/posts",
  protectUser,
  getPosts
);

// ==============================
// UPDATE POST (FIXED ORDER)
// ==============================
postRouter.put(
  "/update/post/:id",
  protectUser,
  upload.single("image"),
  updatePost
);

// ==============================
// DELETE POST
// ==============================
postRouter.delete(
  "/delete/post/:id",
  protectUser,
  deletePost
);

export default postRouter;
