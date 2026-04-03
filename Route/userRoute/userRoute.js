import express from "express";
import { acceptFriendRequest, accountVerification, deleteUser, followUser, getUserConnections, getUserProfile, otpVerification, resetOtp, sendConnectionRequest, submitingUserPassword, unfollowUser, updateUserProfile, userLogin, userRegistration } from "../../Controller/userController/userController.js";
import upload from "../../Config/multer.js";
import protectUser from "../../Middleware/AuthMiddleware/AuthMiddleware.js";

const userRouter = express.Router();

// Routes for User model or userController

// ....................User account operations.........................

// @Post request for userRegistration
userRouter.post('/user-registration', upload.fields([{ name: 'image', maxCount: 1 }, { name: 'coverPhoto', maxCount: 1 }]), userRegistration);
// @Post request for userLoggin
userRouter.post('/user-loggin', userLogin);
// @Get request get user profile
userRouter.get('/user-profile-page', protectUser, getUserProfile);
// @Put request for updating user-profile
userRouter.put('/update-user-profile', upload.fields([{ name: "image", maxCount: 1 }, { name: "covers", maxCount: 1 }]), protectUser, updateUserProfile);
// @Delete request for deleting for deleteUser
userRouter.delete('/delete-user-account', protectUser, deleteUser);

// ....................Account verification operations...................

// @Post request for otpVerification
userRouter.post('/user-otpVerification', protectUser, otpVerification);
// @Post request for verifingAccount
userRouter.post('/user-verifing-account', protectUser, accountVerification);
// @Post request for resetOtp
userRouter.post('/user-resetingOtp', protectUser, resetOtp);
// @Post request for submitingUserNewPassword
userRouter.post('/user-passwordChanging', protectUser, submitingUserPassword);


// ....................User follow / unfollow............................

// @Post request for following users
userRouter.post('/follow-user/:id', protectUser, followUser);
// @Post request for unfollowing users
userRouter.post('/unfollow-user/:id', protectUser, unfollowUser);

//.....................Friend requests and connections....................

//@Post request for sending a friend request
userRouter.post('/connection/send/:id', protectUser, sendConnectionRequest);
// @Get request for getting following followers connections of user account
userRouter.get('/connections', protectUser, getUserConnections);
// @Post request for accepting friends
userRouter.post('/connection/accept/:id', protectUser, acceptFriendRequest);


export default userRouter;