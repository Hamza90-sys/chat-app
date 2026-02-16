import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";

const API_URL = "http://localhost:3000/api/rooms";

function ChatRoomList() {
  const navigate = useNavigate();
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user") || "null");

  useEffect(() => {
    fetchRooms();
  }, []);

  const fetchRooms = async () => {
    try {
      const res = await axios.get(API_URL, {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true,
      });
      setRooms(res.data.rooms);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load rooms.");
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async (roomId) => {
    try {
      await axios.post(`${API_URL}/${roomId}/join`, {}, {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true,
      });
      fetchRooms();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to join room.");
    }
  };

  const handleLeave = async (roomId) => {
    try {
      await axios.post(`${API_URL}/${roomId}/leave`, {}, {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true,
      });
      fetchRooms();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to leave room.");
    }
  };

  const isMember = (room) => {
    return room.members.some((m) => m._id === user?.id);
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "/login";
  };

  if (!user) {
    navigate("/login");
    return null;
  }

  return (
    <div className="rooms-page">
      <header className="rooms-header">
        <h1>Chat Rooms</h1>
        <div className="rooms-header-actions">
          <span className="user-badge">{user.username}</span>
          <Link to="/rooms/create" className="btn btn-primary">+ New Room</Link>
          <button className="btn btn-secondary" onClick={handleLogout}>Logout</button>
        </div>
      </header>

      {error && <p className="error-message" style={{ margin: "1rem auto", maxWidth: 600 }}>{error}</p>}

      {loading ? (
        <p className="rooms-loading">Loading rooms...</p>
      ) : rooms.length === 0 ? (
        <div className="rooms-empty">
          <p>No chat rooms yet.</p>
          <Link to="/rooms/create" className="btn btn-primary">Create the first one!</Link>
        </div>
      ) : (
        <div className="rooms-grid">
          {rooms.map((room) => (
            <div key={room._id} className="room-card">
              <div className="room-card-body">
                <h3>{room.name}</h3>
                {room.description && <p className="room-desc">{room.description}</p>}
                <p className="room-meta">
                  {room.members.length} member{room.members.length !== 1 ? "s" : ""} · Created by{" "}
                  {room.createdBy?.username || "unknown"}
                </p>
              </div>
              <div className="room-card-actions">
                {isMember(room) ? (
                  <>
                    <Link to={`/rooms/${room._id}`} className="btn btn-primary btn-sm">
                      Open
                    </Link>
                    <button className="btn btn-danger btn-sm" onClick={() => handleLeave(room._id)}>
                      Leave
                    </button>
                  </>
                ) : (
                  <button className="btn btn-primary btn-sm" onClick={() => handleJoin(room._id)}>
                    Join
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default ChatRoomList;
