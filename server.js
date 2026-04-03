import express from "express";
import cors from "cors";
import "dotenv/config";
import { connectDB } from "./Config/db.js";
import userRouter from "./Route/userRoute/userRoute.js";
import connectCloudinary from "./Config/cloudinary.js";
import postRouter from "./Route/postRoute/postRoute.js";
import messageRouter from "./Route/messageRoute/messageRoute.js";
import { Server } from "socket.io";
import { createServer } from "http";
import totalUserRouter from "./Route/userRoute/totalUsersRoute.js";

const app = express();
const server = createServer(app);
export const io = new Server(server, {
  cors: {
    origin: "https://social-media-application-frontend-vl2g.onrender.com",
    methods: ["GET", "POST"],
    credentials: true
  }
});
const PORT = process.env.PORT || 4000;

// Middlewares
app.use(express.json());

app.use(cors({
  origin: "https://social-media-application-frontend-vl2g.onrender.com", // 🔹 frontend URL
  credentials: true               // 🔹 allow cookies/auth headers
}));

// Routes
app.get("/", (req, res) => {
  res.send("Hello My Fellow Bro");
});

// User Model's endpoints
app.use('/api/user',userRouter);
// Fetching all Users from the system
app.use('/api/total/users', totalUserRouter);
// Post Model's endpoints
app.use('/api/post',postRouter);
// Message Model's endpoints
app.use('/api/message',messageRouter);

export const userSocketMap = {};

// Handle Socket io connections 
io.on('connection', (socket) => {
  const userId = socket.handshake.query.userId
  console.log('A user connected', userId);

  if(userId) userSocketMap[userId] = socket.id;

    io.emit('getOnlineUsers', Object.keys(userSocketMap));

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('A user disconnected', userId);
    delete userSocketMap[userId];
    io.emit("getOnlineUsers", Object.keys(userSocketMap))
  });
});

// Start server properly
const startServer = async () => {
  try {
    await connectDB();
    await connectCloudinary();
    server.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });

  } catch (error) {
    console.error("Server failed to start:", error);
    process.exit(1);
  }
};

startServer();
