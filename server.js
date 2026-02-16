const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const mongoose = require("mongoose");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const authRoutes = require("./routes/auth");
const chatRoomRoutes = require("./routes/chatRooms");
const ChatRoom = require("./models/ChatRoom");
const Message = require("./models/Message");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// --------------- Middleware ---------------
app.use(cors({ origin: "http://localhost:5173", credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static("public"));

// --------------- Routes ---------------
app.use("/api/auth", authRoutes);
app.use("/api/rooms", chatRoomRoutes);

// --------------- MongoDB Connection ---------------
const MONGO_URI = "mongodb://localhost:27017/chat-app";

mongoose
  .connect(MONGO_URI)
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// --------------- Socket.io ---------------
io.on("connection", (socket) => {
  console.log(`🟢 User connected: ${socket.id}`);

  // Join a chat room via Socket.IO
  socket.on("joinRoom", async ({ roomId, username }) => {
    socket.join(roomId);
    console.log(`${username} joined room ${roomId}`);

    // Broadcast updated member list to the room
    try {
      const room = await ChatRoom.findById(roomId).populate("members", "username");
      if (room) {
        io.to(roomId).emit("roomUsers", {
          roomId,
          members: room.members,
        });
      }
    } catch (err) {
      console.error("Socket joinRoom error:", err);
    }

    socket.to(roomId).emit("userJoined", { username, roomId });
  });

  // Send a message
  socket.on("sendMessage", async ({ roomId, userId, username, content }) => {
    try {
      const message = await Message.create({
        room: roomId,
        sender: userId,
        content,
      });

      const populated = await message.populate("sender", "username");

      io.to(roomId).emit("newMessage", {
        _id: populated._id,
        content: populated.content,
        sender: populated.sender,
        room: roomId,
        createdAt: populated.createdAt,
      });
    } catch (err) {
      console.error("Socket sendMessage error:", err);
    }
  });

  // Fetch message history for a room
  socket.on("getMessages", async ({ roomId }) => {
    try {
      const messages = await Message.find({ room: roomId })
        .populate("sender", "username")
        .sort({ createdAt: 1 })
        .limit(100);

      socket.emit("messageHistory", { roomId, messages });
    } catch (err) {
      console.error("Socket getMessages error:", err);
    }
  });

  // Typing indicator
  socket.on("typing", ({ roomId, username }) => {
    socket.to(roomId).emit("userTyping", { roomId, username });
  });

  socket.on("stopTyping", ({ roomId, username }) => {
    socket.to(roomId).emit("userStopTyping", { roomId, username });
  });

  // Leave a chat room via Socket.IO
  socket.on("leaveRoom", async ({ roomId, username }) => {
    socket.leave(roomId);
    console.log(`${username} left room ${roomId}`);

    try {
      const room = await ChatRoom.findById(roomId).populate("members", "username");
      if (room) {
        io.to(roomId).emit("roomUsers", {
          roomId,
          members: room.members,
        });
      }
    } catch (err) {
      console.error("Socket leaveRoom error:", err);
    }

    socket.to(roomId).emit("userLeft", { username, roomId });
  });

  socket.on("disconnect", () => {
    console.log(`🔴 User disconnected: ${socket.id}`);
  });
});

// --------------- Start Server ---------------
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
