const express = require("express");
const ChatRoom = require("../models/ChatRoom");
const authMiddleware = require("../middleware/auth");

const router = express.Router();

// All chat room routes require authentication
router.use(authMiddleware);

// ==================== CREATE ROOM ====================
router.post("/", async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({ message: "Room name is required." });
    }

    const existing = await ChatRoom.findOne({ name });
    if (existing) {
      return res.status(409).json({ message: "A room with that name already exists." });
    }

    const room = await ChatRoom.create({
      name,
      description: description || "",
      createdBy: req.user.id,
      members: [req.user.id],
    });

    const populated = await room.populate("members", "username");

    res.status(201).json({ message: "Room created.", room: populated });
  } catch (err) {
    console.error("Create room error:", err);
    res.status(500).json({ message: "Server error while creating room." });
  }
});

// ==================== GET ALL ROOMS ====================
router.get("/", async (req, res) => {
  try {
    const rooms = await ChatRoom.find()
      .populate("members", "username")
      .populate("createdBy", "username")
      .sort({ createdAt: -1 });

    res.status(200).json({ rooms });
  } catch (err) {
    console.error("Get rooms error:", err);
    res.status(500).json({ message: "Server error while fetching rooms." });
  }
});

// ==================== GET SINGLE ROOM ====================
router.get("/:id", async (req, res) => {
  try {
    const room = await ChatRoom.findById(req.params.id)
      .populate("members", "username")
      .populate("createdBy", "username");

    if (!room) {
      return res.status(404).json({ message: "Room not found." });
    }

    res.status(200).json({ room });
  } catch (err) {
    console.error("Get room error:", err);
    res.status(500).json({ message: "Server error while fetching room." });
  }
});

// ==================== JOIN ROOM ====================
router.post("/:id/join", async (req, res) => {
  try {
    const room = await ChatRoom.findById(req.params.id);

    if (!room) {
      return res.status(404).json({ message: "Room not found." });
    }

    if (room.members.includes(req.user.id)) {
      return res.status(400).json({ message: "You are already in this room." });
    }

    room.members.push(req.user.id);
    await room.save();

    const populated = await room.populate("members", "username");

    res.status(200).json({ message: "Joined room.", room: populated });
  } catch (err) {
    console.error("Join room error:", err);
    res.status(500).json({ message: "Server error while joining room." });
  }
});

// ==================== LEAVE ROOM ====================
router.post("/:id/leave", async (req, res) => {
  try {
    const room = await ChatRoom.findById(req.params.id);

    if (!room) {
      return res.status(404).json({ message: "Room not found." });
    }

    if (!room.members.includes(req.user.id)) {
      return res.status(400).json({ message: "You are not in this room." });
    }

    room.members = room.members.filter(
      (memberId) => memberId.toString() !== req.user.id
    );
    await room.save();

    const populated = await room.populate("members", "username");

    res.status(200).json({ message: "Left room.", room: populated });
  } catch (err) {
    console.error("Leave room error:", err);
    res.status(500).json({ message: "Server error while leaving room." });
  }
});

module.exports = router;
