import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import LoginForm from "./components/LoginForm";
import RegisterForm from "./components/RegisterForm";
import ChatRoomList from "./components/ChatRoomList";
import CreateChatRoomForm from "./components/CreateChatRoomForm";
import ChatRoom from "./components/ChatRoom";
import "./App.css";

function ProtectedRoute({ children }) {
  const user = JSON.parse(localStorage.getItem("user") || "null");
  if (!user) return <Navigate to="/login" />;
  return children;
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/rooms" />} />
        <Route path="/login" element={<LoginForm />} />
        <Route path="/register" element={<RegisterForm />} />
        <Route path="/rooms" element={<ProtectedRoute><ChatRoomList /></ProtectedRoute>} />
        <Route path="/rooms/create" element={<ProtectedRoute><CreateChatRoomForm /></ProtectedRoute>} />
        <Route path="/rooms/:id" element={<ProtectedRoute><ChatRoom /></ProtectedRoute>} />
      </Routes>
    </Router>
  );
}

export default App;
