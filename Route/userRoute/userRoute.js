import express from "express";
import {
  acceptFriendRequest,
  accountVerification,
  deleteUser,
  followUser,
  getUserConnections,
  getUserProfile,
  otpVerification,
  resetOtp,
  sendConnectionRequest,
  submitingUserPassword,
  unfollowUser,
  updateUserProfile,
  userLogin,
  userRegistration
} from "../../Controller/userController/userController.js";


import upload from "../../Config/multer.js";
import protectUser from "../../Middleware/AuthMiddleware/AuthMiddleware.js";

const userRouter = express.Router();

// ==============================
// USER AUTH
// ==============================

// Register user
userRouter.post(
  "/user-registration",
  upload.fields([
    { name: "image", maxCount: 1 },
    { name: "coverPhoto", maxCount: 1 }
  ]),
  userRegistration
);

// Login user (FIXED SPELLING OPTIONAL)
userRouter.post("/user-login", userLogin);

// ==============================
// USER PROFILE
// ==============================

// Get profile
userRouter.get(
  "/user-profile-page",
  protectUser,
  getUserProfile
);

// Update profile (FIXED FIELD + ORDER)
userRouter.put(
  "/update-user-profile",
  protectUser,
  upload.fields([
    { name: "image", maxCount: 1 },
    { name: "coverPhoto", maxCount: 1 } // FIXED
  ]),
  updateUserProfile
);

// Delete account
userRouter.delete(
  "/delete-user-account",
  protectUser,
  deleteUser
);

// ==============================
// OTP / ACCOUNT VERIFICATION
// ==============================

userRouter.post(
  "/user-otp-verification",
  protectUser,
  otpVerification
);

userRouter.post(
  "/user-account-verification",
  protectUser,
  accountVerification
);

userRouter.post(
  "/user-reset-otp",
  protectUser,
  resetOtp
);

userRouter.post(
  "/user-reset-password",
  protectUser,
  submitingUserPassword
);

// ==============================
// FOLLOW SYSTEM
// ==============================

userRouter.post(
  "/follow-user/:id",
  protectUser,
  followUser
);

userRouter.post(
  "/unfollow-user/:id",
  protectUser,
  unfollowUser
);

// ==============================
// FRIEND CONNECTION SYSTEM
// ==============================

userRouter.post(
  "/connection/send/:id",
  protectUser,
  sendConnectionRequest
);

userRouter.get(
  "/connections",
  protectUser,
  getUserConnections
);

userRouter.post(
  "/connection/accept/:id",
  protectUser,
  acceptFriendRequest
);

export default userRouter;
