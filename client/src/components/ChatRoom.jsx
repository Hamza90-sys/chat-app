import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import socket from "../socket";

const API_URL = "http://localhost:3000/api/rooms";

function ChatRoom() {
  const { id: roomId } = useParams();
  const navigate = useNavigate();
  const [room, setRoom] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState("");

  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user") || "null");

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

    return () => {
      socket.emit("leaveRoom", { roomId, username: user.username });
      socket.off("roomUsers");
      socket.off("userJoined");
      socket.off("userLeft");
    };
  }, [roomId]);

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
          <h3>Online Members ({members.length})</h3>
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
          <div className="chat-placeholder">
            <p>Welcome to <strong>{room.name}</strong>!</p>
            <p>Chat messaging will be implemented next.</p>
          </div>
        </main>
      </div>
    </div>
  );
}

export default ChatRoom;
