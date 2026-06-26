import Post from "../../Model/Post/Post.js";
import User from "../../Model/User/User.js";
import { v2 as cloudinary } from "cloudinary";
import mongoose from "mongoose";
import fs from "fs";

// ==============================
// CREATE POST
// ==============================
const createPost = async (req, res) => {
  try {
    const userId = req.user._id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    const { text } = req.body;
    const image = req.file;

    if (!text && !image) {
      return res.status(400).json({
        success: false,
        message: "Text or image is required"
      });
    }

    let imageUrl = null;

    if (image) {
      const uploadResult = await cloudinary.uploader.upload(image.path, {
        folder: "posts/images"
      });

      imageUrl = uploadResult.secure_url;

      // remove local file after upload
      await fs.promises.unlink(image.path).catch(() => {});
    }

    const newPost = await Post.create({
      text,
      image: imageUrl,
      user: user._id,
      likes: []
    });

    return res.status(201).json({
      success: true,
      message: "Post successfully created",
      post: newPost
    });

  } catch (error) {
    console.error("CREATE POST ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};

// ==============================
// LIKE / UNLIKE POST (ATOMIC)
// ==============================
const postLikes = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid post ID"
      });
    }

    const post = await Post.findById(id);
    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found"
      });
    }

    const isLiked = post.likes.some(
      (uid) => uid.toString() === userId.toString()
    );

    if (isLiked) {
      await Post.findByIdAndUpdate(id, {
        $pull: { likes: userId }
      });

      return res.json({
        success: true,
        message: "Post unliked"
      });
    } else {
      await Post.findByIdAndUpdate(id, {
        $addToSet: { likes: userId }
      });

      return res.json({
        success: true,
        message: "Post liked"
      });
    }

  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};

// ==============================
// GET POSTS (FEED + PAGINATION)
// ==============================
const getPosts = async (req, res) => {
  try {
    const userId = req.user._id;
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    const userIds = [
      userId,
      ...(user.connection || []),
      ...(user.following || [])
    ];

    const posts = await Post.find({
      user: { $in: userIds }
    })
      .populate("user", "name image")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const totalPosts = await Post.countDocuments({
      user: { $in: userIds }
    });

    return res.json({
      success: true,
      posts,
      pagination: {
        page,
        limit,
        totalPages: Math.ceil(totalPosts / limit),
        totalPosts
      }
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};

// ==============================
// DELETE POST (WITH CLOUDINARY CLEANUP)
// ==============================
const deletePost = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid post ID"
      });
    }

    const post = await Post.findById(id);
    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found"
      });
    }

    if (post.user.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized"
      });
    }

    // delete image from cloudinary if exists
    if (post.image) {
      const publicId = post.image.split("/").pop().split(".")[0];

      await cloudinary.uploader.destroy(
        `posts/images/${publicId}`
      );
    }

    await Post.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: "Post deleted"
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};

// ==============================
// UPDATE POST (SAFE IMAGE REPLACEMENT)
// ==============================
const updatePost = async (req, res) => {
  try {
    const { id } = req.params;
    const { text } = req.body;
    const image = req.file;
    const userId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid post ID"
      });
    }

    if (!text && !image) {
      return res.status(400).json({
        success: false,
        message: "At least one field is required"
      });
    }

    const post = await Post.findById(id);
    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found"
      });
    }

    if (post.user.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized action"
      });
    }

    const updateData = {};

    if (text) {
      updateData.text = text;
    }

    // handle image replacement safely
    if (image) {
      // upload NEW image first
      const uploadResult = await cloudinary.uploader.upload(image.path, {
        folder: "posts/images"
      });

      updateData.image = uploadResult.secure_url;

      await fs.promises.unlink(image.path).catch(() => {});

      // delete OLD image after success
      if (post.image) {
        const publicId = post.image.split("/").pop().split(".")[0];

        await cloudinary.uploader.destroy(
          `posts/images/${publicId}`
        );
      }
    }

    const updatedPost = await Post.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    return res.status(200).json({
      success: true,
      message: "Post updated successfully",
      post: updatedPost
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
  createPost,
  postLikes,
  getPosts,
  deletePost,
  updatePost
};
