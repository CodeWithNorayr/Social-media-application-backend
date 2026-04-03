import Post from "../../Model/Post/Post.js";
import User from "../../Model/User/User.js";
import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import mongoose from "mongoose";

// Create Post
const createPost = async (req, res) => {
  try {
    const userId = req.user._id; // ObjectId now

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    const { text } = req.body;
    const image = req.file;

    if (!text && !image) return res.status(400).json({ success: false, message: "Text or image is required" });

    let imageUrl = null;
    if (image) {
      const uploadResult = await cloudinary.uploader.upload(image.path, { folder: "posts/images" });
      imageUrl = uploadResult.secure_url;
    }

    const newPost = await Post.create({ text, image: imageUrl, user: user._id });

    return res.status(201).json({ success: true, message: "Post successfully created", post: newPost });
  } catch (error) {
    console.error("CREATE POST ERROR:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// Like / Unlike Post
const postLikes = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const post = await Post.findById(id);
    if (!post) return res.status(404).json({ success: false, message: "Post not found" });

    const liked = post.likes.some(uid => uid.toString() === userId.toString());
    if (liked) {
      post.likes = post.likes.filter(uid => uid.toString() !== userId.toString());
      await post.save();
      return res.json({ success: true, message: "Post unliked" });
    } else {
      post.likes.push(userId);
      await post.save();
      return res.json({ success: true, message: "Post liked" });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error" });
  }
};

// Get Posts
const getPosts = async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    const userIds = [userId, ...user.connection, ...user.following];

    const posts = await Post.find({ user: { $in: userIds } })
      .populate("user", "name image")
      .sort({ createdAt: -1 });

    return res.json({ success: true, posts });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error" });
  }
};

// Delete Post
const deletePost = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ success: false, message: "Invalid post ID" });

    const post = await Post.findById(id);
    if (!post) return res.status(404).json({ success: false, message: "Post not found" });

    if (post.user.toString() !== userId.toString()) return res.status(403).json({ success: false, message: "Unauthorized" });

    await post.deleteOne();
    return res.status(200).json({ success: true, message: "Post deleted" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error" });
  }
};

// Update Post
const updatePost = async (req, res) => {
  try {
    const { id } = req.params;
    const { text } = req.body;
    const image = req.file;
    const userId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ success: false, message: "Invalid post ID" });
    if (!text && !image) return res.status(400).json({ success: false, message: "At least one field is required" });

    const post = await Post.findById(id);
    if (!post) return res.status(404).json({ success: false, message: "Post not found" });

    if (post.user.toString() !== userId.toString()) return res.status(403).json({ success: false, message: "Unauthorized action" });

    const updateData = {};
    if (text) updateData.text = text;

    if (image) {
      if (post.image) {
        const publicId = post.image.split("/").pop().split(".")[0];
        await cloudinary.uploader.destroy(`posts/images/${publicId}`);
      }

      const uploadResult = await cloudinary.uploader.upload(image.path, { folder: "posts/images" });
      updateData.image = uploadResult.secure_url;
    }

    const updatedPost = await Post.findByIdAndUpdate(id, updateData, { new: true, runValidators: true });
    return res.status(200).json({ success: true, message: "Post updated successfully", post: updatedPost });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error" });
  }
};

export { createPost, postLikes, getPosts, deletePost, updatePost };