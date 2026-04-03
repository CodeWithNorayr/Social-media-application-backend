import express from "express";
import fetchingUsers from "../../Controller/userController/totalUsersController.js";
import protectUser from "../../Middleware/AuthMiddleware/AuthMiddleware.js";

const totalUserRouter = express.Router();

totalUserRouter.get("/application/users", protectUser, fetchingUsers);

export default totalUserRouter;