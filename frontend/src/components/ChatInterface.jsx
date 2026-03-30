import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2, ArrowLeft } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { motion, AnimatePresence } from 'framer-motion';
import '../styles/ChatInterface.css';

const ChatInterface = ({ messages, onSendMessage, loading, uploadedFiles, onReset }) => {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);

  // Use the actual messages, falling back to a dummy greeting if empty.
  const displayMessages = messages && messages.length > 0 
    ? messages 
    : [{ role: 'assistant', content: 'Neural embeddings verified. I am ready to analyze your documents. Ask me anything!' }];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [displayMessages, loading]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    // Trigger the actual backend call from App.jsx
    if (onSendMessage) {
      onSendMessage(userMessage);
    }
  };

  return (
    <div className="chat-container">
      {/* Premium Floating Header */}
      <div className="chat-header">
        <div className="chat-title-group">
          <Bot size={48} className="header-icon" />
          <div>
            <h3>PDF Chat Assistant</h3>
            <span className="status-indicator">
              <span className="dot online"></span>
              {loading ? 'Processing analysis...' : 'Ready to assist'}
            </span>
          </div>
        </div>

        {/* Integrated sleek reset/back button */}
        {onReset && (
          <div className="header-actions">
            <button className="reset-doc-btn" onClick={onReset} title="Go back and upload a different document">
              <ArrowLeft size={16} />
              Back to Upload
            </button>
          </div>
        )}
      </div>

      <div className="messages-area">
        <AnimatePresence initial={false}>
          {displayMessages.map((msg, index) => (
            <motion.div 
              key={index} 
              className={`message-wrapper ${msg.role}`}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.3, type: "spring", stiffness: 200, damping: 20 }}
            >
              <div className="message-avatar">
                {msg.role === 'user' ? <User size={18} /> : <Bot size={18} className='bot-icon'/>}
              </div>
              <div className="message-content-box">
                <div className="message-bubble">
                  {msg.role === 'assistant' ? (
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  ) : (
                    msg.content
                  )}
                </div>
              </div>
            </motion.div>
          ))}
          
          {loading && (
            <motion.div 
              key="loading-indicator"
              className="message-wrapper assistant"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.3 }}
            >
              <div className="message-avatar"><Bot size={28} /></div>
              <div className="message-content-box">
                <div className="thinking-label">Assistant is thinking...</div>
                <div className="message-bubble typing-indicator">
                  <span></span><span></span><span></span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      {/* Floating Pill Input Toolbar */}
      <div className="chat-input-area">
        <form onSubmit={handleSend} className="input-pill">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question about your documents..."
            disabled={loading}
          />
          <button 
            type="submit" 
            disabled={!input.trim() || loading}
            className={`send-btn ${input.trim() && !loading ? 'active' : ''}`}
          >
            {loading ? <Loader2 size={18} className="spin" /> : <Send size={18} style={{marginLeft: "2px"}} />}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatInterface;
