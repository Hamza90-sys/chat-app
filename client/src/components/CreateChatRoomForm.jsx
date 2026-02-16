import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const API_URL = "http://localhost:3000/api/rooms";

function CreateChatRoomForm() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ name: "", description: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const token = localStorage.getItem("token");

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await axios.post(API_URL, formData, {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true,
      });
      navigate("/rooms");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create room.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <form className="auth-form" onSubmit={handleSubmit}>
        <h2>Create Room</h2>

        {error && <p className="error-message">{error}</p>}

        <div className="form-group">
          <label htmlFor="name">Room Name</label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="Enter room name"
            required
            minLength={2}
            maxLength={50}
          />
        </div>

        <div className="form-group">
          <label htmlFor="description">Description (optional)</label>
          <input
            type="text"
            id="description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            placeholder="What's this room about?"
            maxLength={200}
          />
        </div>

        <button type="submit" disabled={loading}>
          {loading ? "Creating..." : "Create Room"}
        </button>

        <p className="switch-auth">
          <a href="/rooms" onClick={(e) => { e.preventDefault(); navigate("/rooms"); }}>
            ← Back to rooms
          </a>
        </p>
      </form>
    </div>
  );
}

export default CreateChatRoomForm;
