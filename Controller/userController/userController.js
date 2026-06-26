import validator from "validator";
import User from "../../Model/User/User.js";
import bcrypt from "bcrypt";
import generateToken from "../../Utils/generateToken.js";
import { v2 as cloudinary } from "cloudinary";
import transporter from "../../Utils/transporter.js";
import fs from "fs";
import Connection from "../../Model/Connection/Connection.js";
import { v4 as uuidv4 } from "uuid";
import mongoose from "mongoose";

const userRegistration = async (req, res) => {
  try {
    const { name, email, password, location, dob, bio } = req.body;

    const image = req.files?.image?.[0];
    const coverPhoto = req.files?.coverPhoto?.[0];

    // Validation
    if (!name?.trim() || !email?.trim() || !password?.trim()) {
      return res.status(400).json({
        success: false,
        message: "All fields are required"
      });
    }

    if (!validator.isEmail(email)) {
      return res.status(400).json({
        success: false,
        message: "Invalid email"
      });
    }

    const normalizedEmail = email.toLowerCase();

    const passwordRegex =
      /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[@#$%^&*!]).{8,}$/;

    if (!passwordRegex.test(password)) {
      return res.status(400).json({
        success: false,
        message: "Weak password"
      });
    }

    const existingUser = await User.findOne({ email: normalizedEmail });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User already exists"
      });
    }

    let imageUrl = null;
    let coverPhotoUrl = null;

    if (image?.path) {
      const upload = await cloudinary.uploader.upload(image.path, {
        folder: "users/images"
      });
      imageUrl = upload.secure_url;
    }

    if (coverPhoto?.path) {
      const upload = await cloudinary.uploader.upload(coverPhoto.path, {
        folder: "covers/images"
      });
      coverPhotoUrl = upload.secure_url;
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email: normalizedEmail,
      password: hashedPassword,
      location,
      dob,
      bio,
      image: imageUrl,
      coverPhoto: coverPhotoUrl
    });

    const token = generateToken(user._id);

    return res.status(201).json({
      success: true,
      message: `${user.name} registered successfully`,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        image: user.image,
        bio: user.bio,
        location: user.location,
        coverPhoto: user.coverPhoto,
        dob: user.dob
      },
      token
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};

const userLogin = async (req, res) => {
  const { email, password } = req.body;

  // Find the user by his or her unique property in this case it is email
  const user = await User.findOne({ email });

  if (!user) {
    return res.status(404).json({
      message: "User is not existing"
    });
  }

  // But if the user email is existing then we need to check the password 

  const passwordIsMatching = await bcrypt.compare(password, user.password);

  if (!passwordIsMatching) {
    return res.status(400).json({
      message: "Password is not matching"
    });
  }

  const token = generateToken(user._id);

  return res.status(200).json({
    success: true,
    message: `${user.name} is successfully logged in`,
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      image: user.image,
      bio: user.bio,
      location: user.location,
      coverPhoto: user.coverPhoto,
      dob: user.dob
    },
    token
  });
}

const getUserProfile = async (req, res) => {
  try {
    const userId = req.user._id;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User is not found"
      });
    };

    return res.status(200).json({
      success: true,
      message: "User profile fetched successfully",
      data: user,
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

const updateUserProfile = async (req, res) => {
  try {
    const user = req.user; // user populated by protect middleware

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized user",
      });
    }

    // Build update object safely
    const updateUser = {};

    // TEXT FIELDS
    if (req.body.name) updateUser.name = req.body.name;
    if (req.body.location) updateUser.location = req.body.location;
    if (req.body.bio) updateUser.bio = req.body.bio;
    if (req.body.dob) updateUser.dob = new Date(req.body.dob);
    if (req.body.password) updateUser.password = req.body.password; // ⚠️ hash later if needed

    // FILES (Cloudinary upload)
    if (req.files?.image) {
      // Delete previous image if exists
      if (user.image) {
        const publicId = user.image.split("/").pop().split(".")[0];
        await cloudinary.uploader.destroy(`users/images/${publicId}`);
      }
      const result = await cloudinary.uploader.upload(req.files.image[0].path, {
        folder: "users/images",
        public_id: `profile_${user._id}`,
        overwrite: true,
      });
      updateUser.image = result.secure_url;
    }

    if (req.files?.coverPhoto) {
      if (user.coverPhoto) {
        const publicId = user.coverPhoto.split("/").pop().split(".")[0];
        await cloudinary.uploader.destroy(`covers/images/${publicId}`);
      }
      const result = await cloudinary.uploader.upload(req.files.coverPhoto[0].path, {
        folder: "covers/images",
        public_id: `cover_${user._id}`,
        overwrite: true,
      });
      updateUser.coverPhoto = result.secure_url;
    }

    // Update user in DB
    const updatedUser = await User.findByIdAndUpdate(
      user._id,
      updateUser,
      { new: true, runValidators: true }
    );

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: "User not found for update",
      });
    }

    return res.status(200).json({
      success: true,
      message: `${updatedUser.name}'s profile is successfully updated`,
      user: updatedUser,
    });

  } catch (error) {
    console.error("UPDATE PROFILE ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

const deleteUser = async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId);

    if (user.image) {
      const publicId = user.image.split('/').pop().split('.')[0]
      await cloudinary.uploader.destroy(`users/images/${publicId}`)
    };

    if (user.coverPhoto) {
      const publicId = user.coverPhoto.split('/').pop().split('.')[0]
      await cloudinary.uploader.destroy(`covers/images/${publicId}`)
    };

    await User.findByIdAndDelete(user._id);

    return res.status(200).json({
      success: true,
      message: "User is deleted successfully"
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
}

const otpVerification = async (req, res) => {
  try {
    console.log("USER:", req.user);

    const userId = req.user._id;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        message: "No user is found"
      });
    }

    // ✅ FIXED OTP
    const otp = String(Math.floor(100000 + Math.random() * 900000));

    user.verifyOtp = otp;

    // ✅ FIXED EXPIRY (10 min)
    user.verifyOtpExpireAt = Date.now() + 10 * 60 * 1000;

    await user.save();

    const mailOptions = {
      from: process.env.SMTP_USER,
      to: user.email,
      subject: 'Account verification otp',
      text: `Your OTP is ${otp}. Verify your account using this otp`
    };

    await transporter.verify();
console.log("SMTP Connected");

await transporter.sendMail(mailOptions);

console.log("Mail Sent");

    return res.json({
      success: true,
      message: `${user.name}, otp is successfully sent to your email`
    });

  } catch (error) {
    console.log("OTP ERROR:", error); // 🔥 VERY IMPORTANT

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const accountVerification = async (req, res) => {
  try {
    const { otp } = req.body;

    const userId = req.user._id;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found!"
      });
    }

    if (!user.verifyOtp || String(user.verifyOtp).trim() !== String(otp).trim()) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP"
      });
    }

    if (user.verifyOtpExpireAt === null || new Date(user.verifyOtpExpireAt).getTime() < Date.now()) {
      return res.status(400).json({
        success: false,
        message: "OTP is expired"
      });
    }

    user.isAccountVerified = true;

    // Reset OTP fields
    user.verifyOtp = null;
    user.verifyOtpExpireAt = null;

    await user.save();

    return res.json({
      success: true,
      message: "OTP successfully verified!"
    });

  } catch (error) {
    console.log("ACCOUNT VERIFICATION ERROR:", error); // 🔥 Always log
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};


const resetOtp = async (req,res) => {
  try {
    const userId = req.user._id;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        message: "User is not found"
      });
    };

    const otp = String(Math.floor(100000 + Math.random() * 90000));

    user.resetOtp = otp;
    user.resetOtpExpireAt = Date.now() * 24 * 60 * 60 * 1000;

    await user.save();

    const mailOptions = {
      from: process.env.SMTP_USER,
      to: user.email,
      subject: 'Account verification otp',
      text: `${user.name} OTP is ${otp}. Verify your account using this otp`
    }

    await transporter.sendMail(mailOptions);

    return res.json({
      success: true,
      message: `${user.name}, your otp is sent to your email`
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
}

const submitingUserPassword = async (req, res) => {
  try {

    const { otp, password } = req.body;

    const userId = req.user._id;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        messsage: "User is not found"
      });
    }

    if (user.resetOtp === "" || user.resetOtp !== otp) {
      return res.status(400).json({
        message: "Otp is not matching !"
      });
    };

    if (user.resetOtpExpireAt < Date.now()) {
      return res.status(400).json({
        success: false,
        message: "Otp is already expired"
      });
    };

    user.password = await bcrypt.hash(password, 10);

    user.resetOtp = '';
    user.resetOtpExpireAt = '';

    await user.save();

    return res.json({
      success: true,
      message: "OTP is successfully verified !"
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
}

const followUser = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({
      success:false,
      message:"Not valid id"
    });

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User is not found"
      });
    }

    const toUser = await User.findById(id);

    if (!toUser) {
      return res.status(404).json({
        success: false,
        message: "User is not found"
      })
    }

    if (user.following.some((f) => f.toString() === id)) {
      return res.status(409).json({
        success: false,
        message: `${user.name} is following ${toUser.name}`
      });
    }

    user.following.push(id);
    await user.save();

    toUser.followers.push(userId);
    await toUser.save();

    return res.status(200).json({ success: true, message: `${user.name} is following ${toUser.name}` });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
}

const unfollowUser = async (req, res) => {
  try {
    const userId = req.user._id;
    const { id } = req.params;

    if (userId.toString() === id) {
      return res.status(400).json({ success: false, message: "You cannot unfollow yourself" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const toUser = await User.findById(id);
    if (!toUser) {
      return res.status(404).json({ success: false, message: "Target user not found" });
    }

    // Remove target user from following
    user.following = user.following.filter(f => f.toString() !== id);

    // Remove current user from target's followers
    toUser.followers = toUser.followers.filter(f => f.toString() !== userId.toString());

    // Save both users concurrently
    await Promise.all([user.save(), toUser.save()]);

    return res.status(200).json({
      success: true,
      message: `${user.name} unfollowed ${toUser.name}`
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

const sendConnectionRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    if (userId.toString() === id) {
      return res.status(400).json({ success: false, message: "You cannot send a friend request to yourself" });
    }

    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const count = await Connection.countDocuments({ from_user_id: userId, created_at: { $gt: last24Hours } });

    if (count >= 20) {
      return res.status(400).json({
        success: false,
        message: "You have sent more than 20 connection requests in the last 24 hours"
      });
    }

    const connection = await Connection.findOne({
      $or: [
        { from_user_id: userId, to_user_id: id },
        { to_user_id: userId, from_user_id: id }
      ]
    });

    if (!connection) {
      await Connection.create({
        from_user_id: userId,
        to_user_id: id,
        status: 'pending' // add a default status
      });
      return res.status(201).json({
        success: true,
        message: "Friend request has been sent"
      });
    } else if (connection.status === 'pending') {
      return res.status(409).json({
        success: false,
        message: "Friend request already pending"
      });
    } else if (connection.status === 'accepted') {
      return res.status(409).json({
        success: false,
        message: "You are already connected"
      });
    }

  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

const getUserConnections = async (req, res) => {
  try {
    const userId = req.user._id;

    const user = await User.findById(userId)
      .populate('connection following followers', 'name image email createdAt');

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // Map timestamps to `created_at`
    const connections = user.connection.map(u => ({
      _id: u._id,
      name: u.name,
      email: u.email,
      image: u.image,
      created_at: u.createdAt
    }));

    const following = user.following.map(u => ({
      _id: u._id,
      name: u.name,
      email: u.email,
      image: u.image,
      created_at: u.createdAt
    }));

    const followers = user.followers.map(u => ({
      _id: u._id,
      name: u.name,
      email: u.email,
      image: u.image,
      created_at: u.createdAt
    }));

    // Pending friend requests sent TO this user
    const pendingRequests = await Connection.find({ to_user_id: userId, status: "pending" })
      .populate('from_user_id', 'name image email dob location')
      .sort({ createdAt: -1 }); // newest first

    const pendingConnections = pendingRequests.map(connection => ({
      user: connection.from_user_id,
      requestedAt: connection.createdAt,
      hoursSinceRequest: connection.createdAt
        ? Math.floor((Date.now() - new Date(connection.createdAt).getTime()) / 1000 / 3600)
        : 0
    }));

    return res.status(200).json({
      success: true,
      connections,
      following,
      followers,
      pendingConnections,
      pendingRequests,
      countFollowing: following.length,
      countFollowers: followers.length,
      countPendingConnections: pendingConnections.length,
      countConnections: connections.length,
      countPendingRequests: pendingRequests.length
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

const acceptFriendRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const connection = await Connection.findOne({ from_user_id: id, to_user_id: userId });

    if (!connection) {
      return res.status(404).json({ success: false, message: "No connection request found" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const toUser = await User.findById(id);
    if (!toUser) {
      return res.status(404).json({ success: false, message: "Requesting user not found" });
    }

    // Prevent duplicates
    if (!user.connection.includes(id)) user.connection.push(id);
    if (!toUser.connection.includes(userId)) toUser.connection.push(userId);

    // Accept the connection
    connection.status = 'accepted';

    await Promise.all([user.save(), toUser.save(), connection.save()]);

    return res.status(200).json({ success: true, message: "Friend request accepted" });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};


export {
  userRegistration,
  userLogin,
  getUserProfile,
  updateUserProfile,
  otpVerification,
  accountVerification,
  resetOtp,
  submitingUserPassword,
  deleteUser,
  followUser,
  unfollowUser,
  sendConnectionRequest,
  getUserConnections,
  acceptFriendRequest
};
