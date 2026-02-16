import { useState } from "react";

function MessageForm({ onSend, disabled }) {
  const [content, setContent] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = content.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setContent("");
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <form className="message-form" onSubmit={handleSubmit}>
      <input
        type="text"
        className="message-input"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Type a message..."
        maxLength={2000}
        disabled={disabled}
        autoFocus
      />
      <button type="submit" className="btn btn-primary" disabled={disabled || !content.trim()}>
        Send
      </button>
    </form>
  );
}

export default MessageForm;
