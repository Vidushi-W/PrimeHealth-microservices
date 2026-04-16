import { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5003';

export default function ChatWindow({ sessionId, authToken, userId }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const messagesEndRef = useRef(null);

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 7000);
    return () => {
      clearInterval(interval);
    };
  }, [sessionId, authToken]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchMessages = async () => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/telemedicine/chat/${sessionId}/messages`,
        { headers: { Authorization: `Bearer ${authToken}` } }
      );
      setMessages(response?.data?.data || []);
      setError('');
    } catch (err) {
      setError('Failed to load messages: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const message = input.trim();
    setInput('');

    try {
      const response = await axios.post(
        `${API_BASE_URL}/telemedicine/chat/${sessionId}/messages`,
        { content: message },
        { headers: { Authorization: `Bearer ${authToken}` } }
      );
      const created = response?.data?.data;
      if (created) {
        setMessages((prev) => [...prev, created]);
      }
    } catch (err) {
      setError('Failed to send message: ' + (err.response?.data?.message || err.message));
      setInput(message); // Restore input on error
    }
  };

  if (loading) {
    return <div className="loading">Loading chat...</div>;
  }

  return (
    <div className="chat-container">
      {error && <div className="error-message" style={{ margin: '1rem' }}>{error}</div>}

      <div className="messages-list">
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem' }}>
            No messages yet. Start the conversation!
          </div>
        )}

        {messages.map((msg, idx) => (
          <div 
            key={msg.id || idx} 
            className={`message ${msg.senderId === userId ? 'own' : ''}`}
          >
            <div className="message-bubble">
              <p>{msg.content}</p>
              <div className="message-time">
                {new Date(msg.sentAt || msg.createdAt).toLocaleTimeString()}
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <form className="chat-input-area" onSubmit={handleSendMessage}>
        <input
          type="text"
          className="chat-input"
          placeholder="Type your message..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={loading}
        />
        <button 
          type="submit" 
          className="chat-send-btn"
          disabled={!input.trim() || loading}
        >
          Send
        </button>
      </form>
    </div>
  );
}
