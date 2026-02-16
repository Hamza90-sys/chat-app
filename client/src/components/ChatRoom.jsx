import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import socket from "../socket";
import MessageForm from "./MessageForm";

const API_URL = "http://localhost:3000/api/rooms";

function formatTime(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function ChatRoom() {
  const { id: roomId } = useParams();
  const navigate = useNavigate();
  const [room, setRoom] = useState(null);
  const [members, setMembers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState("");
  const [typingUsers, setTypingUsers] = useState([]);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user") || "null");

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }

    // Fetch room details
    const fetchRoom = async () => {
      try {
        const res = await axios.get(`${API_URL}/${roomId}`, {
          headers: { Authorization: `Bearer ${token}` },
          withCredentials: true,
        });
        setRoom(res.data.room);
        setMembers(res.data.room.members);
      } catch (err) {
        console.error("Failed to fetch room:", err);
        navigate("/rooms");
      } finally {
        setLoading(false);
      }
    };

    fetchRoom();

    // Connect socket and join room
    if (!socket.connected) socket.connect();
    socket.emit("joinRoom", { roomId, username: user.username });

    // Request message history
    socket.emit("getMessages", { roomId });

    // Listen for message history
    socket.on("messageHistory", (data) => {
      if (data.roomId === roomId) {
        setMessages(data.messages);
      }
    });

    // Listen for new messages
    socket.on("newMessage", (msg) => {
      if (msg.room === roomId) {
        setMessages((prev) => [...prev, msg]);
      }
    });

    // Listen for real-time member updates
    socket.on("roomUsers", (data) => {
      if (data.roomId === roomId) {
        setMembers(data.members);
      }
    });

    socket.on("userJoined", (data) => {
      if (data.roomId === roomId) {
        setNotification(`${data.username} joined the room`);
        setTimeout(() => setNotification(""), 3000);
      }
    });

    socket.on("userLeft", (data) => {
      if (data.roomId === roomId) {
        setNotification(`${data.username} left the room`);
        setTimeout(() => setNotification(""), 3000);
      }
    });

    // Typing indicators
    socket.on("userTyping", (data) => {
      if (data.roomId === roomId) {
        setTypingUsers((prev) =>
          prev.includes(data.username) ? prev : [...prev, data.username]
        );
      }
    });

    socket.on("userStopTyping", (data) => {
      if (data.roomId === roomId) {
        setTypingUsers((prev) => prev.filter((u) => u !== data.username));
      }
    });

    return () => {
      socket.emit("leaveRoom", { roomId, username: user.username });
      socket.off("roomUsers");
      socket.off("userJoined");
      socket.off("userLeft");
      socket.off("messageHistory");
      socket.off("newMessage");
      socket.off("userTyping");
      socket.off("userStopTyping");
    };
  }, [roomId]);

  const handleSendMessage = (content) => {
    socket.emit("sendMessage", {
      roomId,
      userId: user.id,
      username: user.username,
      content,
    });
    socket.emit("stopTyping", { roomId, username: user.username });
  };

  const handleTyping = () => {
    socket.emit("typing", { roomId, username: user.username });
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit("stopTyping", { roomId, username: user.username });
    }, 2000);
  };

  const handleLeave = async () => {
    try {
      await axios.post(`${API_URL}/${roomId}/leave`, {}, {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true,
      });
      socket.emit("leaveRoom", { roomId, username: user.username });
      navigate("/rooms");
    } catch (err) {
      alert(err.response?.data?.message || "Failed to leave room.");
    }
  };

  if (loading) {
    return <p className="rooms-loading">Loading room...</p>;
  }

  if (!room) return null;

  return (
    <div className="chatroom-page">
      <header className="chatroom-header">
        <div>
          <h2>{room.name}</h2>
          {room.description && <p className="room-desc">{room.description}</p>}
        </div>
        <div className="chatroom-header-actions">
          <button className="btn btn-secondary" onClick={() => navigate("/rooms")}>
            ← Rooms
          </button>
          <button className="btn btn-danger" onClick={handleLeave}>
            Leave Room
          </button>
        </div>
      </header>

      {notification && <div className="notification">{notification}</div>}

      <div className="chatroom-body">
        <aside className="members-sidebar">
          <h3>Members ({members.length})</h3>
          <ul>
            {members.map((member) => (
              <li key={member._id}>
                <span className="member-dot"></span>
                {member.username}
              </li>
            ))}
          </ul>
        </aside>

        <main className="chat-area">
          <div className="messages-container">
            {messages.length === 0 ? (
              <div className="chat-placeholder">
                <p>Welcome to <strong>{room.name}</strong>!</p>
                <p>Send the first message to start the conversation.</p>
              </div>
            ) : (
              messages.map((msg) => {
                const isOwn = msg.sender?._id === user.id;
                return (
                  <div
                    key={msg._id}
                    className={`message ${isOwn ? "message-own" : "message-other"}`}
                  >
                    {!isOwn && (
                      <span className="message-sender">{msg.sender?.username}</span>
                    )}
                    <div className="message-bubble">
                      <p className="message-content">{msg.content}</p>
                      <span className="message-time">{formatTime(msg.createdAt)}</span>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {typingUsers.length > 0 && (
            <div className="typing-indicator">
              {typingUsers.join(", ")} {typingUsers.length === 1 ? "is" : "are"} typing...
            </div>
          )}

          <div onKeyDown={handleTyping}>
            <MessageForm onSend={handleSendMessage} />
          </div>
        </main>
      </div>
    </div>
  );
}

export default ChatRoom;
